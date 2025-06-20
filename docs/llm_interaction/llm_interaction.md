# LLM Interaction Overview

## Table Of Contents
1. [Text Generation](#1-text-generation)
2. [Case Generation](#2-case-generation)
3. [Summary Generation](#3-summary-generation)

---

## LLM Configuration
In all 3 functions, the Bedrock LLM is configured with:

```python
def get_bedrock_llm(
    bedrock_llm_id: str,
    temperature: float,
    max_tokens: int,
) -> ChatBedrock:
    """
    Retrieve a Bedrock LLM instance based on the provided model ID.

    Args:
        bedrock_llm_id (str): The unique identifier for the Bedrock LLM model.
        temperature (float, optional): Controls randomness in responses. Defaults to 0.
        max_tokens (int, optional): Max number of tokens in the output. Defaults to 4096.

    Returns:
        ChatBedrock: An instance of the configured Bedrock LLM.
    """
    return ChatBedrock(
        model_id=bedrock_llm_id,
        model_kwargs=dict(temperature=temperature, max_tokens=max_tokens),
    )
```

| Parameter        | Purpose                                                                                                                                                                                                                              | Configuration                                         | Acceptable Values                                                                                          | Location                                                         |
|------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------|------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------|
| `bedrock_llm_id` | Identifies which Bedrock model (e.g., Llama 3, Claude, Titan, etc.) to use for text generation.                                                                                                                                      | Retrieved from `BEDROCK_LLM_PARAM` at runtime         | Must match a valid Bedrock model ID (e.g., `"meta.llama3-70b-instruct-v1"`, `"anthropic.claude-v2"`, etc.) | All three Lambda functions (`get_bedrock_llm()`) |
| `temperature`     | Controls randomness of the generated output. Lower values = more deterministic; higher values = more diverse/creative.                                                                                                              | Varies by function:<br>- Text Gen: 0<br>- Case Gen: 0.7<br>- Summary Gen: 0.3                                                 | A float between `0` and `1`. Typically ranges from `0.0` (precise) to `1.0` (creative).                     | All three Lambda functions (`get_bedrock_llm()`) |
| `max_tokens`      | Maximum number of tokens the model is allowed to generate in its response. Helps keep output concise and bounded.                                                                                                                   | Varies by function:<br>- Text Gen: 4096<br>- Case Gen: 150<br>- Summary Gen: 2048                                                 | Any non-negative integer (e.g., `1`, `50`, `4096`, etc.).                                                  | All three Lambda functions (`get_bedrock_llm()`) |
| `guardrails`      | Applies content filters to ensure safe and appropriate responses. This includes blocking personally identifiable information (PII), sensitive topics, and advice like legal or financial guidance.                                  | Implicitly enabled (model-level safety)               | Enabled by default in most Bedrock models. Not configurable directly in the helper function.               | Enforced at the model level — not explicitly set in code         |


## 1. Text Generation

Text generation is used in the interview assistant and allows users to ask follow up questions based on case information and AI responses. 

### Key Functions
- `create_dynamodb_history_table(table_name: str)`:
    - Creates a DynamoDB table for storing chat history if it doesn't exist
- `get_student_query(raw_query: str)`:
    - Formats the user's raw query into a template for processing
    - Wraps the query with "user" prefix for the LLM
- `get_initial_student_query(case_type: str, jurisdiction: str, case_description: str)`
    - Generates the first system prompt to start the conversation
    - Includes case details as context for the LLM
    - Instructs the LLM to greet the user and prepare for case discussion
- `get_response(query: str, province: str, statute:  str, llm: ChatBedrock history_aware_retriever, table_name: str, case_id: str, system_prompt: str, case_type: str, jurisdiction: str, case_description: str,) -> dict:`
    - Core function that processes user queries and generates responses
    - Maintains conversation history in DynamoDB
    - Incorporates case details into the system prompt
    - Returns a dictionary with the LLM's responses

## 2. Case Generation

Automatically generates a case title based on inputs like case type, jurisdiction, and description.

### Key Functions
- `get_bedrock_llm(bedrock_llm_id: str, temperature: float = 0.7, max_tokens: int = 150, top_p: float = None)`:
    - Initializes the ChatBedrockConverse model with specified parameters
    - Default temperature is 0.7 for creative title generation
    - Default max_tokens is 150 to keep titles concise
- `setup_guardrail(guardrail_name: str)`:
    - Creates or retrieves a Bedrock guardrail for content filtering
    - Blocks sensitive information like emails, phone numbers, and names
    - Returns guardrail ID and version for use with the LLM
- `handle_generate_title(case_id: str, case_type: str, jurisdiction: str, case_description: str, province: str)`:
    - Orchestrates the title generation process
    - Updates the database with the generated title
    - Capitalizes the title for consistent formatting


## 3. Summary Generation

Summarizes the contents of a conversation history from DynamoDB, creating a professional legal summary for lawyers.

### Key Functions
- `get_bedrock_llm(bedrock_llm_id: str, temperature: float = 0.3)`:
    - Initializes the ChatBedrockConverse model with specified parameters
    - Default temperature is 0.3 for more precise summaries
    - Uses max_tokens of 2048 for comprehensive summaries
- `retrieve_dynamodb_history(table_name: str, session_id: str)`:
    - Retrieves conversation history from DynamoDB for a specific case
    - Converts DynamoDB format to a structured message list
    - Formats messages with role (user/assistant) and timestamp
- `generate_lawyer_summary(messages: list, llm: ChatBedrockConverse, case_type: str, case_description: str, jurisdiction: str)`:
    - Creates a professional legal summary from conversation history
    - Formats the summary with clear headings and sections
    - Includes legal analysis, key facts, parties involved, and recommendations
    - Incorporates case metadata into the summary context
- `update_summaries(case_id, summary)`:
    - Stores the generated summary in the database
    - Associates the summary with the specific case
    - Timestamps the summary for version tracking

