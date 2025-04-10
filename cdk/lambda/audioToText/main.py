import os
import json
import time
import random
import logging
import boto3
import urllib.request

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Create clients for Transcribe, S3, and SQS using boto3.
transcribe = boto3.client("transcribe", region_name=os.environ.get("AWS_REGION"))
s3 = boto3.client("s3", region_name=os.environ.get("AWS_REGION"))
sqs = boto3.client("sqs", region_name=os.environ.get("AWS_REGION"))

# Environment variables for bucket names and output queue.
AUDIO_BUCKET = os.environ.get("AUDIO_BUCKET")
OUTPUT_SQS_QUEUE_URL = os.environ.get("OUTPUT_SQS_QUEUE_URL")

def lambda_handler(event, context):
    """
    This function:
      1. Reads an SQS message that contains a JSON payload with:
           - filePath: the location of the audio file (relative to AUDIO_BUCKET)
           - sessionId (or case_id): identifier for the case
           - (optionally) fileExtension: audio file extension (e.g., "mp3")
      2. Starts an Amazon Transcribe job for that file.
      3. Polls until the job completes.
      4. Retrieves the transcription result from the TranscriptFileUri URL.
      5. Sends an SQS message (to OUTPUT_SQS_QUEUE_URL) that includes the case_id and the transcribed text.
    """
    for record in event.get("Records", []):
        try:
            # Parse the SQS message body.
            body = json.loads(record["body"])
            file_path = body.get("filePath")
            # You can use 'sessionId' or 'case_id'—here we support either.
            case_id = body.get("caseId")
            file_extension = body.get("fileExtension", "mp3").lower()
            
            if not file_path:
                logger.error("No filePath provided in message: %s", body)
                continue
            if not case_id:
                logger.error("No case_id/sessionId provided in message: %s", body)
                continue

            # Build the S3 URI of the audio file.
            media_file_uri = f"s3://{AUDIO_BUCKET}/{file_path}"
            logger.info("Media file URI: %s", media_file_uri)
            
            # Create a unique transcription job name that embeds the case_id.
            job_name = f"transcription-{case_id}-{int(time.time())}-{random.randint(1000, 9999)}"
            
            # Start the Transcribe job without specifying OutputBucketName
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
                    # Get the URI where the transcript is stored (in Transcribe's default location)
                    transcript_uri = response["TranscriptionJob"]["Transcript"]["TranscriptFileUri"]
                elif status == "FAILED":
                    logger.error("Transcription job failed: %s", response)
                    break
                else:
                    # Wait for a few seconds before polling again.
                    time.sleep(5)
            
            if not job_complete or not transcript_uri:
                logger.error("Job did not complete successfully for job: %s. Skipping output SQS.", job_name)
                continue
            
            # Download the transcript JSON from the provided URI
            with urllib.request.urlopen(transcript_uri) as response:
                transcript_content = response.read().decode("utf-8")
            
            transcript_data = json.loads(transcript_content)
            # Extract the transcript text (from the first transcript result).
            transcript_text = transcript_data.get("results", {}) \
                                .get("transcripts", [{}])[0].get("transcript", "")
            
            # Build the output SQS message payload.
            output_payload = {
                "case_id": case_id,
                "transcript": transcript_text
            }
            # Send the message to the output SQS queue.
            send_resp = sqs.send_message(
            QueueUrl=OUTPUT_SQS_QUEUE_URL,
            MessageBody=json.dumps(output_payload),
            MessageGroupId=case_id,  # Using case_id as the MessageGroupId
            MessageDeduplicationId=f"{case_id}-{int(time.time())}"  # Creating a unique deduplication ID
        )
            logger.info("Sent output SQS message: %s", json.dumps(send_resp))
            
        except Exception as e:
            logger.error("Error processing record %s: %s", record, e, exc_info=True)
    
    return {
        "statusCode": 200,
        "body": json.dumps({"message": "Processing complete"})
    }