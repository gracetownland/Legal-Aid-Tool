import os
import json
import time
import random
import logging
import boto3
import psycopg2
import urllib.request
import httpx

# Set up logging for the Lambda function
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS service clients using environment configuration
transcribe = boto3.client("transcribe", region_name=os.environ.get("AWS_REGION"))
s3 = boto3.client("s3", region_name=os.environ.get("AWS_REGION"))

# Environment variables (must be set in Lambda configuration)
DB_SECRET_NAME = os.environ["SM_DB_CREDENTIALS"]    # Secrets Manager secret for RDS credentials
REGION = os.environ["REGION"]                     # AWS region for SSM and other services
RDS_PROXY_ENDPOINT = os.environ["RDS_PROXY_ENDPOINT"]  # RDS Proxy endpoint
AUDIO_BUCKET = os.environ.get("AUDIO_BUCKET")         # S3 bucket where audio files are stored
APPSYNC_API_URL = os.environ.get("APPSYNC_API_URL")   # AppSync GraphQL endpoint

# AWS clients for Secrets Manager and Parameter Store
secrets_manager_client = boto3.client("secretsmanager")
ssm_client = boto3.client("ssm", region_name=REGION)

# Cached database connection and secret to reuse across Lambda invocations
connection = None
db_secret = None


def invoke_event_notification(case_id, message, cognito_token):
    """
    Send a GraphQL mutation to AppSync to notify clients of an event.
    Requires a valid Cognito JWT token for authentication.
    """
    try:
        # Define the GraphQL mutation
        query = """
        mutation sendNotification($message: String!, $caseId: String!) {
            sendNotification(message: $message, caseId: $caseId) {
                message
                caseId
            }
        }
        """

        # Set HTTP headers including the Cognito token
        headers = {
            "Content-Type": "application/json",
            "Authorization": cognito_token  # Prefix with "Bearer " if your AppSync setup requires it
        }

        # Construct the payload
        payload = {
            "query": query,
            "variables": {"message": message, "caseId": case_id}
        }

        # Log payload for debugging
        logger.info(f"Sending notification payload: {payload}")

        # Perform the HTTP request
        with httpx.Client() as client:
            response = client.post(APPSYNC_API_URL, headers=headers, json=payload)
            response_data = response.json()

        # Log AppSync response details
        logger.info(f"AppSync Response: {json.dumps(response_data, indent=2)}")

        # Check for errors in the response
        if response.status_code != 200 or "errors" in response_data:
            raise Exception(f"Failed to send notification: {response_data}")

        return response_data["data"]["sendNotification"]

    except Exception as e:
        logger.error(f"Error publishing event to AppSync: {e}")
        raise


def get_secret(secret_name, expect_json=True):
    """
    Retrieve a secret from AWS Secrets Manager, parse JSON if requested, and cache the result.
    """
    global db_secret
    if db_secret is None:
        try:
            raw = secrets_manager_client.get_secret_value(SecretId=secret_name)["SecretString"]
            db_secret = json.loads(raw) if expect_json else raw
        except json.JSONDecodeError as e:
            msg = f"Secret {secret_name} is not valid JSON: {e}"
            logger.error(msg)
            raise ValueError(msg)
        except Exception as e:
            logger.error(f"Error fetching secret {secret_name}: {e}")
            raise
    return db_secret


def get_parameter(param_name, cached_var):
    """
    Retrieve a parameter from AWS Systems Manager Parameter Store and cache the result.
    """
    if cached_var is None:
        try:
            resp = ssm_client.get_parameter(Name=param_name, WithDecryption=True)
            cached_var = resp["Parameter"]["Value"]
        except Exception as e:
            logger.error(f"Error fetching parameter {param_name}: {e}")
            raise
    return cached_var


def connect_to_db():
    """
    Establish (or reuse) a connection to the RDS database via the Proxy.
    Uses credentials stored in Secrets Manager.
    """
    global connection
    if connection is None or connection.closed:
        secret = get_secret(DB_SECRET_NAME)
        params = {
            'dbname': secret['dbname'],
            'user': secret['username'],
            'password': secret['password'],
            'host': RDS_PROXY_ENDPOINT,
            'port': secret['port']
        }
        # Build connection string for psycopg2
        conn_str = " ".join(f"{k}={v}" for k, v in params.items())
        try:
            connection = psycopg2.connect(conn_str)
            logger.info("Connected to the database.")
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            if connection:
                connection.rollback()
                connection.close()
            raise
    return connection


