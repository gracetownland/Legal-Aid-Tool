import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";
import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";

// Gets current authorized user
export async function retrieveUser(setUser) {
  try {
    const returnedUser = await getCurrentUser();
    setUser(returnedUser);
    console.log("user", returnedUser);
  } catch (e) {
    console.log("error getting user: ", e);
  }
}

// Gets jwtToken for current session
export async function retrieveJwtToken(setJwtToken) {
  try {
    const session = await fetchAuthSession();
    const idToken = session.tokens.idToken;
    console.log(idToken);
    
    setJwtToken(idToken);

    // Check if the token is close to expiration
    if (session.credentials && session.credentials.expiration) {
      const expirationTime = session.credentials.expiration * 1000; // Milliseconds
      const currentTime = new Date().getTime();

      if (expirationTime - currentTime < 2700000) { // 45 minutes
        await fetchAuthSession();
        const newIdToken = (await fetchAuthSession()).tokens.idToken;
        setJwtToken(newIdToken);
      }
    }
  } catch (e) {
    console.log("error getting token: ", e);
  }
}

// get temp AWS credentials
export async function getIdentityCredentials(jwtToken, setCredentials) {
  const USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID;
  const IDENTITY_POOL_ID = import.meta.env.VITE_IDENTITY_POOL_ID;
  const REGION = import.meta.env.VITE_AWS_REGION;

  try {
    const credentialsProvider = fromCognitoIdentityPool({
      client: new CognitoIdentityClient({ region: REGION }),
      identityPoolId: IDENTITY_POOL_ID,
      logins: {
        [`cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`]: jwtToken,
      },
    });

    const credentials = await credentialsProvider();
    
    // The credentials object contains accessKeyId, secretAccessKey, and sessionToken
    setCredentials(credentials);
    console.log("Credentials retrieved successfully.");

  } catch (error) {
    console.error('Error getting identity credentials:', error);
  }
}