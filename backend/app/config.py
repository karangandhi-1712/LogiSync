from functools import lru_cache
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional


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
    # NOTE: frontend is Leaflet + Geoapify only (free tier); this key is only
    # used by the optional server-side maps proxy fallback.
    GOOGLE_MAPS_SERVER_API_KEY: str = ""
    GOOGLE_MAPS_API_KEY: str = ""

    # Geoapify routing (server-side road geometry for /maps/route).
    # Falls back to VITE_GEOAPIFY_API_KEY from the shared root .env.
    GEOAPIFY_API_KEY: str = ""
    VITE_GEOAPIFY_API_KEY: str = ""

    # AWS General
    AWS_REGION: str = "ap-south-1"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""

    # AWS Cognito
    COGNITO_USER_POOL_ID: str = ""
    COGNITO_APP_CLIENT_ID: str = ""
    COGNITO_CLIENT_ID: str = ""
    COGNITO_REGION: str = "ap-south-1"
    # Demo-first: when True, accept demo-token bypass even if pool vars are set
    # (e.g. placeholder ap-south-1_XXXXXXXXX in .env).
    DEMO_MODE: bool = False

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

    # Backwards-compat env aliases present in .env.example but previously ignored
    # (extra="ignore" silently dropped them).
    CORS_ORIGINS: Optional[str] = None
    GOOGLE_MAPS_DIRECTIONS_KEY: str = ""
    GOOGLE_MAPS_GEOCODING_KEY: str = ""
    SNS_TOPIC_ARN_ALERTS: str = ""
    SNS_TOPIC_ARN_DISPATCH: str = ""

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @staticmethod
    def _is_placeholder(value: str) -> bool:
        v = (value or "").upper()
        return ("YOUR_" in v) or ("XXXX" in v) or ("EXAMPLE" in v) or v.strip() == ""

    @model_validator(mode="after")
    def _apply_env_aliases(self):
        # CORS_ORIGINS="https://a.com,https://b.com" merges into ALLOWED_ORIGINS
        if self.CORS_ORIGINS:
            extra = [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]
            merged = list(dict.fromkeys([*self.ALLOWED_ORIGINS, *extra]))
            self.ALLOWED_ORIGINS = merged
        # Google server key fallbacks
        if not self.GOOGLE_MAPS_SERVER_API_KEY:
            self.GOOGLE_MAPS_SERVER_API_KEY = (
                self.GOOGLE_MAPS_API_KEY
                or self.GOOGLE_MAPS_DIRECTIONS_KEY
                or self.GOOGLE_MAPS_GEOCODING_KEY
            )
        # Cognito client id alias
        if not self.COGNITO_APP_CLIENT_ID and self.COGNITO_CLIENT_ID:
            self.COGNITO_APP_CLIENT_ID = self.COGNITO_CLIENT_ID
        # SNS topic ARN aliases
        if not self.SNS_TOPIC_ALERTS and self.SNS_TOPIC_ARN_ALERTS:
            self.SNS_TOPIC_ALERTS = self.SNS_TOPIC_ARN_ALERTS
        if not self.SNS_TOPIC_REROUTE and self.SNS_TOPIC_ARN_DISPATCH:
            self.SNS_TOPIC_REROUTE = self.SNS_TOPIC_ARN_DISPATCH
        # SQLite dev default + Postgres prod: normalize async driver URL for sync engine
        if self.DATABASE_URL.startswith("sqlite+aiosqlite:"):
            self.DATABASE_URL = self.DATABASE_URL.replace("sqlite+aiosqlite:", "sqlite:", 1)
        # Placeholder API keys (YOUR_.../XXXX...) mean "not configured" -> simulate
        if self._is_placeholder(self.GOOGLE_MAPS_SERVER_API_KEY):
            self.GOOGLE_MAPS_SERVER_API_KEY = ""
        if not self.GEOAPIFY_API_KEY and not self._is_placeholder(self.VITE_GEOAPIFY_API_KEY):
            self.GEOAPIFY_API_KEY = self.VITE_GEOAPIFY_API_KEY
        if self._is_placeholder(self.GEOAPIFY_API_KEY):
            self.GEOAPIFY_API_KEY = ""
        return self

    @property
    def is_demo_mode(self) -> bool:
        pool = (self.COGNITO_USER_POOL_ID or "").strip()
        placeholder = (not pool) or ("XXXX" in pool) or ("EXAMPLE" in pool.upper())
        return bool(self.DEMO_MODE) or placeholder


@lru_cache()
def get_settings() -> Settings:
    return Settings()
