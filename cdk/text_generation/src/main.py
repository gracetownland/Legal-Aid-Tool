import os
import json
import boto3
import botocore
import logging
import psycopg2
from langchain_aws import BedrockEmbeddings

from helpers.vectorstore import get_vectorstore_retriever
from helpers.chat import get_bedrock_llm, get_initial_student_query, get_student_query, create_dynamodb_history_table, get_response, update_session_name, get_audio_response

# Set up basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger()

# Environment variables
DB_SECRET_NAME = os.environ["SM_DB_CREDENTIALS"]
REGION = os.environ["REGION"]
RDS_PROXY_ENDPOINT = os.environ["RDS_PROXY_ENDPOINT"]
BEDROCK_LLM_PARAM = os.environ["BEDROCK_LLM_PARAM"]
EMBEDDING_MODEL_PARAM = os.environ["EMBEDDING_MODEL_PARAM"]
TABLE_NAME_PARAM = os.environ["TABLE_NAME_PARAM"]

# AWS Clients
secrets_manager_client = boto3.client("secretsmanager")
ssm_client = boto3.client("ssm", region_name=REGION)
bedrock_runtime = boto3.client("bedrock-runtime", region_name=REGION)

# Cached resources
connection = None
db_secret = None
BEDROCK_LLM_ID = None
EMBEDDING_MODEL_ID = None
TABLE_NAME = None

# Cached embeddings instance
embeddings = None

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

def initialize_constants():
    global BEDROCK_LLM_ID, EMBEDDING_MODEL_ID, TABLE_NAME, embeddings
    BEDROCK_LLM_ID = get_parameter(BEDROCK_LLM_PARAM, BEDROCK_LLM_ID)
    EMBEDDING_MODEL_ID = get_parameter(EMBEDDING_MODEL_PARAM, EMBEDDING_MODEL_ID)
    TABLE_NAME = get_parameter(TABLE_NAME_PARAM, TABLE_NAME)

    if embeddings is None:
        embeddings = BedrockEmbeddings(
            model_id=EMBEDDING_MODEL_ID,
            client=bedrock_runtime,
            region_name=REGION,
        )
    
    create_dynamodb_history_table(TABLE_NAME)

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
    

def get_default_system_prompt():
    return '''You are a helpful assistant to me, a UBC law student, who answers with kindness while being concise, so that it is easy to read your responses quickly yet still get valuable information from them. No need to be conversational, just skip to talking about the content. Refer to me, the law student, in the second person. I will provide you with context to a legal case I am interviewing my client about, and you exist to help provide legal context and analysis, relevant issues, possible strategies to defend the client, and other important details in a structured natural language response.

To me, the law student, when I provide you with context on certain client cases, and you should provide possible follow-up questions for me, the law student, to ask the client to help progress the case more after your initial (concise and easy to read) analysis. These are NOT for the client to ask a lawyer; this is to help me, the law student, learn what kind of questions to ask my client, so in your analysis you should provide follow-up questions for me, the law student, to ask the client as if I were a lawyer.

Initially, also break down the case and analyze it from a detailed but concise legal perspective. You should also mention certain legal information and implications that I, the law student, may have missed, and mention which part of Canadian law it is applicable to if possible or helpful (as well as cite where I can find that relevant info).

You are NOT allowed to hallucinate, informational accuracy and being up-to-date is important. If you are asked something for which you do not know, either say "I don't know" or ask for further information if applicable and not an invasion of privacy.

Do not indent your text.'''

def get_system_prompt():
    # Connect to the database
    connection = connect_to_db()
    if connection is None:
        raise ValueError("Database connection failed")

    try:
        cur = connection.cursor()
        logger.info("Connected to RDS instance!")

        # Query to get the latest system prompt based on the time_created
        cur.execute("""
            SELECT prompt
            FROM system_prompt
            ORDER BY time_created DESC
            LIMIT 1;
        """)
        
        result = cur.fetchone()
        cur.close()

        if result:
            # Extract the prompt from the query result
            latest_prompt = result[0]
            logger.info("Successfully fetched the latest system prompt.")
            return latest_prompt
        else:
            logger.error("No system prompt found in the database.")
            return None
    except Exception as e:
        logger.error(f"Error fetching system prompt: {e}")
        if cur:
            cur.close()
        connection.rollback()
        return None

def get_audio_details(case_id):
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
            SELECT audio_text
            FROM "audio_files"
            WHERE case_id = %s;
        """, (case_id,))        
        result = cur.fetchone()
        logger.info(f"Query result: {result}")        
        cur.close()
        if result:
            audio_description = result[0]
            logger.info(f"Audio description found for case_id {case_id}: {audio_description}")
            return audio_description
        else:
            logger.warning(f"No audio description found for case_id {case_id}")
            return None
    except Exception as e:
        logger.error(f"Error fetching audio description: {e}")
        if cur:
            cur.close()
        connection.rollback()
        return None

def get_case_details(case_id):
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
            SELECT case_title, case_type, jurisdiction, case_description
            FROM "cases"
            WHERE case_id = %s;
        """, (case_id,))

        result = cur.fetchone()
        logger.info(f"Query result: {result}")

        cur.close()

        if result:
            case_title, case_type, jurisdiction, case_description = result
            logger.info(f"Patient details found for case_id {case_id}: "
                        f"Title: {case_title} \n Case type: {case_type} \n Jurisdiction: {jurisdiction} \n Case description: {case_description}")
            return case_title, case_type, jurisdiction, case_description
        else:
            logger.warning(f"No details found for case_id {case_id}")
            return None, None, None, None

    except Exception as e:
        logger.error(f"Error fetching case details: {e}")
        if cur:
            cur.close()
        connection.rollback()
        return None, None, None, None