def add_audio_to_db(case_id, audio_text):
    """
    Insert the transcribed text into the "cases" table for the given case_id.
    """
    conn = connect_to_db()
    try:
        cur = conn.cursor()
        sql = 'INSERT INTO "cases" (case_id, case_description) VALUES (%s, %s);'
        cur.execute(sql, (case_id, audio_text))
        conn.commit()
        cur.close()
        logger.info(f"Audio text stored for case_id: {case_id}")
        return {"statusCode": 200, "body": json.dumps({"message": "Stored successfully"})}
    except Exception as e:
        logger.error(f"DB insert error for case_id {case_id}: {e}")
        if cur:
            cur.close()
        conn.rollback()
        return {"statusCode": 500, "body": json.dumps({"error": "DB insert failed"})}


def get_cors_headers():
    """Return standard CORS headers for API responses."""
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "OPTIONS,GET",
        "Access-Control-Allow-Credentials": "true"
    }


def handler(event, context):
    """
    AWS Lambda handler:
      1. Handle CORS preflight (OPTIONS).
      2. Extract parameters from query string.
      3. Start a Transcribe job and poll for completion.
      4. Fetch and parse transcript JSON.
      5. Store transcript in RDS and notify via AppSync.
    """
    # 1. Preflight
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": get_cors_headers(), "body": ""}

    try:
        # 2. Extract query parameters
        qs = event.get("queryStringParameters") or {}
        file_name = qs.get("file_name")
        case_id = qs.get("case_id")
        file_type = qs.get("file_type", "mp3").lower()
        cognito_token = qs.get("cognito_token")

        # Validate required parameters
        if not file_name or not case_id:
            missing = [k for k in ("file_name", "case_id") if not qs.get(k)]
            logger.error(f"Missing params: {missing}")
            return {"statusCode": 400, "headers": get_cors_headers(),
                    "body": json.dumps({"error": f"Missing parameters: {missing}"})}

        # Construct S3 file URI
        media_file_uri = f"s3://{AUDIO_BUCKET}/{case_id}/{file_name}.{file_type}"
        logger.info(f"Starting transcription for: {media_file_uri}")

        # 3. Start Transcription job
        job_name = f"transcription-{case_id}-{int(time.time())}-{random.randint(1000, 9999)}"
        transcribe.start_transcription_job(
            TranscriptionJobName=job_name,
            Media={"MediaFileUri": media_file_uri},
            MediaFormat=file_type,
            LanguageCode="en-US"
        )

        # Poll for job completion
        transcript_uri = None
        while True:
            resp = transcribe.get_transcription_job(TranscriptionJobName=job_name)
            status = resp["TranscriptionJob"]["TranscriptionJobStatus"]
            if status == "COMPLETED":
                transcript_uri = resp["TranscriptionJob"]["Transcript"]["TranscriptFileUri"]
                break
            if status == "FAILED":
                raise Exception("Transcription job failed")
            time.sleep(5)

        # 4. Download and parse transcript
        with urllib.request.urlopen(transcript_uri) as r:
            data = json.loads(r.read().decode())
        transcript_text = data.get("results", {}).get("transcripts", [{}])[0].get("transcript", "")
        
        # 5. Store transcript and notify clients
add_audio_to_db(case_id, transcript_text)

lambda_client = boto3.client("lambda")
lambda_response = lambda_client.invoke(
    FunctionName="LATstaging-Api-NotificationFunction",  # Update this if the name differs
    InvocationType="RequestResponse",
    Payload=json.dumps({
        "caseId": case_id,
        "message": "transcription_complete"
    }).encode("utf-8"),
)

logger.info("Notification Lambda invoked")
logger.info(lambda_response)


        # Return successful response
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json", **get_cors_headers()},
            "body": json.dumps({"text": transcript_text, "caseId": case_id, "jobName": job_name})
        }

    except Exception as e:
        logger.error("Handler error: %s", e, exc_info=True)
        return {"statusCode": 500, "headers": get_cors_headers(),
                "body": json.dumps({"error": str(e)})}
