# Text Generation Documentation

## Table Of Contents
1. [LLM Configuration](#llm-configuration) 
2. [Detailed Function Descriptions](#detailed-function-descriptions)
3. 

## LLM Configuration
In `cdk/lambda/text_generation/src/helpers/chat.py`, the Bedrock LLM is configured with:

```python
def get_bedrock_llm(
    bedrock_llm_id: str,
    temperature: float = 0,
    max_tokens: int = 4096,
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

| Parameter        | Purpose                                                                                                                                                                                                                              | Current Value                                         | Acceptable Values                                                                                          | Location                                                         |
|------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------|------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------|
| `bedrock_llm_id` | Identifies which Bedrock model (e.g., Llama 3, Claude, Titan, etc.) to use for text generation.                                                                                                                                      | Retrieved from `BEDROCK_LLM_PARAM` at runtime         | Must match a valid Bedrock model ID (e.g., `"meta.llama3-70b-instruct-v1"`, `"anthropic.claude-v2"`, etc.) | `cdk/lambda/text_generation/src/helpers/chat.py` (`get_bedrock_llm()`) |
| `temperature`     | Controls randomness of the generated output. Lower values = more deterministic; higher values = more diverse/creative.                                                                                                              | `0.7`                                                 | A float between `0` and `1`. Typically ranges from `0.0` (precise) to `1.0` (creative).                     | `cdk/lambda/text_generation/src/helpers/chat.py` (`get_bedrock_llm()`) |
| `max_tokens`      | Maximum number of tokens the model is allowed to generate in its response. Helps keep output concise and bounded.                                                                                                                   | `150`                                                 | Any non-negative integer (e.g., `1`, `50`, `4096`, etc.).                                                  | `cdk/lambda/text_generation/src/helpers/chat.py` (`get_bedrock_llm()`) |
| `guardrails`      | Applies content filters to ensure safe and appropriate responses. This includes blocking personally identifiable information (PII), sensitive topics, and advice like legal or financial guidance.                                  | Implicitly enabled (model-level safety)               | Enabled by default in most Bedrock models. Not configurable directly in the helper function.               | Enforced at the model level — not explicitly set in code         |


## Detailed Function Descriptions
### get_bedrock_llm(bedrock_llm_id, temperature=0.7, max_tokens=150, top_p=None)

Initializes and configures the Bedrock LLM client with specified parameters.

**Parameters:**

**bedrock_llm_id:** The unique identifier for the Bedrock model
    **temperature:** Controls randomness in responses (0.0-1.0)
    **max_tokens:** Maximum length of generated responses
    **top_p:** Token selection threshold for nucleus sampling

Returns: Configured ChatBedrockConverse instance

### get_response(case_type, llm, jurisdiction=None, case_description=None, province=None)

### setup_guardrail(guardrail_name)