def handler(event, context):
    logger.info("Text Generation Lambda function is called!")
    initialize_constants()
    case_audio_description = None
    query_params = event.get("queryStringParameters", {})
    case_id = query_params.get("case_id", "")
    audio_flag = query_params.get("audio_flag", "")
    if not case_id:
        return {
            'statusCode': 400,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            'body': json.dumps("Missing required parameters: case_id")
        }

    system_prompt = get_system_prompt()
    if system_prompt is None:
        logger.error(f"Error fetching system prompt")
        return {
            'statusCode': 400,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            'body': json.dumps('Error fetching system prompt')
        }
    
    if audio_flag is not None:
        case_audio_description = get_audio_details(case_id)
        if case_description is None:    
            return {
                'statusCode': 400,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                },
                'body': json.dumps('Error fetching audio details')
            }
    add_audio_to_db(case_id, case_audio_description)
    case_title, case_type, jurisdiction, case_description = get_case_details(case_id)
    if case_title is None or case_type is None or jurisdiction is None or case_description is None:
        logger.error(f"Error fetching case details for case_id: {case_id}")
        return {
            'statusCode': 400,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            'body': json.dumps('Error fetching patient details')
        }

    body = {} if event.get("body") is None else json.loads(event.get("body"))
    question = body.get("message_content", "")

    if not question:
        logger.info(f"Start of conversation. Creating conversation history table in DynamoDB.")
        student_query = get_initial_student_query(case_type, jurisdiction, case_description)
    else:
        logger.info(f"Processing student question: {question}")
        student_query = get_student_query(question)

    try:
        logger.info("Creating Bedrock LLM instance.")
        llm = get_bedrock_llm(BEDROCK_LLM_ID)
    except Exception as e:
        logger.error(f"Error getting LLM from Bedrock: {e}")
        return {
            'statusCode': 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            'body': json.dumps('Error getting LLM from Bedrock')
        }

    try:
        logger.info("Retrieving vectorstore config.")
        db_secret = get_secret(DB_SECRET_NAME)
        vectorstore_config_dict = {
            'collection_name': case_id,
            'dbname': db_secret["dbname"],
            'user': db_secret["username"],
            'password': db_secret["password"],
            'host': RDS_PROXY_ENDPOINT,
            'port': db_secret["port"]
        }
    except Exception as e:
        logger.error(f"Error retrieving vectorstore config: {e}")
        return {
            'statusCode': 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            'body': json.dumps('Error retrieving vectorstore config')
        }

    try:
        logger.info("Creating history-aware retriever.")

        history_aware_retriever = get_vectorstore_retriever(
            llm=llm,
            vectorstore_config_dict=vectorstore_config_dict,
            embeddings=embeddings
        )
    except Exception as e:
        logger.error(f"Error creating history-aware retriever: {e}")
        return {
            'statusCode': 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            'body': json.dumps('Error creating history-aware retriever')
        }

    try:
        logger.info("Generating response from the LLM.")
        if audio_flag is not None:
            response = get_audio_response(
                query=student_query,
                llm=llm,
                history_aware_retriever=history_aware_retriever,
                table_name=TABLE_NAME,
                case_id=case_id,
                system_prompt=system_prompt,
                case_audio_description=case_audio_description
            )
        else:
            response = get_response(
                query=student_query,
                case_title=case_title,
                llm=llm,
                history_aware_retriever=history_aware_retriever,
                table_name=TABLE_NAME,
                case_id=case_id,
                system_prompt=system_prompt,
                case_type=case_type,
                jurisdiction=jurisdiction,
                case_description=case_description
            )
    except Exception as e:
        logger.error(f"Error getting response: {e}")
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

    # try:
    #     logger.info("Updating session name if this is the first exchange between the LLM and student")
    #     potential_session_name = update_session_name(
    #         TABLE_NAME, case_id, BEDROCK_LLM_ID)
    #     if potential_session_name:
    #         logger.info("This is the first exchange between the LLM and student. Updating session name.")
    #         session_name = potential_session_name
    #     else:
    #         logger.info("Not the first exchange between the LLM and student. Session name remains the same.")
    # except Exception as e:
    #     logger.error(f"Error updating session name: {e}")
    #     session_name = "New Chat"

    logger.info("Returning the generated response.")
    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
        },
        "body": json.dumps({
            "llm_output": response #.get("llm_output", "LLM failed to create response"),
        })
    }


