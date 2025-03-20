// const { v4: uuidv4 } = require('uuid')
const { initializeConnection } = require("./lib.js");
let { SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT, USER_POOL } = process.env;
const {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

const crypto = require("crypto");

function hashUUID(uuid) {
  // Generate a SHA-256 hash and take the first 8 hex characters
  const hash = crypto.createHash("sha256").update(uuid).digest("hex");
  
  // Convert the first 8 characters of the hash into a number
  const numericHash = parseInt(hash.substring(0, 8), 16);
  
  // Ensure it's a 4-digit number (0-9999)
  return numericHash % 10000;
}

// SQL conneciton from global variable at lib.js
let sqlConnection = global.sqlConnection;

exports.handler = async (event) => {
  console.log(event);
  const cognito_id = event.requestContext.authorizer.userId;
  const client = new CognitoIdentityProviderClient();
  const userAttributesCommand = new AdminGetUserCommand({
    UserPoolId: USER_POOL,
    Username: cognito_id,
  });
  const userAttributesResponse = await client.send(userAttributesCommand);

  const emailAttr = userAttributesResponse.UserAttributes.find(
    (attr) => attr.Name === "email"
  );
  const userEmailAttribute = emailAttr ? emailAttr.Value : null;
  // Check for query string parameters

  const queryStringParams = event.queryStringParameters || {};
  const queryEmail = queryStringParams.email;
  const studentEmail = queryStringParams.student_email;
  const userEmail = queryStringParams.user_email;

  const isUnauthorized =
    (queryEmail && queryEmail !== userEmailAttribute) ||
    (studentEmail && studentEmail !== userEmailAttribute) ||
    (userEmail && userEmail !== userEmailAttribute);

  if (isUnauthorized) {
    return {
      statusCode: 401,
      headers: {
        "Access-Control-Allow-Headers":
          "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "*",
      },
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

  const response = {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Headers":
        "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "*",
    },
    body: "",
  };

  // Initialize the database connection if not already initialized
  if (!sqlConnection) {
    await initializeConnection(SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT);
    sqlConnection = global.sqlConnection;
  }

  // Function to format student full names (lowercase and spaces replaced with "_")
  const formatNames = (name) => {
    return name.toLowerCase().replace(/\s+/g, "_");
  };

  let data;
  try {
    const pathData = event.httpMethod + " " + event.resource;
    switch (pathData) {
      case "POST /student/create_user":
        if (event.queryStringParameters) {
          const {
            user_email,
            username,
            first_name,
            last_name,
            time_account_created,
            last_sign_in
          } = event.queryStringParameters;

          const cognitoUserId = event.requestContext.authorizer.userId;
          console.log(event);

          try {
            // Check if the user already exists
            const existingUser = await sqlConnection`
                SELECT * FROM "users"
                WHERE cognito_id = ${cognitoUserId};
            `;

            if (existingUser.length > 0) {
              // Update the existing user's information
              const updatedUser = await sqlConnection`
                    UPDATE "users"
                    SET
                        username = ${username},
                        first_name = ${first_name},
                        last_name = ${last_name},
                        last_sign_in = CURRENT_TIMESTAMP,
                        time_account_created = CURRENT_TIMESTAMP
                    WHERE cognito_id = ${user_id}
                    RETURNING *;
                `;
              response.body = JSON.stringify(updatedUser[0]);
            } else {
              // Insert a new user with 'student' role
              console.log("Trying to create A new User");
              const newUser = await sqlConnection`
                    INSERT INTO "users" (cognito_id, user_email, username, first_name, last_name, time_account_created, roles, last_sign_in)
                    VALUES (${cognitoUserId}, ${user_email}, ${username}, ${first_name}, ${last_name}, CURRENT_TIMESTAMP, ARRAY['student'], CURRENT_TIMESTAMP)
                    RETURNING *;
                `;
              response.body = JSON.stringify(newUser[0]);
              console.log(newUser);
            }
          } catch (err) {
            response.statusCode = 500;
            console.log(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "User data is required" });
        }
        break;
      case "GET /student/get_name":
        if (
          event.queryStringParameters &&
          event.queryStringParameters.user_email
        ) {
          const user_email = event.queryStringParameters.user_email;
          try {
            // Retrieve roles for the user with the provided email
            const userData = await sqlConnection`
                  SELECT first_name
                  FROM "users"
                  WHERE user_email = ${user_email};
                `;
            console.log(userData);
            if (userData.length > 0) {
              response.body = JSON.stringify({ name: userData[0].first_name });
            } else {
              response.statusCode = 404;
              response.body = JSON.stringify({ error: "User not found" });
            }
          } catch (err) {
            response.statusCode = 500;
            console.log(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "User email is required" });
        }
        break;

      case "POST /student/new_case":
          console.log(event);
          console.log("Received event:", JSON.stringify(event, null, 2));

          if (event.queryStringParameters) {
            const {
              case_title,
              case_type,
              case_description,
              system_prompt,
              user_id
            } = event.queryStringParameters;

          
          // Extract query parameters safely
          const userId = event.queryStringParameters?.user_id;
          const caseTitle = event.queryStringParameters?.case_title;
          const caseType = event.queryStringParameters?.case_type;
          const caseDescription = event.queryStringParameters?.case_description;
          const systemPrompt = event.queryStringParameters?.system_prompt;

          // Log extracted values
          console.log("Parsed Parameters:");
          console.log("user_id:", userId);
          console.log("case_title:", caseTitle);
          console.log("case_type:", caseType);
          console.log("case_description:", caseDescription);
          console.log("system_prompt:", systemPrompt);
          
          const user = await sqlConnection`
            SELECT user_id FROM "users" WHERE cognito_id = ${cognito_id};
          `;

          console.log("user_id:", user[0]?.user_id);

          try {
            // SQL query to insert the new case
            const newCase = await sqlConnection`
              INSERT INTO "cases" (user_id, case_title, case_type, law_type, case_description, status, system_prompt, last_updated)
              VALUES (${user[0]?.user_id}, ${case_title}, ${case_title}, ARRAY[${case_type}], ${case_description}, 'In Progress', ${system_prompt}, CURRENT_TIMESTAMP)
              RETURNING case_id;
            `;

            const caseId = newCase[0].case_id;

            // Generate a SHA-256 hash of the case_id
            const caseHash = hashUUID(caseId);

            // Update the case with the generated case_hash
            await sqlConnection`
                UPDATE "cases" SET case_hash = ${caseHash} WHERE case_id = ${caseId};
            `;

            response.body = JSON.stringify({ case_id: caseId, case_hash: caseHash });
          } catch (err) {
            response.statusCode = 500;
            console.log(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "Case data is required" });
        }
      break;

      case "GET /student/get_cases":
        if (
          event.queryStringParameters &&
          event.queryStringParameters.user_id
        ) {
          const cognito_id = event.queryStringParameters.user_id;

          try {
            // Retrieve the user ID using the user_id
            const user = await sqlConnection`
              SELECT user_id FROM "users" where cognito_id = ${cognito_id};
              `;
            
            const user_id = user[0]?.user_id;

            const data = await sqlConnection`
              SELECT * 
              FROM "cases" WHERE user_id = ${user_id};
              `;
            response.body = JSON.stringify(data);
          } catch (err) {
            response.statusCode = 500;
            console.error(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = "Invalid value";
        }
        break;

      case "GET /student/case_page":
        if (event.queryStringParameters && event.queryStringParameters.case_id) {
          const case_id = event.queryStringParameters.case_id;
          try {
            const caseData = await sqlConnection`
              SELECT * FROM "cases" WHERE case_id = ${case_id};
            `;
      
            if (caseData.length > 0) {
              response.body = JSON.stringify(caseData[0]);
            } else {
              response.statusCode = 404;
              response.body = JSON.stringify({ error: "Case not found" });
            }
          } catch (err) {
            response.statusCode = 500;
            console.log(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "Case ID is required" });
        }
        break;  
        
        case "GET /student/get_messages":
          if (event.queryStringParameters && event.queryStringParameters.case_id) {
            const case_id = event.queryStringParameters.case_id;
            try {
              console.log("Received case_id: ", case_id);
        
              // Initialize the DynamoDB client
              const { DynamoDBClient, QueryCommand } = require('@aws-sdk/client-dynamodb');
              const ddbClient = new DynamoDBClient();
        
              // Query DynamoDB for messages with the provided case_id (which is used as SessionId)
              const params = {
                TableName: "DynamoDB-Conversation-Table",
                KeyConditionExpression: "SessionId = :case_id",
                ExpressionAttributeValues: {
                  ":case_id": { S: case_id }
                }
              };
        
              const command = new QueryCommand(params);
              console.log("Query params: ", params);  // Log the params
        
              const data = await ddbClient.send(command);
        
              console.log("Query results: ", data);
        
              if (data.Items && data.Items.length > 0) {
                const messages = data.Items[0].History.L;

                console.log("MESSAGES: ", messages)
                const extractedMessages = messages.map(m => ({
                  type: m.M.data.M.type.S,  // "human" or "ai"
                  content: m.M.data.M.content.S  // Extracting only the message content
                }));
                
                console.log("EXTRACTED MESSAGES: ", extractedMessages)
                if (messages.length > 0) {
                  response.body = JSON.stringify(extractedMessages);  // Return the message content as JSON
                } else {
                  response.statusCode = 404;
                  response.body = JSON.stringify({ error: "No messages found for the case_id" });
                }
              } else {
                response.statusCode = 404;
                response.body = JSON.stringify({ error: "No messages found for the case_id" });
              }
            } catch (err) {
              console.log("Error occurred: ", err);
              response.statusCode = 500;
              response.body = JSON.stringify({ error: "Internal server error" });
            }
          } else {
            console.log("Case ID missing");
            response.statusCode = 400;
            response.body = JSON.stringify({ error: "Case ID is required" });
          }
          break;
          
          
            
        case "POST /student/create_message":
         
          break;

        case "GET /student/notes":
            if (event.queryStringParameters && event.queryStringParameters.case_id) {
              const case_id = event.queryStringParameters.case_id;
              try {
                const caseData = await sqlConnection`
                  SELECT student_notes FROM "cases" WHERE case_id = ${case_id};
                `;
            
                if (caseData.length > 0) {
                  response.body = JSON.stringify(caseData[0]); // Return the case data
                } else {
                  response.statusCode = 404;
                  response.body = JSON.stringify({ error: "Case not found" });
                }
              } catch (err) {
                response.statusCode = 500;
                console.log(err);
                response.body = JSON.stringify({ error: "Internal server error" });
              }
            } else {
              response.statusCode = 400;
              response.body = JSON.stringify({ error: "Case ID is required" });
            }
          break;

        case "PUT /student/update_notes":
          if (
            event.queryStringParameters != null &&
            event.queryStringParameters.case_id 
        ) {
            const { case_id } = event.queryStringParameters;
            
            const {notes} = JSON.parse(event.body || "{}");

            try {
              // Update the patient details in the patients table
              await sqlConnection`
                  UPDATE "cases"
                  SET 
                      student_notes = ${notes}
                  WHERE case_id = ${case_id}; 
              `;
              response.statusCode = 200;
              response.body = JSON.stringify({
                  message: "Notes Updated Successfully",
              });
          } catch (err) {
              response.statusCode = 500;
              console.error(err);
              response.body = JSON.stringify({
                  error: "Internal server error",
              });
          }
        }

        case "DELETE /student/delete_case":
          console.log(event);
          if (
            event.queryStringParameters != null &&
            event.queryStringParameters.case_id
        ) {
            const caseId = event.queryStringParameters.case_id;
    
            try {
                // Delete the patient from the patients table
                await sqlConnection`
                    DELETE FROM "cases"
                    WHERE case_id = ${caseId};
                `;
    
                response.statusCode = 200;
                response.body = JSON.stringify({
                    message: "Case deleted successfully",
                });
            } catch (err) {
                response.statusCode = 500;
                console.error(err);
                response.body = JSON.stringify({ error: "Internal server error" });
            }
        } else {
            response.statusCode = 400;
            response.body = JSON.stringify({ error: "case_id is required" });
        }
        break;

        case "PUT /student/edit_case":
          if (
            event.queryStringParameters != null &&
            event.queryStringParameters.case_id &&
            event.queryStringParameters.cognito_id
        ) {
            const { case_id, cognito_id } = event.queryStringParameters;
            const { case_title, case_type, case_description, status , law_type} = JSON.parse(event.body || "{}");
            try {
                // Update the patient details in the patients table
                await sqlConnection`
                    UPDATE "cases"
                    SET 
                        case_title = ${case_title},
                        case_type = ${case_type},
                        case_description = ${case_description},
                        status = ${status},
                        law_type = ${law_type} 
                    WHERE case_id = ${case_id}; 
                `;
                response.statusCode = 200;
                response.body = JSON.stringify({
                    message: "Case Updated Successfully",
                });
            } catch (err) {
                response.statusCode = 500;
                console.error(err);
                response.body = JSON.stringify({
                    error: "Internal server error",
                });
            }
        }
         
        break;


        case "PUT /student/update_notes":
          if (
            event.queryStringParameters != null &&
            event.queryStringParameters.case_id 
        ) {
            const { case_id } = event.queryStringParameters;
            
            const {notes} = JSON.parse(event.body || "{}");

            try {
              // Update the patient details in the patients table
              await sqlConnection`
                  UPDATE "cases"
                  SET 
                      case_title = ${case_title},
                      case_type = ${case_type},
                      case_description = ${case_description},
                      status = ${status},
                      law_type = ${law_type} 
                  WHERE case_id = ${case_id}; 
              `;
              response.statusCode = 200;
              response.body = JSON.stringify({
                  message: "Case Updated Successfully",
              });
          } catch (err) {
              response.statusCode = 500;
              console.error(err);
              response.body = JSON.stringify({
                  error: "Internal server error",
              });
          }
      }

        break;


        case "POST /student/create_ai_message":
         
        break;
      default:
        throw new Error(`Unsupported route: "${pathData}"`);
    }
  } catch (error) {
    response.statusCode = 400;
    console.log(error);
    response.body = JSON.stringify(error.message);
  }
  console.log(response);

  return response;
};
