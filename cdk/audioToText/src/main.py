import os
import json
import time
import random
import logging
import boto3
import psycopg2
import urllib.request
import httpx
import json
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Create clients for Transcribe and S3 using boto3.
transcribe = boto3.client("transcribe", region_name=os.environ.get("AWS_REGION"))
s3 = boto3.client("s3", region_name=os.environ.get("AWS_REGION"))

# Environment variable for bucket name
DB_SECRET_NAME = os.environ["SM_DB_CREDENTIALS"]
REGION = os.environ["REGION"]
RDS_PROXY_ENDPOINT = os.environ["RDS_PROXY_ENDPOINT"]
AUDIO_BUCKET = os.environ.get("AUDIO_BUCKET")
APPSYNC_API_URL = os.environ.get("APPSYNC_API_URL")
secrets_manager_client = boto3.client("secretsmanager")
ssm_client = boto3.client("ssm", region_name=REGION)
# Cached resources
connection = None
db_secret = None


def invoke_event_notification(case_id, message, cognito_token):
    """
    Publish a notification event to AppSync via HTTPX using Cognito authentication.
    Expects a valid Cognito JWT token (from the student user pool) to be passed in.
    """
    try:
        query = """
        mutation sendNotification($message: String!, $caseId: String!) {
            sendNotification(message: $message, caseId: $caseId) {
                message
                caseId
            }
        }
        """
        # Use the provided Cognito token in the Authorization header.
        # Depending on your AppSync configuration, you may need to prefix with "Bearer ".
        headers = {
            "Content-Type": "application/json",
            "Authorization": cognito_token  # or "Bearer " + cognito_token if required
        }

        payload = {
            "query": query,
            "variables": {
                "message": message,
                "caseId": case_id
            }
        }
        print("case_id inside sendNotification:", case_id)
        print("payload:", payload)
        # Send the request to AppSync
        with httpx.Client() as client:
            response = client.post(APPSYNC_API_URL, headers=headers, json=payload)
            response_data = response.json()

            logging.info(f"AppSync Response: {json.dumps(response_data, indent=2)}")
            if response.status_code != 200 or "errors" in response_data:
                raise Exception(f"Failed to send notification: {response_data}")

            print(f"Notification sent successfully: {response_data}")
            return response_data["data"]["sendNotification"]

    except Exception as e:
        logging.error(f"Error publishing event to AppSync: {str(e)}")
        raise

def get_secret(secret_name, expect_json=True):
    global db_secret
    if db_secret is None:
        try:
            response = secrets_manager_client.get_secret_value(SecretId=secret_name)["SecretString"]
            db_secret = json.loads(response) if expect_json else response
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode JSON for secret {secret_name}: {e}")
            raise ValueError(f"Secret {secret_name} is not properly formatted as JSON.")
        except Exception as e:
            logger.error(f"Error fetching secret {secret_name}: {e}")
            raise
    return db_secret


def get_parameter(param_name, cached_var):
    """
    Fetch a parameter value from Systems Manager Parameter Store.
    """
    if cached_var is None:
        try:
            response = ssm_client.get_parameter(Name=param_name, WithDecryption=True)
            cached_var = response["Parameter"]["Value"]
        except Exception as e:
            logger.error(f"Error fetching parameter {param_name}: {e}")
            raise
    return cached_var


def connect_to_db():
    global connection
    if connection is None or connection.closed:
        try:
            secret = get_secret(DB_SECRET_NAME)
            connection_params = {
                'dbname': secret["dbname"],
                'user': secret["username"],
                'password': secret["password"],
                'host': RDS_PROXY_ENDPOINT,
                'port': secret["port"]
            }
            connection_string = " ".join([f"{key}={value}" for key, value in connection_params.items()])
            connection = psycopg2.connect(connection_string)
            logger.info("Connected to the database!")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            if connection:
                connection.rollback()
                connection.close()
            raise
    return connection

def add_audio_to_db(case_id, audio_text):
    connection = connect_to_db()
    if connection is None:
        logger.error("No database connection available.")
        return {
            "statusCode": 500,
            "body": json.dumps("Database connection failed.")
        }
    
    try:
        cur = connection.cursor()
        logger.info("Connected to RDS instance!")
        cur.execute("""
            INSERT INTO "cases" (case_id, case_description)
            VALUES (%s, %s);
        """, (case_id, audio_text))
        connection.commit()
        cur.close()
        logger.info(f"Successfully added audio to the database for case_id {case_id}")
        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": "Audio added to the database successfully."
            })
        }
    except Exception as e:
        logger.error(f"Error adding audio to the database: {e}")
        if cur:
            cur.close()
        connection.rollback()
        return {
            "statusCode": 500,
            "body": json.dumps({
                "error": "Failed to add audio to the database"
            })
        }
