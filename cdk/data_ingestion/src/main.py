import os
import json
import logging
import hashlib
import base64
import uuid
import time
import psycopg2
import boto3
from botocore.exceptions import ClientError

# Configure logging for the Lambda function
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment variables (to be set in Lambda configuration)
DB_SECRET_NAME = os.environ["SM_DB_CREDENTIALS"]  # Secrets Manager secret name for DB credentials
REGION = os.environ["REGION"]                   # AWS region for SSM and Bedrock calls
RDS_PROXY_ENDPOINT = os.environ["RDS_PROXY_ENDPOINT"]  # RDS Proxy endpoint for DB connections

# AWS service clients
secrets_manager_client = boto3.client("secretsmanager")
ssm_client = boto3.client("ssm", region_name=REGION)
bedrock_runtime = boto3.client("bedrock-runtime", region_name=REGION)

# Global DB connection cache
connection = None


def get_secret(secret_name: str, expect_json: bool = True) -> dict:
    """
    Retrieve a secret from AWS Secrets Manager and parse as JSON if requested.

    Args:
        secret_name: Name of the secret in Secrets Manager.
        expect_json: Whether to JSON-decode the secret string.

    Returns:
        The parsed secret (dict if JSON, else raw string).

    Raises:
        Exception if the secret retrieval or parsing fails.
    """
    try:
        response = secrets_manager_client.get_secret_value(SecretId=secret_name)
        raw = response["SecretString"]
        return json.loads(raw) if expect_json else raw
    except ClientError as e:
        logger.error(f"Failed to retrieve secret {secret_name}: {e}")
        raise
    except json.JSONDecodeError as e:
        logger.error(f"Secret {secret_name} is not valid JSON: {e}")
        raise


def connect_to_db():
    """
    Establish or reuse a connection to the RDS database via the RDS proxy.

    Uses credentials from Secrets Manager.
    """
    global connection
    if connection is None or connection.closed:
        # Load DB credentials
        secret = get_secret(DB_SECRET_NAME)
        params = {
            'dbname': secret['dbname'],
            'user': secret['username'],
            'password': secret['password'],
            'host': RDS_PROXY_ENDPOINT,
            'port': secret['port']
        }
        # Build psycopg2 connection string
        conn_str = ' '.join(f"{k}={v}" for k, v in params.items())
        try:
            connection = psycopg2.connect(conn_str)
            logger.info("Connected to RDS via proxy")
        except Exception as e:
            logger.error(f"Database connection error: {e}")
            if connection:
                connection.rollback()
                connection.close()
            raise
    return connection


def hash_uuid(uuid_str: str) -> str:
    """
    Generate a short Base64-based hash from a UUID string.

    - Compute SHA-256 digest of the UUID string.
    - Encode in URL-safe Base64.
    - Truncate to 6 characters for compactness.

    Args:
        uuid_str: The UUID string to hash.
    Returns:
        A 6-character URL-safe Base64 hash.
    """
    sha = hashlib.sha256(uuid_str.encode('utf-8')).digest()
    b64 = base64.urlsafe_b64encode(sha).decode('utf-8')
    return b64[:6]


def setup_guardrail(guardrail_name: str) -> tuple[str, str]:
    """
    Ensure a Bedrock guardrail exists (create if missing), and publish a version.

    Guardrails enforce policies on content (like blocking PII, profanity, financial advice).

    Args:
        guardrail_name: Name identifier for the guardrail policy.
    Returns:
        A tuple of (guardrail_id, guardrail_version).
    """
    bedrock_client = boto3.client("bedrock", region_name=REGION)
    guardrail_id = None
    guardrail_version = None

    # List existing guardrails to check for a match by name
    paginator = bedrock_client.get_paginator('list_guardrails')
    for page in paginator.paginate():
        for gr in page.get('guardrails', []):
            if gr['name'] == guardrail_name:
                logger.info(f"Found existing guardrail: {guardrail_name}")
                guardrail_id = gr['id']
                guardrail_version = gr.get('version')
                break
        if guardrail_id:
            break

    # Create guardrail if not found
    if not guardrail_id:
        logger.info(f"Creating guardrail: {guardrail_name}")
        resp = bedrock_client.create_guardrail(
            name=guardrail_name,
            description='Enforce no financial advice, offensive or PII content.',
            topicPolicyConfig={
                'topicsConfig': [
                    # DENY financial advice questions
                    {'name': 'FinancialAdvice', 'definition': 'Any request for personalized financial guidance.', 'type':'DENY'},
                    # DENY hate speech or explicit content
                    {'name': 'OffensiveContent', 'definition': 'Hate or explicit material.', 'type':'DENY'},
                    # DENY profanity
                    {'name': 'Profanity', 'definition': 'Use of swear words.', 'type':'DENY'}
                ]
            },
            sensitiveInformationPolicyConfig={
                'piiEntitiesConfig': [
                    {'type': 'EMAIL','action': 'BLOCK'},
                    {'type': 'PHONE','action': 'BLOCK'},
                    {'type': 'NAME','action': 'BLOCK'}
                ]
            },
            blockedInputMessaging='Sorry, I cannot process that content.',
            blockedOutputsMessaging='Sorry, I cannot process that content.'
        )
        guardrail_id = resp['guardrailId']
        # Wait briefly for guardrail to become ready
        time.sleep(5)
        # Publish version
        ver_resp = bedrock_client.create_guardrail_version(
            guardrailIdentifier=guardrail_id,
            description='Initial published version',
            clientRequestToken=str(uuid.uuid4())
        )
        guardrail_version = ver_resp['version']
        logger.info(f"Guardrail created: {guardrail_id} v{guardrail_version}")

    return guardrail_id, guardrail_version


