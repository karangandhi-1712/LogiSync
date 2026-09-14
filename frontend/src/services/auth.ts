import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from 'amazon-cognito-identity-js';
import { cognitoConfig, isDemoMode } from '../config/aws';
import type { AuthUser } from '../types';

let userPool: CognitoUserPool | null = null;

function getPool(): CognitoUserPool {
  if (!userPool && !isDemoMode) {
    userPool = new CognitoUserPool({
      UserPoolId: cognitoConfig.userPoolId,
      ClientId:   cognitoConfig.clientId,
    });
  }
  return userPool!;
}

export async function cognitoLogin(email: string, password: string): Promise<AuthUser> {
  return new Promise((resolve, reject) => {
    const pool = getPool();
    const user = new CognitoUser({ Username: email, Pool: pool });
    const authDetails = new AuthenticationDetails({ Username: email, Password: password });

    user.authenticateUser(authDetails, {
      onSuccess(result) {
        const payload = result.getIdToken().decodePayload();
        const groups: string[] = payload['cognito:groups'] || [];
        resolve({
          sub:    payload['sub'],
          email:  payload['email'],
          name:   payload['name'] || email.split('@')[0],
          role:   (groups[0] as AuthUser['role']) || 'dispatcher',
          groups,
        });
      },
      onFailure(err) {
        reject(new Error(err.message || 'Authentication failed'));
      },
    });
  });
}

export async function cognitoSignup(
  email: string,
  password: string,
  name: string,
  role: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const pool = getPool();
    const attrs = [
      new CognitoUserAttribute({ Name: 'email', Value: email }),
      new CognitoUserAttribute({ Name: 'name', Value: name }),
      new CognitoUserAttribute({ Name: 'custom:role', Value: role }),
    ];
    pool.signUp(email, password, attrs, [], (err) => {
      if (err) reject(new Error(err.message));
      else resolve();
    });
  });
}

export function cognitoLogout(): void {
  if (isDemoMode) return;
  try {
    const pool = getPool();
    const user = pool.getCurrentUser();
    user?.signOut();
  } catch {
    // silent
  }
}

export function getCognitoToken(): string | null {
  if (isDemoMode) return 'demo-token';
  try {
    const pool = getPool();
    const user = pool.getCurrentUser();
    if (!user) return null;
    let token: string | null = null;
    user.getSession((_: unknown, session: { getIdToken: () => { getJwtToken: () => string } }) => {
      token = session?.getIdToken().getJwtToken() || null;
    });
    return token;
  } catch {
    return null;
  }
}
