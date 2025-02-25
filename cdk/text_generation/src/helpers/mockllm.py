import time

import boto3
from langchain_community.embeddings.bedrock import BedrockEmbeddings
from langchain_aws import BedrockLLM

import logging

from langchain.chains import ConversationChain
from langchain.prompts import PromptTemplate

from typing import Dict

from langchain_core.vectorstores import VectorStoreRetriever
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.chains import create_history_aware_retriever


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


def answer_prompt(user_prompt, number_of_docs):

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
                        model_id=LLAMA_3_8B
                    )
    

    case_examples = '''Our hope is that an AI tool used by a student in these scenarios would not attempt to “solve” the issue, as legal matters have infinitely possible outcomes which can be based on many criteria including the personal circumstances of the client.  It would be great however if the tool could provide the student with insights about the legal and factual issues which may be engaged in these circumstances.  This would then help the students think about what legal issues to further research and what factual issues they should be investigating.


Case 1 : 


The first scenario is based more on the student having had at least one interview with the client : 


Accused is charged with assault causing bodily harm contrary to section 267(b) of the Criminal Code.  Accused was having an argument in a bar with the Victim, and the Victim is claiming that the Accused punched him repeatedly in an unprovoked attack.  Accused versions of events is that he was fairly intoxicated but still had a good sense of what was going on.  Accused remembers that he and Victim argued and then Victim challenged him to a fight.  Accused says he started walking away.  Accused then says Victim then pushed Accused from behind and Accused says he then turned around and punched Victim in the stomach twice to defend himself.


LLM should: 


Hopefully the tool can gather information which sets out the “essential elements” of proving the offence of assault causing bodily harm:  
application of force, 
intent to apply force, 
victim not consenting to force, 
and that harm that is more than trifling
 
Great additional insights provided by the tool would be things like : 
 
-assault is an included offence of assault causing bodily harm
 
-the scenario above raises potential defence of self-defence and consent (and maybe set out the requirements of those defences)
 
-that the intoxication is not likely a relevant issue
 
-that there are critical factual issues in this case in terms of who started the physical altercation and the level of force used by the accused in his response
 
By letting the student know about the legal issues, it would likely help the students assess both the case and the factual issues which are relevant.  Even if it just provided basic legal frameworks the students should be looking at for this offence that would be helpful.


Case 2 : 


The second one is a scenario where an intake person at the clinic has some basic information but no details yet : 


Client lives in Vancouver BC and had family law issues.  She and her husband were married for two years and have one child.  She and the child recently left her husband because he was being abusive to her and their child.  She is seeking some sort of restraining order against her husband to protect her and her child and need some sort of child support because she is not working.


LLM should:  


In terms of the second scenario, I think we would be looking for a tool to provide some broader information, such as:
 
emergency court applications which are available for a person in these circumstances
 
the basic legal rights of the client and child in these circumstances and
 
maybe even some community resources able to assist in these circumstances'''
    # system_prompt = get_system_prompt(case_id)

    system_prompt = f'''You are a helpful assistant to me, a UBC law student, who answers
         with kindness while being concise, so that it is easy to read your
         responses quickly yet still get valuable information from them. No need
         to be conversational, just skip to talking about the content. Refer to me,
         the law student, in the second person. You will be provided with context to
         a legal case  is interviewing a client about, and you exist to help provide 
         legal context and analysis, relevant issues, possible strategies to defend the
         client, etc. to the law student when they provide you with context on certain
         client cases, and you should provide possible follow-up questions for me, the
         law student, to ask the client to help progress the case more after your initial
         (concise and easy to read) analysis. These are NOT for the client to ask a lawyer;
         this is to help me, the law student, learn what kind of questions to ask my client,
         so you should only provide follow-up questions for me, the law student, to ask the
         client as if I were a lawyer. You may also mention certain legal information and 
         implications that I, the law student, may have missed, and mention which part of 
         Canadian law it is applicable too if possible or helpful. You are NOT allowed hallucinate, 
         informational accuracy is important.
         
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

    
    answer = llm.invoke(prompt)

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

