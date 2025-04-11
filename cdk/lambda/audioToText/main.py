import os
import json
import time
import random
import logging
import boto3
import urllib.request

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Create clients for Transcribe and S3 using boto3.
transcribe = boto3.client("transcribe", region_name=os.environ.get("AWS_REGION"))
s3 = boto3.client("s3", region_name=os.environ.get("AWS_REGION"))

# Environment variable for bucket name
AUDIO_BUCKET = os.environ.get("AUDIO_BUCKET")

# CORS headers
def get_cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",  # For production, restrict to specific origins
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
        "Access-Control-Allow-Credentials": "true"
    }

def lambda_handler(event, context):
    """
    This function:
      1. Receives an API request with JSON body containing:
           - filePath: the location of the audio file (relative to AUDIO_BUCKET)
           - caseId: identifier for the case
           - (optionally) fileExtension: audio file extension (e.g., "mp3")
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
        # Parse the API request body
        body = json.loads(event.get("body", "{}"))
        file_path = body.get("filePath")
        case_id = body.get("caseId")
        file_extension = body.get("fileExtension", "mp3").lower()
        
        if not file_path:
            logger.error("No filePath provided in request: %s", body)
            return {
                "statusCode": 400,
                "headers": get_cors_headers(),
                "body": json.dumps({"error": "No filePath provided"})
            }
        if not case_id:
            logger.error("No caseId provided in request: %s", body)
            return {
                "statusCode": 400,
                "headers": get_cors_headers(),
                "body": json.dumps({"error": "No caseId provided"})
            }

        # Build the S3 URI of the audio file.
        media_file_uri = f"s3://{AUDIO_BUCKET}/{file_path}"
        logger.info("Media file URI: %s", media_file_uri)
        
        # Create a unique transcription job name that embeds the case_id.
        job_name = f"transcription-{case_id}-{int(time.time())}-{random.randint(1000, 9999)}"
        
        # Start the Transcribe job
        transcribe.start_transcription_job(
            TranscriptionJobName=job_name,
            Media={"MediaFileUri": media_file_uri},
            MediaFormat=file_extension,
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
        
        # Return the transcription result in the API response
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                **get_cors_headers()
            },
            "body": json.dumps({
                "caseId": case_id,
                "transcriptText": transcript_text,
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