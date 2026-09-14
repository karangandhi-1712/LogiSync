import boto3
from botocore.exceptions import ClientError
from typing import Dict, Any, Optional
from app.config import get_settings

settings = get_settings()


class CognitoService:
    def __init__(self):
        self.region = settings.COGNITO_REGION
        self.user_pool_id = settings.COGNITO_USER_POOL_ID
        self.client_id = settings.COGNITO_APP_CLIENT_ID

        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY and self.user_pool_id:
            self.client = boto3.client(
                "cognito-idp",
                region_name=self.region,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
            )
        else:
            self.client = None

    def sign_up(self, email: str, password: str, role: str = "dispatcher") -> Dict[str, Any]:
        """Registers a new user in AWS Cognito User Pool with custom role attribute."""
        if not self.client:
            return {
                "user_confirmed": True,
                "user_sub": f"mock-sub-{email.split('@')[0]}",
                "role": role,
                "message": "Demo mode: user registered locally."
            }

        try:
            resp = self.client.sign_up(
                ClientId=self.client_id,
                Username=email,
                Password=password,
                UserAttributes=[
                    {"Name": "email", "Value": email},
                    {"Name": "custom:role", "Value": role}
                ]
            )
            return {
                "user_confirmed": resp.get("UserConfirmed", False),
                "user_sub": resp.get("UserSub"),
                "role": role
            }
        except ClientError as e:
            return {"error": e.response["Error"]["Message"]}

    def initiate_auth(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticates user with AWS Cognito USER_PASSWORD_AUTH."""
        if not self.client:
            return {
                "access_token": "demo-jwt-access-token-vocport",
                "id_token": "demo-jwt-id-token",
                "refresh_token": "demo-jwt-refresh-token",
                "expires_in": 3600,
                "token_type": "Bearer",
                "user": {
                    "email": email,
                    "sub": "demo-user-123",
                    "role": "port_admin"
                }
            }

        try:
            resp = self.client.initiate_auth(
                ClientId=self.client_id,
                AuthFlow="USER_PASSWORD_AUTH",
                AuthParameters={"USERNAME": email, "PASSWORD": password}
            )
            auth_res = resp["AuthenticationResult"]
            return {
                "access_token": auth_res["AccessToken"],
                "id_token": auth_res["IdToken"],
                "refresh_token": auth_res.get("RefreshToken"),
                "expires_in": auth_res["ExpiresIn"],
                "token_type": auth_res["TokenType"]
            }
        except ClientError as e:
            return {"error": e.response["Error"]["Message"]}


cognito_service = CognitoService()
