import json
import os
import boto3


def lambda_handler(event, context):

    

    try:
        # Extract arguments from the AppSync payload
        arguments = event.get("arguments", {})
        case_id = arguments.get("caseId", "DefaultcaseId")
        message = arguments.get("message", "Default message")

        # Log the extracted values for debugging
        

        # Return the values back to AppSync
        return {
            "caseId": case_id,
            "message": message
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            "error": str(e)
        }

    