import os
import json
import boto3
import psycopg2
from psycopg2.extensions import AsIs
import secrets

DB_SECRET_NAME = os.environ["DB_SECRET_NAME"]
DB_USER_SECRET_NAME = os.environ["DB_USER_SECRET_NAME"]
DB_PROXY = os.environ["DB_PROXY"]
print(psycopg2.__version__)

# Global Secret Manager Client to avoid recreating multiple times
sm_client = boto3.client("secretsmanager")

def getDbSecret():
    # use secretsmanager client to get db credentials
    response = sm_client.get_secret_value(SecretId=DB_SECRET_NAME)["SecretString"]
    secret = json.loads(response)
    return secret

def createConnection():

    connection = psycopg2.connect(
        user=dbSecret["username"],
        password=dbSecret["password"],
        host=dbSecret["host"],
        dbname=dbSecret["dbname"],
        # sslmode="require"
    )
    return connection


dbSecret = getDbSecret()
connection = createConnection()

def handler(event, context):
    global connection
    if connection.closed:
        connection = createConnection()
    
    cursor = connection.cursor()
    try:

        #
        ## Create tables and schema
        ##

        # Create tables based on the schema
        sqlTableCreation = """
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

            CREATE TABLE IF NOT EXISTS "users" (
                "user_id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "cognito_id" varchar,
                "user_email" varchar UNIQUE,
                "username" varchar,
                "first_name" varchar,
                "last_name" varchar,
                "time_account_created" timestamp,
                "roles" varchar[],
                "last_sign_in" timestamp DEFAULT now(),
                "activity_counter" integer DEFAULT 0,
                "last_activity" timestamp DEFAULT now(),
                "read_disclaimer" boolean DEFAULT false
            );

            CREATE TABLE IF NOT EXISTS "messages" (
                "message_id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "instructor_id" uuid,
                "message_content" text,
                "case_id" uuid,
                "time_sent" timestamp DEFAULT now(),
                "is_read" boolean DEFAULT false
            );

            CREATE TABLE IF NOT EXISTS "system_prompt" (
                "system_prompt_id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "prompt" text,
                "time_created" timestamp DEFAULT now()
            );

            CREATE TABLE IF NOT EXISTS "instructor_students" (
                "instructor_id" uuid NOT NULL,
                "student_id" uuid NOT NULL,
                PRIMARY KEY ("instructor_id", "student_id")
            );

            CREATE TABLE IF NOT EXISTS "cases" (
                "case_id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "case_hash" varchar UNIQUE,
                "case_title" varchar,
                "case_type" varchar,
                "user_id" uuid,
                "jurisdiction" varchar[],
                "case_description" text,
                "province" varchar DEFAULT 'N/A',
                "statute" varchar DEFAULT 'N/A',
                "status" varchar DEFAULT 'In progress',
                "last_updated" timestamp DEFAULT now(),
                "time_created" timestamp DEFAULT now(),
                "time_submitted" timestamp DEFAULT null,
                "time_reviewed" timestamp DEFAULT null,
                "sent_to_review" boolean,
                "student_notes" text DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS "summaries" (
                "summary_id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "case_id" uuid,
                "content" text,
                "time_created" timestamp DEFAULT now(),
                "is_read" boolean DEFAULT false
            );

            CREATE TABLE IF NOT EXISTS "audio_files" (
            audio_file_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            case_id uuid,
            audio_text text,
            s3_file_path text,
            timestamp timestamp DEFAULT now()
            );

            -- Add foreign key constraints

            ALTER TABLE "messages" ADD FOREIGN KEY ("case_id") REFERENCES "cases" ("case_id") ON DELETE CASCADE ON UPDATE CASCADE;
            ALTER TABLE "messages" ADD FOREIGN KEY ("instructor_id") REFERENCES "users" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
            ALTER TABLE "cases" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
            ALTER TABLE "summaries" ADD FOREIGN KEY ("case_id") REFERENCES "cases" ("case_id") ON DELETE CASCADE ON UPDATE CASCADE;

            ALTER TABLE "instructor_students" 
            ADD FOREIGN KEY ("instructor_id") REFERENCES "users" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

            ALTER TABLE "instructor_students" 
            ADD FOREIGN KEY ("student_id") REFERENCES "users" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

            ALTER TABLE "audio_files" 
            ADD FOREIGN KEY ("case_id") REFERENCES "cases" ("case_id") ON DELETE CASCADE ON UPDATE CASCADE;
        """

        #
        ## Create users with limited permissions on RDS
        ##

        # Execute table creation
        cursor.execute(sqlTableCreation)
        connection.commit()

        # Generate 16 bytes username and password randomly
        username = secrets.token_hex(8)
        password = secrets.token_hex(16)
        usernameTableCreator = secrets.token_hex(8)
        passwordTableCreator = secrets.token_hex(16)

        # Create new user roles
        sqlCreateUser = """
            DO $$
            BEGIN
                CREATE ROLE readwrite;
            EXCEPTION
                WHEN duplicate_object THEN
                    RAISE NOTICE 'Role already exists.';
            END
            $$;

            GRANT CONNECT ON DATABASE postgres TO readwrite;

            GRANT USAGE ON SCHEMA public TO readwrite;
            GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO readwrite;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO readwrite;
            GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO readwrite;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO readwrite;

            CREATE USER "%s" WITH PASSWORD '%s';
            GRANT readwrite TO "%s";
        """
        
        sqlCreateTableCreator = """
            DO $$
            BEGIN
                CREATE ROLE tablecreator;
            EXCEPTION
                WHEN duplicate_object THEN
                    RAISE NOTICE 'Role already exists.';
            END
            $$;

            GRANT CONNECT ON DATABASE postgres TO tablecreator;

            GRANT USAGE, CREATE ON SCHEMA public TO tablecreator;
            GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tablecreator;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tablecreator;
            GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO tablecreator;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO tablecreator;

            CREATE USER "%s" WITH PASSWORD '%s';
            GRANT tablecreator TO "%s";
        """

        # Execute user creation
        cursor.execute(
            sqlCreateUser,
            (
                AsIs(username),
                AsIs(password),
                AsIs(username),
            ),
        )
        connection.commit()
        cursor.execute(
            sqlCreateTableCreator,
            (
                AsIs(usernameTableCreator),
                AsIs(passwordTableCreator),
                AsIs(usernameTableCreator),
            ),
        )
        connection.commit()

        # Store credentials in Secrets Manager
        authInfoTableCreator = {"username": usernameTableCreator, "password": passwordTableCreator}
        dbSecret.update(authInfoTableCreator)
        sm_client.put_secret_value(SecretId=DB_PROXY, SecretString=json.dumps(dbSecret))

        # Store client username and password
        authInfo = {"username": username, "password": password}
        dbSecret.update(authInfo)
        sm_client.put_secret_value(SecretId=DB_USER_SECRET_NAME, SecretString=json.dumps(dbSecret))

        # Print sample queries to validate data
        sample_queries = [
            'SELECT * FROM "users";',
            'SELECT * FROM "instructor_students";',
            'SELECT * FROM "messages";',
            'SELECT * FROM "cases";',
            'SELECT * FROM "summaries";',
            'SELECT * FROM "system_prompt";',
        ]

        for query in sample_queries:
            cursor.execute(query)
            print(cursor.fetchall())

        default_prompt = """
        You are a helpful assistant for a UBC law student. Respond with kindness and clarity, but be concise and skip conversational fluff. Use second person when referring to the student. You will be given context about legal cases the student is interviewing clients for. Your task is to:

        Provide structured legal analysis from a Canadian legal perspective.

        Identify key legal issues, relevant defences, and strategies the student should consider.

        Highlight applicable laws and cite sources or legal sections where relevant.

        Mention any legal implications or concepts the student may have missed.

        Suggest follow-up questions the student should ask the client to help clarify or advance the case (these are for the student, not for the client to ask a lawyer).

        Do not hallucinate. If you don’t know something, say so or ask for more info (without violating privacy). Accuracy is critical.

        Purpose: Your goal is to help the student think critically about what legal/factual issues to investigate or research. Don’t try to “solve” the case—just provide helpful insights, legal frameworks, and next steps.

        Examples:

        In an assault case, discuss elements like force, intent, consent, and harm. Include possible defences (e.g. self-defence, consent), intoxication relevance, and key facts (e.g. who started it, level of force).

        In a family law case, note rights of spouses/children, emergency court applications, and relevant community resources.

        [End of examples. Student will now provide case context.]
        """.strip()

        cursor.execute(
            'INSERT INTO "system_prompt" ("prompt") VALUES (%s);',
            (default_prompt,)
        )
        connection.commit()

        # Close cursor and connection
        cursor.close()
        connection.close()

        print("Initialization completed")
    except Exception as e:
        print(e)