import time

import boto3
from langchain_community.embeddings.bedrock import BedrockEmbeddings
from langchain_aws import BedrockLLM

import logging
import json

from langchain.chains import ConversationChain
from langchain.prompts import PromptTemplate

from typing import Dict

from langchain_core.vectorstores import VectorStoreRetriever
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.chains import create_history_aware_retriever
from langchain.memory import ConversationBufferMemory


from typing import Optional


from langchain_postgres import PGVector

# Defining Constants
LLAMA_3_8B = "meta.llama3-8b-instruct-v1:0"
LLAMA_3_70B = "meta.llama3-70b-instruct-v1:0"
MISTRAL_7B = "mistral.mistral-7b-instruct-v0:2"
MISTRAL_LARGE = "mistral.mistral-large-2402-v1:0"
LLAMA_3_1_8B = "meta.llama3-1-8b-instruct-v1:0"
LLAMA_3_1_70B = "meta.llama3-1-70b-instruct-v1:0"


def get_bedrock_embeddings(input_text, model_id="amazon.titan-embed-text-v2:0", region_name="ca-central-1"):
    """Fetches text embeddings from AWS Bedrock."""
    bedrock = boto3.client(service_name='bedrock-runtime', region_name=region_name)
    
    body = json.dumps({
        "inputText": input_text,
        "dimensions": 1024,
        "normalize": True
    })

    response = bedrock.invoke_model(
        body=body,
        modelId=model_id,
        accept="*/*",
        contentType="application/json"
    )

    response_body = json.loads(response['body'].read())
    return response_body.get('embedding', [])

get_bedrock_embeddings("hello")




# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_vectorstore(
    collection_name: str, 
    embeddings: BedrockEmbeddings, 
    dbname: str, 
    user: str, 
    password: str, 
    host: str, 
    port: int
) -> Optional[PGVector]:
    """
    Initialize and return a PGVector instance.
    
    Args:
    collection_name (str): The name of the collection.
    embeddings (BedrockEmbeddings): The embeddings instance.
    dbname (str): The name of the database.
    user (str): The database user.
    password (str): The database password.
    host (str): The database host.
    port (int): The database port.
    
    Returns:
    Optional[PGVector]: The initialized PGVector instance, or None if an error occurred.
    """
    try:
        connection_string = (
            f"postgresql+psycopg://{user}:{password}@{host}:{port}/{dbname}"
        )

        logger.info("Initializing the VectorStore")
        vectorstore = PGVector(
            embeddings=embeddings,
            collection_name=collection_name,
            connection=connection_string,
            use_jsonb=True
        )

        logger.info("VectorStore initialized")
        return vectorstore, connection_string

    except Exception as e:
        logger.error(f"Error initializing vector store: {e}")
        return None

case_memory_store = {}

def get_memory(case_id):
    if case_id not in case_memory_store:
        case_memory_store[case_id] = ConversationBufferMemory(return_messages=False, max_length=3)  # limits history to 3 messages
    return case_memory_store[case_id]

def get_vectorstore_retriever(
    llm,
    vectorstore_config_dict: Dict[str, str],
    embeddings#: BedrockEmbeddings
) -> VectorStoreRetriever:
    """
    Retrieve the vectorstore and return the history-aware retriever object.

    Args:
    llm: The language model instance used to generate the response.
    vectorstore_config_dict (Dict[str, str]): The configuration dictionary for the vectorstore, including parameters like collection name, database name, user, password, host, and port.
    embeddings (BedrockEmbeddings): The embeddings instance used to process the documents.

    Returns:
    VectorStoreRetriever: A history-aware retriever instance.
    """
    vectorstore, _ = get_vectorstore(
        collection_name=vectorstore_config_dict['collection_name'],
        embeddings=embeddings,
        dbname=vectorstore_config_dict['dbname'],
        user=vectorstore_config_dict['user'],
        password=vectorstore_config_dict['password'],
        host=vectorstore_config_dict['host'],
        port=int(vectorstore_config_dict['port'])
    )

    retriever = vectorstore.as_retriever()

    # Contextualize question and create history-aware retriever
    contextualize_q_system_prompt = (
        """Given a chat history and the latest user question 
        which might reference context in the chat history, 
        formulate a standalone response which can be understood 
        without the chat history, but may make references to past messages as well.
        Just reformulate it if needed and otherwise return it as is."""
    )
    contextualize_q_prompt = ChatPromptTemplate.from_messages(
        [
            ("system", contextualize_q_system_prompt),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ]
    )
    history_aware_retriever = create_history_aware_retriever(
        llm, retriever, contextualize_q_prompt
    )

    return history_aware_retriever


