# Clinical-Interview-Tool

| Index                                               | Description                                             |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [High Level Architecture](#high-level-architecture) | High level overview illustrating component interactions |
| [Deployment](#deployment-guide)                     | How to deploy the project                               |
| [User Guide](#user-guide)                           | The working solution                                    |
| [Directories](#directories)                         | General project directory structure                     |
| [API Documentation](#api-documentation)             | Documentation on the API the project uses               |
| [Credits](#credits)                                 | Meet the team behind the solution                       |
| [License](#license)                                 | License details                                         |

## Deployment Guide

To deploy this solution, please follow the steps laid out in the [Deployment Guide](./docs/deploymentGuide.md)

## User Guide

Please refer to the [Web App User Guide](./docs/userGuide.md) for instructions on navigating the web app interface.

## Directories

```
├── cdk/
│   ├── bin/
│   ├── data_ingestion/
│   ├── lambda/
│   ├── layers/
│   ├── lib/
|   ├── graphql/
|   ├── title_generation/
|   ├── audioToText/
|   ├── summary_generation/
│   └── text_generation/

├── docs/
│   ├── userGuide.md
│   ├── deploymentGuide.md
│   ├── images/
├── frontend/
│   ├── public/
│   └── src/
│       ├── app/
│       └── components/

```

1. `/cdk`: Contains the deployment code for the app's AWS infrastructure
   - `/bin`: Contains the instantiation of CDK stack
   - `/data_ingestion`: Contains the code required for the Data Ingestion step in retrieval-augmented generation. This folder is used by a Lambda function that runs a container which updates the vectorstore for a course when files are uploaded or deleted.
   - `/lambda`: Contains the lambda functions for the project
   - `/layers`: Contains the required layers for lambda functions
   - `/lib`: Contains the deployment code for all infrastructure stacks
   - `/text_generation`: Contains the code required for the Text Generation. This folder is used by a Lambda function that runs a container which retrieves specific documents and invokes the LLM to generate appropriate responses during a conversation.
   - `/title_generation`: Contains the code required for the Title Generation. This folder is used by a Lambda function that runs a container which retrieves specific documents and invokes the LLM to generate appropriate responses during a conversation.
   - `/audioToText`: Contains the code required for the Audio to Text. This folder is used by a Lambda function that runs a container which retrieves specific documents and invokes the LLM to generate appropriate responses during a conversation.
   - `/summary_generation`: Contains the code required for the Summary Generation. This folder is used by a Lambda function that runs a container which retrieves specific documents and invokes the LLM to generate appropriate responses during a conversation.
   - `/graphql`: Contains the GraphQL schema and resolvers for the API.
2. `/docs`: Contains documentation for the application.
3. `/frontend`: Contains the user interface of the general public application

## API Documentation

Here you can learn about the API the project uses: [API Documentation](./docs/api-documentation.pdf).

## Modification Guide

Steps to implement optional modifications such as changing the colours of the application can be found
[here](./docs/modificationGuide.md).
## License

This project is distributed under the [MIT License](LICENSE).

Licenses of libraries and tools used by the system are listed below:

[PostgreSQL license](https://www.postgresql.org/about/licence/)

- For PostgreSQL and pgvector
- "a liberal Open Source license, similar to the BSD or MIT licenses."

[LLaMa 3 Community License Agreement](https://llama.meta.com/llama3/license/)

- For Llama 3 70B Instruct model