# CORS headers

def get_cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",  # For production, restrict to specific origins
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "OPTIONS,GET",
        "Access-Control-Allow-Credentials": "true"
    }

def handler(event, context):
    """
    This function:
      1. Receives parameters from querystring:
           - file_name: the name of the audio file
           - case_id: identifier for the case
           - file_type: audio file extension (e.g., "mp3")
      2. Starts an Amazon Transcribe job for that file.
      3. Polls until the job completes.
      4. Retrieves the transcription result from the TranscriptFileUri URL.
      5. Returns the transcription results in the API response.
    """
    # Handle preflight OPTIONS request
    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": get_cors_headers(),
            "body": ""
        }
        
    try:
        # Extract query parameters instead of body
        query_params = event.get("queryStringParameters", {})
        if query_params is None:
            query_params = {}
            
        file_name = query_params.get("file_name")
        case_id = query_params.get("case_id")
        file_type = query_params.get("file_type", "mp3").lower()
        cognito_token = query_params.get("cognito_token")
        # Log the received parameters
        logger.info(f"Received parameters: file_name={file_name}, case_id={case_id}, file_type={file_type}")
        
        if not file_name:
            logger.error("No file_name provided in request")
            return {
                "statusCode": 400,
                "headers": get_cors_headers(),
                "body": json.dumps({"error": "No file_name provided"})
            }
        if not case_id:
            logger.error("No case_id provided in request")
            return {
                "statusCode": 400,
                "headers": get_cors_headers(),
                "body": json.dumps({"error": "No case_id provided"})
            }

        # Build the S3 URI of the audio file.
        media_file_uri = f"s3://{AUDIO_BUCKET}/{case_id}/{file_name}.{file_type}"
        logger.info("Media file URI: %s", media_file_uri)
        
        # Create a unique transcription job name that embeds the case_id.
        job_name = f"transcription-{case_id}-{int(time.time())}-{random.randint(1000, 9999)}"
        
        # Start the Transcribe job
        transcribe.start_transcription_job(
            TranscriptionJobName=job_name,
            Media={"MediaFileUri": media_file_uri},
            MediaFormat=file_type,
            LanguageCode="en-US"  # Adjust if needed.
        )
        logger.info("Started transcription job: %s", job_name)
        
        # Poll until the transcription job completes.
        job_complete = False
        transcript_uri = None
        while not job_complete:
            response = transcribe.get_transcription_job(TranscriptionJobName=job_name)
            status = response["TranscriptionJob"]["TranscriptionJobStatus"]
            logger.info("Transcription job status: %s", status)
            if status == "COMPLETED":
                job_complete = True
                # Get the URI where the transcript is stored
                transcript_uri = response["TranscriptionJob"]["Transcript"]["TranscriptFileUri"]
            elif status == "FAILED":
                logger.error("Transcription job failed: %s", response)
                return {
                    "statusCode": 500,
                    "headers": get_cors_headers(),
                    "body": json.dumps({"error": "Transcription job failed"})
                }
            else:
                # Wait for a few seconds before polling again.
                time.sleep(5)
        
        if not transcript_uri:
            logger.error("No transcript URI found for job: %s", job_name)
            return {
                "statusCode": 500,
                "headers": get_cors_headers(),
                "body": json.dumps({"error": "No transcript URI found"})
            }
        
        # Download the transcript JSON from the provided URI
        with urllib.request.urlopen(transcript_uri) as response:
            transcript_content = response.read().decode("utf-8")
        
        transcript_data = json.loads(transcript_content)
        # Extract the transcript text (from the first transcript result).
        transcript_text = transcript_data.get("results", {}) \
                          .get("transcripts", [{}])[0].get("transcript", "")
        
        add_audio_to_db(case_id, transcript_text)
        print("case_id:", case_id)
        invoke_event_notification(case_id, "transcription_complete", cognito_token)
        # Return the transcription result in the API response
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                **get_cors_headers()
            },
            "body": json.dumps({
                "text": transcript_text,  # Changed to match API schema
                "caseId": case_id,
                "jobName": job_name
            })
        }
        
    except Exception as e:
        logger.error("Error processing request: %s", e, exc_info=True)
        return {
            "statusCode": 500,
            "headers": get_cors_headers(),
            "body": json.dumps({"error": f"Error processing request: {str(e)}"})
        }