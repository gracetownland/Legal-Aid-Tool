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

# AWS Clients
dynamodb = boto3.client('dynamodb')
bedrock_runtime = boto3.client('bedrock-runtime')

def get_bedrock_llm(
    bedrock_llm_id: str , 
    temperature: float = 0.3
) -> ChatBedrockConverse:
    """
    Initialize a Bedrock LLM with specified parameters.
    
    Args:
        bedrock_llm_id (str): The model ID for the Bedrock LLM.
        temperature (float): Controls the randomness of the output.
    
    Returns:
        ChatBedrockConverse: Configured Bedrock LLM instance.
    """
    return ChatBedrockConverse(
        model=bedrock_llm_id,
        temperature=temperature,
        max_tokens=4000
    )

def retrieve_dynamodb_history(table_name: str, session_id: str) -> list:
    """
    Retrieve conversation history from DynamoDB for a specific session.
    
    Args:
        table_name (str): Name of the DynamoDB table storing chat history.
        session_id (str): Unique identifier for the conversation session.
    
    Returns:
        list: List of message dictionaries from the conversation history.
    """
    try:
        response = dynamodb.query(
            TableName=table_name,
            KeyConditionExpression='SessionId = :sid',
            ExpressionAttributeValues={
                ':sid': {'S': session_id}
            }
        )
        
        # Extract and sort messages by timestamp
        messages = response.get('Items', [])
        sorted_messages = sorted(
            messages, 
            key=lambda x: x.get('Timestamp', {}).get('N', '0')
        )
        
        # Convert DynamoDB format to readable format
        readable_messages = []
        for msg in sorted_messages:
            readable_messages.append({
                'role': msg.get('Role', {}).get('S', ''),
                'content': msg.get('Message', {}).get('S', ''),
                'timestamp': datetime.fromtimestamp(
                    int(msg.get('Timestamp', {}).get('N', '0'))
                ).strftime('%Y-%m-%d %H:%M:%S')
            })
        
        return readable_messages
    
    except ClientError as e:
        logger.error(f"Error retrieving conversation history: {e}")
        raise

def generate_lawyer_summary(
    messages: list, 
    llm: ChatBedrockConverse, 
    case_type: str = None, 
    case_description: str = None, 
    jurisdiction: str = None
) -> str:
    """
    Generate a concise, professional summary of the conversation for lawyers.
    
    Args:
        messages (list): List of conversation messages.
        llm (ChatBedrockConverse): Bedrock LLM for generating summary.
        case_type (str, optional): Type of legal case.
        case_description (str, optional): Brief description of the case.
        jurisdiction (str, optional): Legal jurisdiction for the case.
    
    Returns:
        str: Formatted lawyer-friendly summary.
    """
    # Construct conversation text
    conversation_text = "\n".join([
        f"{msg['timestamp']} - {msg['role'].upper()}: {msg['content']}"
        for msg in messages
    ])
    
    # Create a prompt for summarization
    summary_prompt = ChatPromptTemplate.from_messages([
        ("system", """
        You are a professional legal summarization assistant. 
        Create a concise, objective 1-page summary of the conversation focusing on:
        1. Case Context
        2. Key facts and timeline of events
        3. Parties involved
        4. Critical details and potential legal implications
        5. Any actionable items or recommendations
        
        Use a clear, professional tone. Organize the summary with clear headings.
        Avoid personal opinions and stick to the observable facts.
        
        Case Metadata:
        - Case Type: {case_type}
        - Case Description: {case_description}
        - Jurisdiction: {jurisdiction}
        """),
        ("human", "Here is the conversation to summarize:\n{conversation}")
    ])
    
    # Generate summary
    summary_chain = summary_prompt | llm
    summary = summary_chain.invoke({
        "conversation": conversation_text,
        "case_type": case_type or "Not Specified",
        "case_description": case_description or "No additional description provided",
        "jurisdiction": jurisdiction or "Not Specified"
    }).content
    
    return summary