def answer_prompt(user_prompt, case_id):

    # Record the start times
    total_start_time = time.time()
    answer_start_time = time.time()

    # Initialize the Bedrock Embeddings model
    # embeddings = BedrockEmbeddings()
    embedding = get_bedrock_embeddings(user_prompt)

    # docs = get_combined_docs(embedding, number_of_docs)

    # divided_docs = split_docs(docs)
    # print(len(divided_docs["docs"]))

    # documents = format_docs(divided_docs["docs"])

    # Get the LLM we want to invoke
    llm = BedrockLLM(
                        model_id=LLAMA_3_70B,
                        streaming=True
                    )
    

    case_examples = '''Our hope is that an AI tool used by a student in these scenarios would not attempt to “solve” the issue, as legal matters have infinitely possible outcomes which can be based on many criteria including the personal circumstances of the client.  It would be great however if the tool could provide the student with insights about the legal and factual issues which may be engaged in these circumstances.  This would then help the students think about what legal issues to further research and what factual issues they should be investigating.      
        
        Hopefully the tool can gather information which sets out the “essential elements” of proving the offence or defense at hand. For example, in an assault case, it may be good to consider (remember, this is an example, the client has NOT gone through this made up scenario) :
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
        
        
        In a potentail divorce case (remember, this is an example, the client has NOT gone through this made up scenario)
        
        
        LLM should ideally:  
        
        
        provide some broader information, such as:
         
        emergency court applications which are available for a person in relevant circumstances if applicable
         
        the basic legal rights of the client and potential children, if any, in the circumstances and
         
        maybe even some community resources able to assist in the circumstances'''
        # system_prompt = get_system_prompt(case_id)
    
        # history_aware_retriever = get_vectorstore_retriever(
        #         llm=llm,
        #         vectorstore_config_dict=vectorstore_config_dict,
        #         embeddings=embeddings
        #     )
    
    system_prompt = f'''You are a helpful assistant to me, a UBC law student, who answers
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
             so you should only provide follow-up questions for me, the law student, to ask the
             client as if I were a lawyer. You may also mention certain legal information and 
             implications that I, the law student, may have missed, and mention which part of 
             Canadian law it is applicable too if possible or helpful. You are NOT allowed hallucinate, 
             informational accuracy is important. If you are asked something for which you do not know, either
             say "I don't know" or ask for further information if applicable and not an invasion of privacy.
             
             Case Examples : {case_examples}
             '''
    # system_prompt = "You are a helpful UBC student advising assistant who answers with kindness while being concise. If the question does not relate to UBC, respond with 'IDK.'"
    # system_prompt = """You are a helpful UBC student advising assistant. 
    #                    Using the documents given to you, consicely answer the user's prompt with kindness. 
    #                    If the question does not relate to UBC, respond with 'IDK.'"""

    if llm.model_id == LLAMA_3_8B or llm.model_id == LLAMA_3_70B or llm.model_id == LLAMA_3_1_8B or llm.model_id == LLAMA_3_1_70B:
        prompt = f"""
                {system_prompt}
                
                User: {user_prompt}
                
                Assistant:
                """
    else:
        prompt = f"""{system_prompt}. Provide your answer as if you are talking to a student.
            Here is the question: {user_prompt}
            """

        # Retrieve memory for the specific case ID
    memory = get_memory(case_id)

    # Create the conversation chain with LLM and memory
    conversation_chain = ConversationChain(
        llm=llm,
        memory=memory
    )

   # Get assistant's response using conversation chain
    answer = conversation_chain.predict(input=user_prompt)

    # Record the end time and find duration of answer only
    answer_end_time = time.time()
    answer_duration = answer_end_time - answer_start_time

    # check_docs = check_if_documents_relates(divided_docs["docs"], user_prompt, llm)
    # check_additional_docs = check_if_documents_relates(divided_docs["removed_docs"], user_prompt, llm)

    # Record the end time and find duration of the total time of checking over each document
    total_end_time = time.time()
    total_duration = total_end_time - total_start_time

    return {"answer": answer,
            # "docs": check_docs,
            # "additional_docs": check_additional_docs,
            "answer_time": answer_duration, "total_time": total_duration}

# Neatly prints dictionary returned by answer_prompt
def neat_print(response):
    print(f"{response['answer']}\n")



def handler(event, context):
    logger.info("Text Generation Lambda function is called!")

    query_params = event.get("queryStringParameters", {})

    body = {} if event.get("body") is None else json.loads(event.get("body"))
    question = body.get("message_content", "")

    logger.info(f"Processing student question: {question}")

    try:
        logger.info("Retrieving vectorstore config.")
        # db_secret = get_secret(DB_SECRET_NAME)
        # vectorstore_config_dict = {
        #     'collection_name': patient_id,
        #     'dbname': db_secret["dbname"],
        #     'user': db_secret["username"],
        #     'password': db_secret["password"],
        #     'host': RDS_PROXY_ENDPOINT,
        #     'port': db_secret["port"]
        # }
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
        # history_aware_retriever = get_vectorstore_retriever(
        #     llm=llm,
        #     vectorstore_config_dict=vectorstore_config_dict,
        #     embeddings=embeddings
        # )
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
        response = answer_prompt(question, 5)  # Case ID is passed as 5
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
            "llm_output": response.get("answer", "LLM failed to create response"),  # Fix key name here
        })
    }


