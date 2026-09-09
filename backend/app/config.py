from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg2://mmlp:mmlp@localhost:5432/mmlp"
    seed_on_startup: bool = True

    class Config:
        env_file = ".env"


settings = Settings()
