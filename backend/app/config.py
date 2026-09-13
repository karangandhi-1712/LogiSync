from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg2://mmlp:mmlp@localhost:5432/mmlp"
    seed_on_startup: bool = True

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