def handler(event, context) -> dict:
    """
    Lambda handler for POST /student/new_case:
      1. Validates input via Bedrock guardrails.
      2. Retrieves user by Cognito ID from DB.
      3. Inserts new case record and computes a short hash.
      4. Returns JSON with case_id and case_hash.
    """
    try:
        logger.info(f"Event received: {json.dumps(event)}")

        # 1. Extract and validate user_id
        cognito_id = event.get('queryStringParameters', {}).get('user_id')
        if not cognito_id:
            return _response(400, {'error': 'Missing user_id'})

        # 2. Parse request body
        body = json.loads(event.get('body', '{}'))
        case_title = body.get('case_title')
        case_type = body.get('case_type')
        jurisdiction = body.get('jurisdiction')
        case_desc = body.get('case_description')
        combined = f"{case_title} {case_type} {jurisdiction} {case_desc}"

        # 3. Setup or fetch guardrail
        guardrail_id, guardrail_version = setup_guardrail('comprehensive-guardrails')
        # 4. Apply guardrail to the combined user input
        guard_resp = bedrock_runtime.apply_guardrail(
            guardrailIdentifier=guardrail_id,
            guardrailVersion=guardrail_version,
            source='INPUT',
            content=[{'text': {'text': combined, 'qualifiers': ['guard_content']}}]
        )
        # 5. If guardrail intervenes, return a descriptive error
        if guard_resp.get('action') == 'GUARDRAIL_INTERVENED':
            logger.info(f"Guardrail intervention: {guard_resp}")
            return _handle_guardrail_error(guard_resp)

        # 6. Connect to DB and fetch user record
        conn = connect_to_db()
        cur = conn.cursor()
        cur.execute('SELECT user_id FROM "users" WHERE cognito_id=%s', (cognito_id,))
        row = cur.fetchone()
        if not row:
            cur.close()
            return _response(404, {'error': 'User not found'})
        user_id = row[0]

        # 7. Insert the new case and retrieve generated case_id
        insert_sql = '''INSERT INTO "cases"(user_id, case_title, case_type, jurisdiction, case_description, status, last_updated)
                        VALUES (%s,%s,%s,%s,%s,'In Progress',CURRENT_TIMESTAMP) RETURNING case_id'''
        cur.execute(insert_sql, (user_id, case_title, case_type, jurisdiction, case_desc))
        case_id = cur.fetchone()[0]

        # 8. Compute and store a short case_hash
        case_hash = hash_uuid(str(case_id))
        cur.execute('UPDATE "cases" SET case_hash=%s WHERE case_id=%s', (case_hash, case_id))
        conn.commit()
        cur.close()

        # 9. Return success response
        return _response(200, {'case_id': case_id, 'case_hash': case_hash})

    except Exception as err:
        logger.error(f"Error in handler: {err}", exc_info=True)
        return _response(500, {'error': 'Internal server error'})


def _response(status: int, body: dict) -> dict:
    """
    Helper to build HTTP responses with CORS headers.
    """
    return {
        'statusCode': status,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': '*',
        },
        'body': json.dumps(body)
    }


def _handle_guardrail_error(guard_resp: dict) -> dict:
    """
    Map Bedrock guardrail assessments to user-friendly error messages.
    """
    # Default message
    message = 'Sorry, your input contains disallowed content.'

    for assessment in guard_resp.get('assessments', []):
        # Check topic policy violations
        if 'topicPolicy' in assessment:
            for topic in assessment['topicPolicy'].get('topics', []):
                if topic['action'] == 'BLOCKED':
                    if topic['name'] == 'FinancialAdvice':
                        message = 'Cannot process financial advice content.'
                    elif topic['name'] == 'OffensiveContent':
                        message = 'Cannot process offensive content.'
                    elif topic['name'] == 'Profanity':
                        message = 'Please remove profanity.'
                    break
        # Check PII violations
        if 'sensitiveInformationPolicy' in assessment:
            for pii in assessment['sensitiveInformationPolicy'].get('piiEntities', []):
                if pii['action'] == 'BLOCKED':
                    message = 'Please remove personal information.'
                    break
    return _response(400, {'error': message})
