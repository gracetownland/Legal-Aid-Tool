// const { v4: uuidv4 } = require('uuid')
const { initializeConnection } = require("./lib.js");
let { SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT, USER_POOL } = process.env;
const {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

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
              cognito_id
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
          
          const user_id = await sqlConnection`
            SELECT user_id FROM "users" WHERE cognito_id = ${cognito_id};
          `;

          try {
            // SQL query to insert the new case
            const newCase = await sqlConnection`
              INSERT INTO "cases" (user_id, case_title, case_type, law_type, case_description, system_prompt)
              VALUES (${user_id}, ${case_title}, ${case_title}, ARRAY[${case_type}], ${case_description}, ${system_prompt})
              RETURNING case_id;
            `;

            response.body = JSON.stringify({ case_id: newCase[0].case_id });
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
          const user_id = event.queryStringParameters.user_id;

          try {
            // Retrieve the user ID using the user_id
            const data = await sqlConnection`
              SELECT case_id, case_title, case_type, law_type, case_description 
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
              if (event.queryStringParameters && event.queryStringParameters.user_id) {
                const user_id = event.queryStringParameters.user_id;
                try {
                  const messages = await sqlConnection`
                    SELECT m.message_id, m.message_content, m.time_sent, c.case_title
                    FROM "messages" m
                    JOIN "cases" c ON m.case_id = c.case_id
                    WHERE m.user_id = ${user_id}
                    ORDER BY m.time_sent;
                  `;
            
                  response.body = JSON.stringify(messages);
                } catch (err) {
                  response.statusCode = 500;
                  console.log(err);
                  response.body = JSON.stringify({ error: "Internal server error" });
                }
              } else {
                response.statusCode = 400;
                response.body = JSON.stringify({ error: "User ID is required" });
              }
              break;
            
        case "POST /student/create_message":
         
          break;
        case "GET /student/case_page":
            if (event.queryStringParameters && event.queryStringParameters.case_id) {
              const case_id = event.queryStringParameters.case_id;
              try {
                const caseData = await sqlConnection`
                  SELECT * FROM "cases" WHERE case_id = ${case_id};
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
