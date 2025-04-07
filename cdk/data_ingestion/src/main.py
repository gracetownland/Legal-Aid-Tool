import os
import json
import boto3
import logging
import hashlib
import uuid
import time
import psycopg2
from botocore.exceptions import ClientError

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment variables (assumed to be set in your environment)
DB_SECRET_NAME = os.environ["SM_DB_CREDENTIALS"]
REGION = os.environ["REGION"]
RDS_PROXY_ENDPOINT = os.environ["RDS_PROXY_ENDPOINT"]

# AWS Clients
secrets_manager_client = boto3.client("secretsmanager")
ssm_client = boto3.client("ssm", region_name=REGION)
bedrock_runtime = boto3.client("bedrock-runtime", region_name=REGION)

# Cached resources
connection = None

##########################################
# Utility Functions for Secrets & DB
##########################################

def get_secret(secret_name, expect_json=True):
    global connection
    try:
        response = secrets_manager_client.get_secret_value(SecretId=secret_name)["SecretString"]
        secret = json.loads(response) if expect_json else response
    except Exception as e:
        logger.error(f"Error fetching secret {secret_name}: {e}")
        raise
    return secret

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

def hash_uuid(uuid_str: str) -> int:
    """
    Generate a 4-digit numeric hash from a UUID string.
    
    Steps:
      1. Compute the SHA-256 hash of the input string.
      2. Extract the first 8 hexadecimal characters.
      3. Convert them to an integer.
      4. Return the result modulo 10000 to ensure a 4-digit number.
    """
    hash_hex = hashlib.sha256(uuid_str.encode('utf-8')).hexdigest()
    numeric_hash = int(hash_hex[:8], 16)
    return numeric_hash % 10000


##########################################
# Guardrail Setup Function
##########################################

def setup_guardrail(guardrail_name: str) -> tuple[str, str]:
    """
    Ensure a guardrail with a given name is created and published if it doesn't exist.
    Returns a tuple (guardrail_id, guardrail_version).
    """
    bedrock_client = boto3.client("bedrock", region_name=REGION)
    guardrail_id = None
    guardrail_version = None
    guardrail_name_exists = False

    paginator = bedrock_client.get_paginator('list_guardrails')
    for page in paginator.paginate():
        for guardrail in page.get('guardrails', []):
            if guardrail['name'] == guardrail_name:
                logger.info(f"Found guardrail: {guardrail_name}")
                guardrail_id = guardrail['id']
                guardrail_version = guardrail.get('version')
                guardrail_name_exists = True
                break
        if guardrail_name_exists:
            break

    if not guardrail_name_exists:
        logger.info(f"Creating new guardrail: {guardrail_name}")
        response = bedrock_client.create_guardrail(
            name=guardrail_name,
            description='Block financial advice, offensive content, and PII',
            topicPolicyConfig={
                'topicsConfig': [
                    {
                        'name': 'FinancialAdvice',
                        'definition': 'Providing personalized advice on managing financial assets or investments.',
                        'examples': [
                            'Which mutual fund should I invest in for retirement?',
                            'Can you advise on the best way to reduce my debt?'
                        ],
                        'type': 'DENY'
                    },
                    {
                        'name': 'OffensiveContent',
                        'definition': 'Content that includes hate speech, discriminatory remarks, or explicit material.',
                        'examples': [
                            'Tell me a joke about [a specific race or religion].',
                            'Share an offensive meme targeting [a specific group].'
                        ],
                        'type': 'DENY'
                    },
                    {
                        'name': 'Profanity',
                        'definition': 'Use of profane or obscene words or phrases.',
                        'examples': [
                            'fuck',
                            'shit',
                            'f*** off',
                            'go f**k yourself'
                        ],
                        'type': 'DENY'
                    }
                ]
            },
            sensitiveInformationPolicyConfig={
                'piiEntitiesConfig': [
                    {'type': 'EMAIL', 'action': 'BLOCK'},
                    {'type': 'PHONE', 'action': 'BLOCK'},
                    {'type': 'NAME', 'action': 'BLOCK'}
                ]
            },
            blockedInputMessaging='Sorry, I cannot respond to that.',
            blockedOutputsMessaging='Sorry, I cannot respond to that.'
        )

        logger.info("Waiting 5 seconds for guardrail status to become READY...")
        time.sleep(5)
        guardrail_id = response['guardrailId']
        logger.info(f"Guardrail ID: {guardrail_id}")

        version_response = bedrock_client.create_guardrail_version(
            guardrailIdentifier=guardrail_id,
            description='Published version',
            clientRequestToken=str(uuid.uuid4())
        )
        guardrail_version = version_response['version']
        logger.info(f"Guardrail Version: {guardrail_version}")

    return guardrail_id, guardrail_version

##########################################
# New Case Handler Function
##########################################

