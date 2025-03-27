import os
import json
import boto3
import logging
import hashlib
import uuid
from datetime import datetime

import boto3
from botocore.exceptions import ClientError
from langchain_aws import ChatBedrockConverse
from langchain_core.prompts import ChatPromptTemplate

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)



def handler(event, context):
    """
    Lambda function handler for generating conversation summaries.
    
    Expected event structure:
    {
        "session_id": "unique_session_id",
        "dynamodb_table": "chat_history_table_name",
        "case_type": "optional_case_type",
        "case_description": "optional_case_description",
        "jurisdiction": "optional_jurisdiction"
    }
    """
    try:
        # Extract parameters
        session_id = event.get('session_id')
        dynamodb_table = event.get('dynamodb_table', os.environ.get('DYNAMODB_HISTORY_TABLE'))
        case_type = event.get('case_type')
        case_description = event.get('case_description')
        jurisdiction = event.get('jurisdiction')
        
        if not session_id or not dynamodb_table:
            raise ValueError("Missing session_id or dynamodb_table")
        
        # Initialize LLM
        llm = get_bedrock_llm()
        
        # Retrieve conversation history
        conversation_history = retrieve_dynamodb_history(dynamodb_table, session_id)
        
        # Generate lawyer summary
        lawyer_summary = generate_lawyer_summary(
            conversation_history, 
            llm, 
            case_type, 
            case_description, 
            jurisdiction
        )
        
        # Prepare response
        return {
            'statusCode': 200,
            'body': json.dumps({
                'session_id': session_id,
                'summary': lawyer_summary,
                'case_type': case_type,
                'case_description': case_description,
                'jurisdiction': jurisdiction
            })
        }
    
    except Exception as e:
        logger.error(f"Error in conversation summary generation: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e),
                'session_id': session_id
            })
        }