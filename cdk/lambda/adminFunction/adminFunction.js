const { initializeConnection } = require("./libadmin.js");

let { SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT, MESSAGE_LIMIT } = process.env;

// SQL conneciton from global variable at libadmin.js
let sqlConnectionTableCreator = global.sqlConnectionTableCreator;

exports.handler = async (event) => {
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
  if (!sqlConnectionTableCreator) {
    await initializeConnection(SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT);
    sqlConnectionTableCreator = global.sqlConnectionTableCreator;
  }

  // Function to format student full names (lowercase and spaces replaced with "_")
  const formatNames = (name) => {
    return name.toLowerCase().replace(/\s+/g, "_");
  };

  let data;
  try {
    const pathData = event.httpMethod + " " + event.resource;
    switch (pathData) {
      case "GET /admin/instructors":
        try {
          // SQL query to fetch all users who are instructors
          const instructors = await sqlConnectionTableCreator`
            SELECT user_email, first_name, last_name, user_id
            FROM "users"
            WHERE 'instructor' = ANY(roles)
            ORDER BY last_name ASC;
          `;
        
          response.body = JSON.stringify(instructors);
        } catch (err) {
          console.error("Database error:", err);
          response.statusCode = 500;
          response.body = JSON.stringify({ error: "Failed to fetch instructors" });
        }
        break;
        case "POST /admin/assign_instructor_to_student":
          // Check if the body contains the instructor and student IDs
          if (event.body) {
            try {
              const { instructor_id, student_id } = JSON.parse(event.body);  // Parse the request body to access the JSON data
              
              if (!instructor_id || !student_id) {
                response.statusCode = 400;
                response.body = JSON.stringify({ error: "Both instructor_id and student_id are required" });
                break;
              }
        
              // Perform the database insertion
              const assignment = await sqlConnectionTableCreator`
                INSERT INTO "instructor_students" (instructor_id, student_id)
                VALUES ( ${instructor_id}, ${student_id});
              `;
              
              response.statusCode = 200;
              response.body = JSON.stringify({
                message: "Instructor enrolled and student linked successfully.",
              });
        
            } catch (err) {
              response.statusCode = 500;
              console.error(err);
              response.body = JSON.stringify({ error: "Internal server error" });
            }
          } else {
            response.statusCode = 400;
            response.body = JSON.stringify({ error: "Request body is missing" });
          }
          break;        
          case "GET /admin/students":
            try {
              // SQL query to fetch all users who are instructors
              const students = await sqlConnectionTableCreator`
                SELECT user_email, first_name, last_name, user_id
                FROM "users"
                WHERE 'student' = ANY(roles)
                ORDER BY last_name ASC;
              `;
            
              response.body = JSON.stringify(students);
            } catch (err) {
              console.error("Database error:", err);
              response.statusCode = 500;
              response.body = JSON.stringify({ error: "Failed to fetch students" });
            }
            break;
      case "GET /admin/prompt":
        // SQL query to fetch ALL past prompts
        const system_prompts = await sqlConnectionTableCreator`
            SELECT prompt, time_created
            FROM "system_prompt"
            ORDER BY time_created DESC;
          `;

        response.body = JSON.stringify(system_prompts);
        break;

      case "GET /admin/message_limit":
        try {
          console.log("Message limit name:", process.env.MESSAGE_LIMIT);
          const { SSMClient, GetParameterCommand } = await import("@aws-sdk/client-ssm");
      
          const ssm = new SSMClient();
      
          console.log("Fetching admin message limit from SSM...");
          const result = await ssm.send(
            new GetParameterCommand({ Name: process.env.MESSAGE_LIMIT })
          );
      
          console.log("✅ Admin message limit fetched:", result.Parameter.Value);
      
          response.statusCode = 200;
          response.body = JSON.stringify({ value: result.Parameter.Value });
        } catch (err) {
          console.error("❌ Failed to fetch message limit:", err);
          response.statusCode = 500;
          response.body = JSON.stringify({ error: "Internal server error" });
        }
        break;
      case "GET /admin/instructorStudents":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.instructor_id
        ) {
          const { instructor_id } = event.queryStringParameters;

          // SQL query to fetch all students for a given instructor
          const student_ids = await sqlConnectionTableCreator`
              SELECT u.user_id, u.first_name, u.last_name, u.user_email
  FROM instructor_students AS ist
  JOIN users AS u
  ON ist.student_id = u.user_id
  WHERE ist.instructor_id = ${instructor_id};
            `;

          response.body = JSON.stringify(student_ids);
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({
            error: "instructor_email is required",
          });
        }
        break;
      case "POST /admin/elevate_instructor":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.email
        ) {
          const instructorEmail = event.queryStringParameters.email;

          try {
            // Check if the user exists
            const existingUser = await sqlConnectionTableCreator`
                          SELECT * FROM "users"
                          WHERE user_email = ${instructorEmail};
                      `;

            if (existingUser.length > 0) {
              const userRoles = existingUser[0].roles;

              // Check if the role is already 'instructor' or 'admin'
              if (
                userRoles.includes("instructor") ||
                userRoles.includes("admin")
              ) {
                response.statusCode = 200;
                response.body = JSON.stringify({
                  message:
                    "No changes made. User is already an instructor or admin.",
                });
                break;
              }

              // If the role is 'student', elevate to 'instructor'
              if (userRoles.includes("student")) {
                const newRoles = userRoles.map((role) =>
                  role === "student" ? "instructor" : role
                );

                await sqlConnectionTableCreator`
                                UPDATE "users"
                                SET roles = ${newRoles}
                                WHERE user_email = ${instructorEmail};
                            `;

                response.statusCode = 200;
                response.body = JSON.stringify({
                  message: "User role updated to instructor.",
                });
                break;
              }
            } else {
              // Create a new user with the role 'instructor'
              await sqlConnectionTableCreator`
                              INSERT INTO "users" (user_email, roles)
                              VALUES (${instructorEmail}, ARRAY['instructor']);
                          `;

              response.statusCode = 201;
              response.body = JSON.stringify({
                message: "New user created and elevated to instructor.",
              });
            }
          } catch (err) {
            response.statusCode = 500;
            console.error(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "Email is required" });
        }
        break;
      case "POST /admin/lower_instructor":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.email
        ) {
          try {
            const userEmail = event.queryStringParameters.email;

            // Fetch the roles for the user
            const userRoleData = await sqlConnectionTableCreator`
                    SELECT roles, user_id
                    FROM "users"
                    WHERE user_email = ${userEmail};
                  `;

            const userRoles = userRoleData[0]?.roles;
            const userId = userRoleData[0]?.user_id;

            if (!userRoles || !userRoles.includes("instructor")) {
              response.statusCode = 400;
              response.body = JSON.stringify({
                error: "User is not an instructor or doesn't exist",
              });
              break;
            }

            // Replace 'instructor' with 'student'
            const updatedRoles = userRoles
              .filter((role) => role !== "instructor")
              .concat("student");

            // Update the roles in the database
            await sqlConnectionTableCreator`
                    UPDATE "users"
                    SET roles = ${updatedRoles}
                    WHERE user_email = ${userEmail};
                  `;

            // Delete all enrolments where the enrolment type is instructor
            await sqlConnectionTableCreator`
                    DELETE FROM "enrolments"
                    WHERE user_id = ${userId} AND enrolment_type = 'instructor';
                  `;

            response.statusCode = 200;
            response.body = JSON.stringify({
              message: `User role updated to student for ${userEmail} and all instructor enrolments deleted.`,
            });
          } catch (err) {
            console.log(err);
            response.statusCode = 500;
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({
            error: "email query parameter is missing",
          });
        }
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
