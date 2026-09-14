from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "LogiSync v2.0 - Port Logistics Command Center"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False
    API_PREFIX: str = "/api"
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    # Database
    DATABASE_URL: str = "sqlite:///./logisync.db"

    # Google Maps API (Backend proxy key)
    GOOGLE_MAPS_SERVER_API_KEY: str = ""

    # AWS General
    AWS_REGION: str = "ap-south-1"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""

    # AWS Cognito
    COGNITO_USER_POOL_ID: str = ""
    COGNITO_APP_CLIENT_ID: str = ""
    COGNITO_REGION: str = "ap-south-1"

    # AWS SNS Topics
    SNS_TOPIC_ALERTS: str = ""
    SNS_TOPIC_REROUTE: str = ""
    SNS_TOPIC_CONGESTION: str = ""

    # AWS CloudWatch & S3
    CLOUDWATCH_NAMESPACE: str = "LogiSync/PortLogistics"
    S3_STATIC_BUCKET: str = "logisync-frontend-assets"
    S3_AUDIT_BUCKET: str = "logisync-audit-logs"

    # Security & Rate Limiting
    SECRET_KEY: str = "logisync-super-secret-production-signing-key-2026"
    ALGORITHM: str = "RS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    RATE_LIMIT_DEFAULT: str = "100/minute"
    RATE_LIMIT_AI: str = "20/minute"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
