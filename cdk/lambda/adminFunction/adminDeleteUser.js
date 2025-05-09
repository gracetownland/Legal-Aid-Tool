import { CognitoIdentityProviderClient, AdminDeleteUserCommand } from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({ region: "your-region" });

export const deleteCognitoUser = async (username) => {
  const command = new AdminDeleteUserCommand({
    UserPoolId: "your-user-pool-id",
    Username: username,
  });

  try {
    await client.send(command);
    console.log("Cognito user deleted");
  } catch (error) {
    console.error("Failed to delete Cognito user:", error);
  }
};
