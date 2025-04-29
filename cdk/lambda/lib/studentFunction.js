// const { v4: uuidv4 } = require('uuid')
const { initializeConnection } = require("./lib.js");
let { SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT, USER_POOL, BUCKET, MESSAGE_LIMIT } = process.env;
const {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

const crypto = require("crypto");


function hashUUID(uuid) {
  const hash = crypto.createHash("sha256").update(uuid).digest();
  return hash.slice(0, 4).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 6);
}

// SQL conneciton from global variable at lib.js
let sqlConnection = global.sqlConnection;

exports.handler = async (event) => {
  console.log(event);
  const cognito_id =  event.requestContext?.authorizer?.userId ||  event.queryStringParameters?.user_id ||  null;
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

        case "GET /student/get_summaries":
        if (
          event.queryStringParameters &&
          event.queryStringParameters.case_id
        ) {
          const case_id = event.queryStringParameters.case_id;
          try {
            const data = await sqlConnection`
            SELECT * 
            FROM "summaries" WHERE case_id = ${case_id};
          `;
  
          // Check if data is empty and handle the case
          if (data.length === 0) {
            response.body = JSON.stringify({ message: "No summaries generated yet" });
          } else {
            response.statusCode = 200; // OK
            response.body = JSON.stringify(data); // Ensure the data is always valid JSON
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


      case "POST /student/case":
          console.log(event);
          console.log("Received event:", JSON.stringify(event, null, 2));
          const cognito_id = event.queryStringParameters.user_id;
          const { case_title, case_type, jurisdiction, case_description, province, statute} = JSON.parse(event.body || "{}");
          
          const user = await sqlConnection`
            SELECT user_id FROM "users" WHERE cognito_id = ${cognito_id};
          `;

          console.log("user_id:", user[0]?.user_id);

          try {
            // SQL query to insert the new case
            const newCase = await sqlConnection`
              INSERT INTO "cases" (user_id, case_title, case_type, jurisdiction, case_description, status, last_updated, province, statute)
              VALUES (${user[0]?.user_id}, ${case_title}, ${case_type}, ${jurisdiction}, ${case_description}, 'In Progress', CURRENT_TIMESTAMP, ${province}, ${statute})
              RETURNING case_id;
            `;

            const caseId = newCase[0].case_id;

            // Generate a SHA-256 hash of the case_id
            const caseHash = hashUUID(caseId.toString());

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
        // } else {
        //   response.statusCode = 400;
        //   response.body = JSON.stringify({ error: "Case data is required" });
        // }
      break;

      case "GET /student/message_limit":
        if (event.queryStringParameters && event.queryStringParameters.user_id) {
            try {
              console.log("Message limit name: ", MESSAGE_LIMIT);
              const { SSMClient, GetParameterCommand } = await import("@aws-sdk/client-ssm");

              const ssm = new SSMClient();

              console.log("Fetching message limit from SSM parameter store...");

              const result = await ssm.send(
                new GetParameterCommand({ Name: MESSAGE_LIMIT })
              );

              console.log("Message limit fetched successfully:", result.Parameter.Value);

              response.statusCode = 200;
              response.body = JSON.stringify({ value: result.Parameter.Value });
            } catch (err) {
              console.error("Failed to fetch message limit:", err);
              response.statusCode = 500;
              response.body = JSON.stringify({ error: "Internal server error" });
            }
          } else {
            response.statusCode = 400;
            response.body = JSON.stringify({ error: "User ID is required" });
          }           
            break;

      case "GET /student/get_cases":
  if (event.queryStringParameters && event.queryStringParameters.user_id) {
    const cognito_id = event.queryStringParameters.user_id;

    try {
      // Retrieve the user ID using the cognito_id
      const user = await sqlConnection`
        SELECT user_id FROM "users" where cognito_id = ${cognito_id};
      `;

      const user_id = user[0]?.user_id;

      if (user_id) {
        const data = await sqlConnection`
          SELECT * 
          FROM "cases" WHERE user_id = ${user_id};
        `;

        // Check if data is empty and handle the case
        if (data.length === 0) {
          response.statusCode = 404; // Not Found
          response.body = JSON.stringify({ message: "No cases found" });
        } else {
          response.statusCode = 200; // OK
          response.body = JSON.stringify(data); // Ensure the data is always valid JSON
        }
      } else {
        response.statusCode = 404; // Not Found
        response.body = JSON.stringify({ error: "User not found" });
      }
    } catch (err) {
      response.statusCode = 500; // Internal server error
      console.error(err);
      response.body = JSON.stringify({ error: "Internal server error" });
    }
  } else {
    response.statusCode = 400; // Bad Request
    response.body = JSON.stringify({ error: "Invalid value" });
  }
  break;

  case "GET /student/get_transcriptions":
  if (event.queryStringParameters && event.queryStringParameters.user_id) {
    const cognito_id = event.queryStringParameters.user_id;

    try {
      // Retrieve the user ID using the cognito_id
      const user = await sqlConnection`
        SELECT user_id FROM "users" where cognito_id = ${cognito_id};
      `;

      const user_id = user[0]?.user_id;

      if (user_id) {
        const data = await sqlConnection`
          SELECT * 
          FROM "audio_files" WHERE user_id = ${user_id};
        `;

        // Check if data is empty and handle the case
        if (data.length === 0) {
          response.statusCode = 404; // Not Found
          response.body = JSON.stringify({ message: "No cases found" });
        } else {
          response.statusCode = 200; // OK
          response.body = JSON.stringify(data); // Ensure the data is always valid JSON
        }
      } else {
        response.statusCode = 404; // Not Found
        response.body = JSON.stringify({ error: "User not found" });
      }
    } catch (err) {
      response.statusCode = 500; // Internal server error
      console.error(err);
      response.body = JSON.stringify({ error: "Internal server error" });
    }
  } else {
    response.statusCode = 400; // Bad Request
    response.body = JSON.stringify({ error: "Invalid value" });
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
              // Retrieve messages for the case_id
              const messages = await sqlConnection`
              SELECT m.*, u.first_name, u.last_name
              FROM "messages" m
              LEFT JOIN "users" u ON m.instructor_id = u.user_id
              WHERE m.case_id = ${case_id};
              `;

              const summaries = await sqlConnection`
                SELECT * FROM "summaries" WHERE case_id = ${case_id};
              `;

              // Combine case data and messages
              const combinedData = {
                caseData: caseData[0],
                messages: messages,
                summaries: summaries
              };
              response.body = JSON.stringify(combinedData);
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

        case "GET /student/notifications":
          if (event.queryStringParameters && event.queryStringParameters.user_id) {
            const cognito_id = event.queryStringParameters.user_id;
        
            try {
              // Retrieve the user ID using the cognito_id
              const user = await sqlConnection`
                SELECT user_id FROM "users" where cognito_id = ${cognito_id};
              `;
        
              const user_id = user[0]?.user_id;
        
              if (user_id) {
                const data = await sqlConnection`
                  SELECT 
                  c.case_id,
                  c.case_title,
                  m.message_content,
                  m.time_sent,
                  u.first_name||' '||u.last_name AS instructor_name
                  FROM cases c
                  JOIN messages m ON c.case_id = m.case_id
                  JOIN users u ON m.instructor_id = u.user_id
                  WHERE c.user_id = ${user_id}
                  AND m.time_sent >= NOW() - INTERVAL '1 week'
                  AND m.is_read = false
                  ORDER BY m.time_sent DESC;
                `;
        
                // Check if data is empty and handle the case
                if (data.length === 0) {
                  response.statusCode = 404; // Not Found
                  response.body = JSON.stringify({ message: "No notifications found" });
                } else {
                  response.statusCode = 200; // OK
                  response.body = JSON.stringify(data); // Ensure the data is always valid JSON
                }
              } else {
                response.statusCode = 404; // Not Found
                response.body = JSON.stringify({ error: "User not found" });
              }
            } catch (err) {
              response.statusCode = 500; // Internal server error
              console.error(err);
              response.body = JSON.stringify({ error: "Internal server error" });
            }
          } else {
            response.statusCode = 400; // Bad Request
            response.body = JSON.stringify({ error: "Invalid value" });
          }
          break;


          case "GET /student/disclaimer":
          if (event.queryStringParameters && event.queryStringParameters.user_id) {
            const cognito_id = event.queryStringParameters.user_id;
        
            try {
              // Retrieve the user ID using the cognito_id
              const user = await sqlConnection`
                SELECT user_id FROM "users" where cognito_id = ${cognito_id};
              `;
        
              const user_id = user[0]?.user_id;
        
              if (user_id) {
                const data = await sqlConnection`
                  SELECT accepted_disclaimer                  
                  FROM users
                  WHERE user_id = ${user_id};
                `;
        
                // Check if data is empty and handle the case
                if (data.length === 0) {
                  response.statusCode = 404; // Not Found
                  response.body = JSON.stringify({ message: "Couldn't check if disclaimer was accepted" });
                } else {
                  response.statusCode = 200; // OK
                  response.body = JSON.stringify(data); // Ensure the data is always valid JSON
                }
              } else {
                response.statusCode = 404; // Not Found
                response.body = JSON.stringify({ error: "User not found" });
              }
            } catch (err) {
              response.statusCode = 500; // Internal server error
              console.error(err);
              response.body = JSON.stringify({ error: "Internal server error" });
            }
          } else {
            response.statusCode = 400; // Bad Request
            response.body = JSON.stringify({ error: "Invalid value" });
          }
          break;
          
          case "POST /student/initialize_audio_file":
            if (event.queryStringParameters) {
              const { audio_file_id, s3_file_path, cognito_id, case_id } = event.queryStringParameters;}
          
              try {
                // Find user_id based on cognito_id
                const userResult = await sqlConnection`
                  SELECT user_id FROM "users" WHERE cognito_id = ${cognito_id};
                `;
          
                if (userResult.length === 0) {
                  response.statusCode = 404;
                  response.body = JSON.stringify({ error: "User not found" });
                  break;
                }
          
          
                // Insert into audio_files table
                const insertResult = await sqlConnection`
                  INSERT INTO "audio_files" (audio_file_id, case_id, s3_file_path)
                  VALUES (${audio_file_id}, ${case_id}, ${s3_file_path})
                  RETURNING *;
                `;
          
                response.statusCode = 200;
                response.body = JSON.stringify(insertResult[0]);
          
              } catch (err) {
                response.statusCode = 500;
                console.error(err);
              }
              break;


        case "GET /student/message_counter":
          if (event.queryStringParameters && event.queryStringParameters.user_id) {
            const user_id = event.queryStringParameters.user_id;
            try {
              const activityData = await sqlConnection`
                SELECT activity_counter, last_activity FROM "users" WHERE cognito_id = ${user_id};
              `;
              if (activityData.length > 0) {
                let activity_counter = parseInt(activityData[0].activity_counter, 10);
                const last_activity = activityData[0].last_activity;
                if (activity_counter > 0) {
                  const currentTime = new Date();
                  const lastActivityTime = new Date(last_activity);
                  const timeDifference = Math.abs(currentTime - lastActivityTime);
                  const hoursDifference = Math.floor(timeDifference / (1000 * 60 * 60));
                  
                  // Check if 24 hours have passed since the last activity
                  if (hoursDifference >= 24) {
                    await sqlConnection`
                      UPDATE "users" SET activity_counter = 0 WHERE cognito_id = ${user_id};
                    `;
                    
                    activity_counter = 0;
                  }
                  
                }
                response.body = JSON.stringify({ activity_counter });
              }
              else {
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
            response.body = JSON.stringify({ error: "User ID is required" });
          }
          break;


          case "PUT /student/message_counter":
            if (event.queryStringParameters && event.queryStringParameters.user_id) {
              const user_id = event.queryStringParameters.user_id;
              try {
                const activityData = await sqlConnection`
                  SELECT activity_counter, last_activity FROM "users" WHERE cognito_id = ${user_id};
                `;
          
                if (activityData.length > 0) {
                  let activity_counter = parseInt(activityData[0].activity_counter, 10);
                  const last_activity = new Date(activityData[0].last_activity);
                  const now = new Date();
                  const hoursSinceLast = (now - last_activity) / (1000 * 60 * 60);
          
                  if (hoursSinceLast >= 24) {
                    // Reset counter and last_activity
                    await sqlConnection`
                      UPDATE "users" SET activity_counter = 1, last_activity = CURRENT_TIMESTAMP WHERE cognito_id = ${user_id};
                    `;
                    activity_counter = 1;
                    // HARDCODED TO 10 RIGHT NOW, CHANGE TO BE FROM SECRETS MANAGER OR PARAM STORE
                  } else if (activity_counter < 10) {
                    // Increment counter
                    await sqlConnection`
                      UPDATE "users" SET activity_counter = activity_counter + 1 WHERE cognito_id = ${user_id};
                    `;
                    activity_counter += 1;
                  } else {
                    // Limit reached
                    response.statusCode = 429;
                    response.body = JSON.stringify({ error: "Daily message limit reached" });
                    break;
                  }
          
                  response.body = JSON.stringify({ activity_counter });
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
              response.body = JSON.stringify({ error: "User ID is required" });
            }
            break;

          case "PUT /student/read_message":
            if (event.queryStringParameters && event.queryStringParameters.message_id) {
              const message_id = event.queryStringParameters.message_id;
              try {
                // Mark the message as read
                await sqlConnection`
                  UPDATE messages SET is_read = true WHERE message_id = ${message_id};
                `;
          
                // Update case status only if current status is 'Review Feedback'
                await sqlConnection`
                  UPDATE cases
                  SET status = 'In Progress'
                  WHERE case_id = (
                    SELECT case_id FROM messages WHERE message_id = ${message_id}
                  )
                  AND status = 'Review Feedback';
                `;
          
                response.body = JSON.stringify({ success: true });
              } catch (err) {
                response.statusCode = 500;
                console.log(err);
                response.body = JSON.stringify({ error: "Internal server error" });
              }
            } else {
              response.statusCode = 400;
              response.body = JSON.stringify({ error: "Message ID is required" });
            }
            break;

            case "PUT /student/disclaimer":
            if (event.queryStringParameters && event.queryStringParameters.user_id) {
              const user_id = event.queryStringParameters.user_id;
              try {
                // Mark the disclaimer as accepted
                await sqlConnection`
                  UPDATE users SET accepted_disclaimer = true WHERE cognito_id = ${user_id};
                `;
          
                response.body = JSON.stringify({ success: true });
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
    
            case "GET /student/notifications":
              if (event.queryStringParameters && event.queryStringParameters.user_id) {
                const cognito_id = event.queryStringParameters.user_id;
            
                try {
                  // Retrieve the user ID using the cognito_id
                  const user = await sqlConnection`
                    SELECT user_id FROM "users" where cognito_id = ${cognito_id};
                  `;
            
                  const user_id = user[0]?.user_id;
            
                  if (user_id) {
                    const data = await sqlConnection`
                      SELECT 
                      c.case_id,
                      c.case_title,
                      m.message_content,
                      m.time_sent,
                      u.first_name||' '||u.last_name AS instructor_name
                      FROM cases c
                      JOIN messages m ON c.case_id = m.case_id
                      JOIN users u ON m.instructor_id = u.user_id
                      WHERE c.user_id = ${user_id}
                      AND m.time_sent >= NOW() - INTERVAL '1 week'
                      ORDER BY m.time_sent DESC;
                    `;
            
                    // Check if data is empty and handle the case
                    if (data.length === 0) {
                      response.statusCode = 404; // Not Found
                      response.body = JSON.stringify({ message: "No notifications found" });
                    } else {
                      response.statusCode = 200; // OK
                      response.body = JSON.stringify(data); // Ensure the data is always valid JSON
                    }
                  } else {
                    response.statusCode = 404; // Not Found
                    response.body = JSON.stringify({ error: "User not found" });
                  }
                } catch (err) {
                  response.statusCode = 500; // Internal server error
                  console.error(err);
                  response.body = JSON.stringify({ error: "Internal server error" });
                }
              } else {
                response.statusCode = 400; // Bad Request
                response.body = JSON.stringify({ error: "Invalid value" });
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

        case "PUT /student/notes":
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
        break;

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

        case "DELETE /student/delete_summary":
          console.log(event);
          if (
            event.queryStringParameters != null &&
            event.queryStringParameters.summary_id
        ) {
            const summaryId = event.queryStringParameters.summary_id;
    
            try {
                // Delete the patient from the patients table
                await sqlConnection`
                    DELETE FROM "summaries"
                    WHERE summary_id = ${summaryId};
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
            response.body = JSON.stringify({ error: "summary_id is required" });
        }
        break;


        case "PUT /student/edit_case":
          if (
            event.queryStringParameters != null &&
            event.queryStringParameters.case_id &&
            event.queryStringParameters.cognito_id
        ) {
            const { case_id, cognito_id } = event.queryStringParameters;
            const { case_title, case_type, case_description, status, jurisdiction, province, statute } = JSON.parse(event.body || "{}");
            try {
                // Update the patient details in the patients table
                await sqlConnection`
                    UPDATE "cases"
                    SET 
                        case_title = ${case_title},
                        case_type = ${case_type},
                        case_description = ${case_description},
                        status = ${status},
                        jurisdiction = ${jurisdiction} 
                        province = ${province},
                        statute = ${statute}
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

        case "PUT /student/review_case":
          if (
            event.queryStringParameters != null &&
            event.queryStringParameters.case_id &&
            event.queryStringParameters.cognito_id
        ) {
            const { case_id, cognito_id } = event.queryStringParameters;
            try {
                // Update the patient details in the patients table
                await sqlConnection`
                    UPDATE "cases"
                    SET 
                        sent_to_review = true,
                        status = 'Sent to Review'
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