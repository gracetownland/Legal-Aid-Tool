import os
import json
import boto3
import logging
import psycopg2
from langchain_aws import BedrockEmbeddings

from helpers.vectorstore import get_vectorstore_retriever
from helpers.chat import get_bedrock_llm, get_initial_student_query, get_student_query, create_dynamodb_history_table, get_response, update_session_name

# Set up basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger()

# Environment variables
DB_SECRET_NAME = os.environ["SM_DB_CREDENTIALS"]
SYSTEM_PROMPT_SECRET_NAME = os.environ["SM_SYSTEM_PROMPT"]
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

def get_default_system_prompt():
    return '''You are a helpful assistant to me, a UBC law student, who answers
with kindness while being concise, so that it is easy to read your
responses quickly yet still get valuable information from them. No need
to be conversational, just skip to talking about the content. Refer to me,
the law student, in the second person. I will provide you with context to
a legal case I am interviewing my client about, and you exist to help provide 
legal context and analysis, relevant issues, possible strategies to defend the
client, and other important details in a structured natural language response.
to me, the law student, when I provide you with context on certain
client cases, and you should provide possible follow-up questions for me, the
law student, to ask the client to help progress the case more after your initial
(concise and easy to read) analysis. These are NOT for the client to ask a lawyer;
this is to help me, the law student, learn what kind of questions to ask my client,
so in your analysis you should provide follow-up questions for me, the law student, to ask the
client as if I were a lawyer. Initally, also break down the case and analyze it from a detailed but concise legal perspective.
You should also mention certain legal information and implications that I, the law student, may have missed, and mention which part of 
Canadian law it is applicable too if possible or helpful (as well as cite where i can find that relevant info).
You are NOT allowed hallucinate, informational accuracy and being up-to-date is important. If you are asked something for which
you do not know, either say "I don't know" or ask for further information if applicable and not an invasion of privacy.
Do not indent your text.
             
Case Examples :

Our hope is that an AI tool used by a student in these scenarios would not attempt to â€œsolveâ€ the issue, as legal matters have infinitely possible outcomes which can be based on many criteria including the personal circumstances of the client.  It would be great however if the tool could provide the student with insights about the legal and factual issues which may be engaged in these circumstances.  This would then help the students think about what legal issues to further research and what factual issues they should be investigating.      
        
Hopefully the tool can gather information which sets out the "essential elements" of proving the offence or defense at hand. For example, in an assault case, it may be good to consider (remember, this is an example, the client has NOT gone through this made up scenario) :
application of force, 
intent to apply force, 
victim not consenting to force, 
and that harm that is more than trifling
         
Great additional insights provided by the tool would be things like : 
         
-assault is an included offence of assault causing bodily harm
         
-whether there is potential defence of self-defence and consent (and maybe set out the requirements of those defences)
         
-if intoxication is involved, evaluate whether the intoxication is a relevant issue, or if it's likely not a relevant issue
         
-bring up critical factual issues in terms of who started the physical altercation and the level of force used by the accused
        
By letting the student know about the legal issues, it would likely help the students assess both the case and the factual issues which are relevant.  Even if it just provided basic legal frameworks the students should be looking at for this offence that would be helpful.
        
        
Example 2 : 
        
        
In a potential divorce case (remember, this is an example, the client has NOT gone through this made up scenario)
        
        
LLM should ideally:  
        
        
provide some broader information, such as:
         
emergency court applications which are available for a person in relevant circumstances if applicable
         
the basic legal rights of the client and potential children, if any, in the circumstances and
         
maybe even some community resources able to assist in the circumstances 

[this is the end of the example cases. I will provide context to the case I am currently working on now].'''

def get_system_prompt():    
    bucket_name = os.environ.get("PROMPT_BUCKET_NAME")
    
    if not bucket_name:
        raise ValueError("PROMPT_BUCKET_NAME is not set in environment variables")

    print(f"Bucket name: {bucket_name}")

    s3 = boto3.client("s3")
    file_key = "system_prompt.txt"

    try:
        # Get prompt
        response = s3.get_object(Bucket=bucket_name, Key=file_key)
        retrieved_prompt = response["Body"].read().decode("utf-8")
        return retrieved_prompt
    except botocore.exceptions.ClientError as e:
        # Otherwise generate default if it doesn't exist yet
        if e.response["Error"]["Code"] == "NoSuchKey":
            print(f"Error: {file_key} not found in {bucket_name}. Creating the file with default content.")
            
            
            default_prompt = get_default_system_prompt()
            s3.put_object(Bucket=bucket_name, Key=file_key, Body=default_prompt.encode("utf-8"))
            print(f"Created {file_key} in {bucket_name} with default content.")
            
            return default_prompt
        else:
            raise


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
            SELECT patient_name, patient_age, patient_prompt, llm_completion
            FROM "patients"
            WHERE patient_id = %s;
        """, (patient_id,))

        result = cur.fetchone()
        logger.info(f"Query result: {result}")

        cur.close()

        if result:
            patient_name, patient_age, patient_prompt, llm_completion = result
            logger.info(f"Patient details found for patient_id {patient_id}: "
                        f"Name: {patient_name}, Age: {patient_age}, Prompt: {patient_prompt}, LLM Completion: {llm_completion}")
            return patient_name, patient_age, patient_prompt, llm_completion
        else:
            logger.warning(f"No details found for patient_id {patient_id}")
            return None, None, None, None

    except Exception as e:
        logger.error(f"Error fetching patient details: {e}")
        if cur:
            cur.close()
        connection.rollback()
        return None, None, None


def handler(event, context):
    logger.info("Text Generation Lambda function is called!")
    initialize_constants()

    query_params = event.get("queryStringParameters", {})
    case_id = query_params.get("case_id", "")

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

    patient_name, patient_age, patient_prompt, llm_completion = get_patient_details(
        patient_id)
    if patient_name is None or patient_age is None or patient_prompt is None or llm_completion is None:
        logger.error(f"Error fetching patient details for patient_id: {patient_id}")
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
        student_query = get_initial_student_query(patient_name)
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
            'collection_name': patient_id,
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
        response = get_response(
            query=student_query,
            patient_name=patient_name,
            llm=llm,
            history_aware_retriever=history_aware_retriever,
            table_name=TABLE_NAME,
            session_id=session_id,
            system_prompt=system_prompt,
            patient_age=patient_age,
            patient_prompt=patient_prompt,
            llm_completion=llm_completion
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

    try:
        logger.info("Updating session name if this is the first exchange between the LLM and student")
        potential_session_name = update_session_name(
            TABLE_NAME, session_id, BEDROCK_LLM_ID)
        if potential_session_name:
            logger.info("This is the first exchange between the LLM and student. Updating session name.")
            session_name = potential_session_name
        else:
            logger.info("Not the first exchange between the LLM and student. Session name remains the same.")
    except Exception as e:
        logger.error(f"Error updating session name: {e}")
        session_name = "New Chat"

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
            "session_name": session_name,
            "llm_output": response.get("llm_output", "LLM failed to create response"),
            "llm_verdict": response.get("llm_verdict", "LLM failed to create verdict")
        })
    }


