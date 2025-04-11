const { initializeConnection } = require("./lib.js");
let { SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT, USER_POOL } = process.env;
const {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

let sqlConnection = global.sqlConnection;

exports.handler = async (event) => {
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
  const instructorEmail = queryStringParams.instructor_email;

  const isUnauthorized =
    (queryEmail && queryEmail !== userEmailAttribute) ||
    (instructorEmail && instructorEmail !== userEmailAttribute);

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

  function generateAccessCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 16; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code.match(/.{1,4}/g).join("-");
  }

  let data;
  try {
    const pathData = event.httpMethod + " " + event.resource;
    console.log("🌟 Lambda triggered");
console.log("RouteKey:", event.routeKey);
console.log("Path:", event.path);
console.log("Method:", event.httpMethod);
console.log("Query Params:", event.queryStringParameters);

    switch (pathData) {
      case "GET /instructor/students":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.cognito_id
        ) {
          const cognito_id = event.queryStringParameters.cognito_id;

          try {
            // First, get the user_id for the given email
            const userResult = await sqlConnection`
              SELECT user_id FROM "users" WHERE cognito_id = ${cognito_id};
            `;

            if (userResult.length === 0) {
              response.statusCode = 404;
              response.body = JSON.stringify({ error: "User not found" });
              break;
            }

            const userId = userResult[0].user_id;

            // Now, fetch the students for that user_id
            const data = await sqlConnection`
              SELECT student_id FROM "instructor_students" WHERE instructor_id = ${userId};
            `;

            response.statusCode = 200;
            response.body = JSON.stringify(data);
          } catch (err) {
            response.statusCode = 500;
            console.error(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "Invalid value" });
        }
        break;
      case "GET /instructor/cases_to_review":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.cognito_id
        ) {
          const cognito_id = event.queryStringParameters.cognito_id;

          try {
            // First, get the user ID using the email
            const userIdResult = await sqlConnection`
                SELECT user_id
                FROM "users"
                WHERE cognito_id = ${cognito_id};
              `;

            const userId = userIdResult[0]?.user_id;

            if (!userId) {
              response.statusCode = 404;
              response.body = JSON.stringify({ error: "Instructor not found" });
              break;
            }

            // Query to get all cases sent for review
            const data = await sqlConnection`
                SELECT *
                FROM cases
                WHERE sent_to_review = true;
              `;

            response.statusCode = 200;
            response.body = JSON.stringify(data);
          } catch (err) {
            response.statusCode = 500;
            console.error(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "email is required" });
        }
        break;
      case "PUT /instructor/send_feedback":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.case_id && 
          event.queryStringParameters.instructor_id && 
          event.body
      ) {
          const { case_id, instructor_id } = event.queryStringParameters;
          const { message_content } = JSON.parse(event.body);  

          // Retrieve the user ID using the user_id
          const user = await sqlConnection`
          SELECT * FROM "users" where cognito_id = ${instructor_id};
          `;

          console.log(user);
          const user_id = user[0]?.user_id;
  
          try {
              // Insert the message into the "messages" table
              await sqlConnection`
                  INSERT INTO "messages" (
                      message_id, 
                      instructor_id, 
                      message_content, 
                      case_id, 
                      time_sent
                  ) VALUES (
                      uuid_generate_v4(), 
                      ${user_id},
                      ${message_content}, 
                      ${case_id}, 
                      CURRENT_TIMESTAMP
                  );
              `;

              // Insert the message into the "messages" table
              await sqlConnection`
              UPDATE "cases"
              SET 
                sent_to_review = false,
                status = 'Review Feedback'
              WHERE case_id = ${case_id};
              `;
  
              response.statusCode = 200;
              response.body = JSON.stringify({
                  message: "Message sent successfully",
              });
          } catch (err) {
              response.statusCode = 500;
              console.error(err);
              response.body = JSON.stringify({
                  error: "Internal server error",
              });
          }
      } else {
          response.statusCode = 400;
          response.body = JSON.stringify({
              error: "case_id, instructor_id, and message_content are required",
          });
      }
        break;
      
      case "GET /instructor/view_students":
        case "GET /instructor/view_students":
  if (
    event.queryStringParameters != null &&
    event.queryStringParameters.cognito_id
  ) {
    const cognito_id = event.queryStringParameters.cognito_id;

    try {
      // Step 1: Get the instructor's user_id
      const userIdResult = await sqlConnection`
        SELECT user_id
        FROM "users"
        WHERE cognito_id = ${cognito_id};
      `;

      const instructorId = userIdResult[0]?.user_id;

      if (!instructorId) {
        response.statusCode = 404;
        response.body = JSON.stringify({ error: "Instructor not found" });
        break;
      }

      // Step 2: Get student_ids associated with the instructor
      const studentIdsResult = await sqlConnection`
        SELECT student_id
        FROM "instructor_students"
        WHERE instructor_id = ${instructorId};
      `;

      const studentIds = studentIdsResult.map(row => row.student_id);

      if (studentIds.length === 0) {
        response.statusCode = 200;
        response.body = JSON.stringify([]); // No students, return empty array
        break;
      }

      // Step 3: Get cases and student names
      const cases = await sqlConnection`
        SELECT 
  c.*, 
  u.first_name, 
  u.last_name 
FROM "cases" c
JOIN "users" u ON c.user_id = u.user_id
WHERE c.user_id = ANY(${studentIds});

      `;

      response.statusCode = 200;
      response.body = JSON.stringify(cases);
    } catch (err) {
      console.error(err);
      response.statusCode = 500;
      response.body = JSON.stringify({ error: "Internal server error" });
    }
  } else {
    response.statusCode = 400;
    response.body = JSON.stringify({ error: "cognito_id is required" });
  }
  break;

      case "DELETE /instructor/delete_student":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.simulation_group_id &&
          event.queryStringParameters.instructor_email &&
          event.queryStringParameters.user_email
        ) {
          const { simulation_group_id, instructor_email, user_email } =
            event.queryStringParameters;
    
          try {
            // Step 1: Get the user ID from the user email
            const userResult = await sqlConnection`
              SELECT user_id
              FROM "users"
              WHERE user_email = ${user_email}
              LIMIT 1;
            `;
    
            const userId = userResult[0]?.user_id;
    
            if (!userId) {
              response.statusCode = 404;
              response.body = JSON.stringify({
                error: "User not found",
              });
              break;
            }
    
            // Step 2: Delete the student from the simulation group enrolments
            const deleteResult = await sqlConnection`
              DELETE FROM "enrolments"
              WHERE simulation_group_id = ${simulation_group_id}
                AND user_id = ${userId}
                AND enrolment_type = 'student'
              RETURNING *;
            `;
    
            if (deleteResult.length > 0) {
              response.statusCode = 200;
              response.body = JSON.stringify(deleteResult[0]);
    
              // Step 3: Insert into User Engagement Log
              await sqlConnection`
                INSERT INTO "user_engagement_log" (
                  log_id, user_id, simulation_group_id, patient_id, enrolment_id, timestamp, engagement_type
                )
                VALUES (
                  uuid_generate_v4(), ${userId}, ${simulation_group_id}, null, null, 
                  CURRENT_TIMESTAMP, 'instructor_deleted_student'
                );
              `;
            } else {
              response.statusCode = 404;
              response.body = JSON.stringify({
                error: "Student not found in the simulation group",
              });
            }
          } catch (err) {
            response.statusCode = 500;
            console.error(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({
            error: "simulation_group_id, user_email, and instructor_email are required",
          });
        }
        break;
      default:
        throw new Error(`Unsupported route: "${pathData}"`);
    }
  } catch (error) {
    response.statusCode = 400;
    response.body = JSON.stringify(error.message);
  }
  console.log(response);

  return response;
};