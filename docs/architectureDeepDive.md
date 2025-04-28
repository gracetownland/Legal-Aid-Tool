# Architecture Deep Dive

## Architecture

![Archnitecture Diagram](./media/architecture.png)

1	Users access the application through a React frontend hosted on AWS Amplify. AWS Cognito handles user authentication, ensuring that only authorized users can log in and interact with the platform.
2	The frontend communicates with backend services by sending secure API requests through AWS API Gateway. AWS IAM policies are used to authorize and manage access between the frontend and backend Lambda functions.
3	When a user uploads an audio file, it is stored in an S3 bucket. An AWS Lambda function monitors the bucket, retrieves the audio file, and prepares it for transcription processing.
4	Amazon Transcribe processes the uploaded audio file and converts it into text. After the transcription is complete, Amazon AppSync sends a real-time WebSocket notification back to the frontend to update the user interface.
5	Metadata related to the audio file and its transcription, such as timestamps and user associations, is securely stored in an Amazon RDS database via an RDS Proxy to optimize database connections.
6	For AI-powered text generation (e.g., summarizations, conversation generation), AWS Lambda triggers Amazon Bedrock, which runs foundation models like Claude, Titan, or Llama to generate relevant outputs.
7	The outputs and conversation history are stored in Amazon DynamoDB. This provides fast retrieval and scalability, allowing users to view past interactions and summaries efficiently.

### Database Schema

![Database Diagram](./media/database_schema.png)

### RDS Tables

### `users` table

| Column Name          | Description                                           |
| -------------------- | ----------------------------------------------------- |
| `user_id`            | UUID, primary key                                     |
| `cognito_id`         | Cognito identity ID                                   |
| `user_email`         | Unique email of the user                              |
| `username`           | Chosen username                                       |
| `first_name`         | First name                                            |
| `last_name`          | Last name                                             |
| `time_account_created` | Timestamp of account creation                       |
| `roles`              | Array of user roles (e.g., student, instructor, admin)|
| `last_sign_in`       | Timestamp of last sign-in                             |
| `activity_counter`   | Number of AI messages sent in the last 24 hours       |
| `last_activity`      | Timestamp of the last AI message sent                 |

### `messages` table

| Column Name      | Description                                |
| ---------------- | ------------------------------------------ |
| `message_id`     | UUID, primary key                          |
| `instructor_id`  | UUID of instructor (FK to `users`)         |
| `message_content`| Text content of the message                |
| `case_id`        | UUID of associated case (FK to `cases`)    |
| `time_sent`      | Timestamp when the message was sent        |
| `is_read`        | Whether the message has been read          |

### `system_prompt` table

| Column Name        | Description                         |
| ------------------ | ----------------------------------- |
| `system_prompt_id` | UUID, primary key                   |
| `prompt`           | System-wide system prompt           |
| `time_created`     | Timestamp when the prompt was added |

### `instructor_students` table

| Column Name     | Description                                  |
| --------------- | -------------------------------------------- |
| `instructor_id` | UUID of instructor (FK to `users`)           |
| `student_id`    | UUID of student (FK to `users`)              |

### `cases` table

| Column Name        | Description                                      |
| ------------------ | ------------------------------------------------ |
| `case_id`          | UUID, primary key                                |
| `case_hash`        | Unique hash for identifying the case (in base64) |
| `case_title`       | Title of the case                                |
| `case_type`        | Type of legal case                               |
| `user_id`          | UUID of creator (FK to `users`)                  |
| `jurisdiction`     | Array of jurisdictions (e.g., Federal, Provinical)|
| `case_description` | Description of the case                          |
| `status`           | Status of the case (default: "In progress")      |
| `last_updated`     | Timestamp of last update                         |
| `time_created`     | Timestamp when the case was created              |
| `time_submitted`   | When the case was submitted                      |
| `time_reviewed`    | When the case was reviewed                       |
| `sent_to_review`   | Boolean: has it been sent for review             |
| `student_notes`    | Notes added by the student (default: empty)      |

### `summaries` table

| Column Name   | Description                            |
| ------------- | -------------------------------------- |
| `summary_id`  | UUID, primary key                      |
| `case_id`     | UUID of related case (FK to `cases`)   |
| `content`     | Summary content                        |
| `time_created`| Timestamp of when it was created       |
| `is_read`     | Boolean: whether the summary was read  |

### `audio_files` table

| Column Name       | Description                                |
| ----------------- | ------------------------------------------ |
| `audio_file_id`   | UUID, primary key                          |
| `case_id`         | UUID of related case (FK to `cases`)       |
| `audio_text`      | Transcribed text from audio                |
| `s3_file_path`    | File path to audio on S3                   |
| `timestamp`       | Timestamp when the audio was uploaded      |

