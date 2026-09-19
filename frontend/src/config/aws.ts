// ─── AWS Cognito Configuration ────────────────────────────────────────────
// All values come from environment variables (set by user in .env file)
// Format: VITE_COGNITO_* prefix required for Vite to expose to browser

export const cognitoConfig = {
  region:       import.meta.env.VITE_COGNITO_REGION       || 'ap-south-1',
  userPoolId:   import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
  clientId:     import.meta.env.VITE_COGNITO_CLIENT_ID    || '',
};

function isPlaceholder(value: string): boolean {
  return !value || value.startsWith('YOUR_') || /^([A-Za-z0-9])\1+$/.test(value);
}

export const isDemoMode =
  isPlaceholder(cognitoConfig.userPoolId) || isPlaceholder(cognitoConfig.clientId);
