## Extending the API

### Adding New Endpoints

1. **Implement the Lambda Function**: Create a new Lambda function in the `lambda` folder within the `cdk` directory. This function should handle the logic of the new endpoint.
2. **Edit the Api Stack**: In cdk/lib/api-gateway-stack.ts add the lambda function and override the logical id
3. **Define the Endpoint**: Update the `OpenAPI_Swagger_Definition.yaml` file with the new endpoint's specifications, request parameters, and responses. Use the new logical id for the `x-amazon-apigateway-integration:
uri:
  Fn::Sub:` field. Also ensure that the httpMethod field is POST even if the endpoint uses a different http method.
4. **Deploy**: Use AWS CDK to deploy changes to your infrastructure. Confirm that the new endpoint and Lambda function are correctly set up in your environment.

## Modifying the LLM

- **Change the model used in the application**:
  - Find `bedrockLLMParameter` in api-gateway-stack.ts
  - Change stringValue to the model ID of the model you would like to use. A list of thee available models and their IDs are listed [here](https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html)
    For example to change the model to meta llama3 8b instruct, change `bedrockLLMParameter` to:
  ```typescript
  const bedrockLLMParameter = new ssm.StringParameter(
    this,
    "BedrockLLMParameter",
    {
      parameterName: "/DSA/BedrockLLMId",
      description: "Parameter containing the Bedrock LLM ID",
      stringValue: "meta.llama3-8b-instruct-v1:0",
    }
  );
  ```
  - Add permissions to invoke the model selected by finding `bedrockPolicyStatement` and changing the model id. 
  For example to change the model to meta llama3 8b instruct, change `bedrockPolicyStatement` to:
  ```typescript
  const bedrockPolicyStatement = new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ["bedrock:InvokeModel", "bedrock:InvokeEndpoint"],
    resources: [
      "arn:aws:bedrock:" +
        this.region +
        "::foundation-model/meta.llama3-8b-instruct-v1:0",
      "arn:aws:bedrock:" +
        this.region +
        "::foundation-model/amazon.titan-embed-text-v2:0",
    ],
  });
  ```
  - redeploy the application by using the cdk deploy command in the deployment guide.
  - The `system_prompt` in `cdk/text_generation/src/helpers/chat.py` and the prompts in the administrator view may require updates when switching models.