def handler(event, context) -> dict:
    """
    Processes a POST /student/new_case event:
      - Validates user input with Bedrock guardrails.
      - Retrieves the user from the DB using cognito_id.
      - Inserts a new case and generates a SHA-256 hash for the case ID.
      - Returns a JSON response with case_id and case_hash.
      
    Args:
        event (dict): The incoming event containing query parameters and JSON body.
    
    Returns:
        dict: A response dictionary with statusCode and a JSON-formatted body.
    """
    conn = None
    try:
        logger.info("Received event: %s", json.dumps(event, indent=2))
        
        # Extract the user id from query parameters
        cognito_id = event.get("queryStringParameters", {}).get("user_id")
        if not cognito_id:
            return {
                'statusCode': 400,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                },
                "body": json.dumps({"error": "Missing user_id in query parameters"})
            }
        
        # Parse the JSON body
        body = json.loads(event.get("body", "{}"))
        case_title = body.get("case_title")
        case_type = body.get("case_type")
        jurisdiction = body.get("jurisdiction")
        case_description = body.get("case_description")
        
        # Combine the inputs for guardrail validation
        user_input = f"{case_title} {case_type} {jurisdiction} {case_description}"
        
        # Setup or retrieve guardrail
        guardrail_id, guardrail_version = setup_guardrail('comprehensive-guardrails')
        
        # Apply guardrail check using the Bedrock runtime client
        guard_response = bedrock_runtime.apply_guardrail(
            guardrailIdentifier=guardrail_id,
            guardrailVersion=guardrail_version,
            source="INPUT",
            content=[{"text": {"text": user_input, "qualifiers": ["guard_content"]}}]
        )
        
        # Check if guardrail intervention occurred
        if guard_response.get("action") == "GUARDRAIL_INTERVENED":
            error_message = None
            # Add debug logging to see the full guardrail response
            logger.info(f"Guardrail response: {json.dumps(guard_response)}")
            
            for assessment in guard_response.get("assessments", []):
                # Topic policy checks
                if "topicPolicy" in assessment:
                    for topic in assessment["topicPolicy"].get("topics", []):
                        if topic.get("name") == "FinancialAdvice" and topic.get("action") == "BLOCKED":
                            error_message = ("Sorry, I cannot process your case because it contains financial content. "
                                            "Kindly remove the relevant content and try again.")
                            break
                        elif topic.get("name") == "OffensiveContent" and topic.get("action") == "BLOCKED":
                            error_message = ("Sorry, I cannot process your case because it contains offensive content. "
                                            "Kindly remove the relevant content and try again.")
                            break
                        elif topic.get("name") == "Profanity" and topic.get("action") == "BLOCKED":
                            error_message = ("Sorry, I cannot process your case because it contains profanity. "
                                            "Kindly remove the inappropriate language and try again.")
                            break
                    if error_message:
                        break
                # Sensitive information policy checks
                if not error_message and "sensitiveInformationPolicy" in assessment:
                    for pii in assessment["sensitiveInformationPolicy"].get("piiEntities", []):
                        if pii.get("action") == "BLOCKED":
                            error_message = ("Sorry, I cannot process your case because it contains sensitive information. "
                                            "Kindly remove the relevant content and try again.")
                            break
                    if error_message:
                        break
            if not error_message:
                error_message = ("Sorry, I cannot process your case because it contains restricted content. "
                                "Kindly remove the relevant content and try again.")
                    
            return {
                'statusCode': 400,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                },
                "body": json.dumps({"error": error_message})
            }
        
        # Proceed with database operations
        conn = connect_to_db()
        cur = conn.cursor()
        
        # Retrieve the user record using cognito_id
        cur.execute('SELECT user_id FROM "users" WHERE cognito_id = %s', (cognito_id,))
        user = cur.fetchone()
        if not user:
            cur.close()
            return {
                'statusCode': 404,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                },
                "body": json.dumps({"error": "User not found"})
            }
        user_id = user[0]
        logger.info("Retrieved user_id: %s", user_id)
        
        # Insert the new case into the database
        insert_query = """
            INSERT INTO "cases" (user_id, case_title, case_type, jurisdiction, case_description, status, last_updated)
            VALUES (%s, %s, %s, %s, %s, 'In Progress', CURRENT_TIMESTAMP)
            RETURNING case_id
        """
        cur.execute(insert_query, (user_id, case_title, case_type, jurisdiction, case_description))
        new_case = cur.fetchone()
        if not new_case:
            cur.close()
            conn.rollback()
            return {
                'statusCode': 500,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                },
                "body": json.dumps({"error": "Failed to create new case"})
            }
        case_id = new_case[0]
        
        # Generate a SHA-256 hash of the case_id
        case_hash = hash_uuid(str(case_id))
        
        # Update the case with the generated case_hash
        update_query = 'UPDATE "cases" SET case_hash = %s WHERE case_id = %s'
        cur.execute(update_query, (case_hash, case_id))
        
        # Commit the transaction
        conn.commit()
        cur.close()
        
        return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
        },
        "body": json.dumps({"case_id": case_id, "case_hash": case_hash})
    }
    
    except Exception as err:
        logger.error("Error in post_student_new_case: %s", err)
        return {
            'statusCode': 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            'body': json.dumps('Error getting response')
        }