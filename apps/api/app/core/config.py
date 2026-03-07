from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Growth Launchpad API"
    app_env: str = "development"
    web_app_url: str = "http://localhost:3000"

    # Auth mode:
    # - dev: local fallback user + scopes
    # - auth0: strict JWT verification via AUTH0_ISSUER/AUTH0_AUDIENCE
    auth_mode: str = "dev"
    app_jwt_namespace: str = Field(default="https://growthlaunchpad.app")
    auth0_issuer: str | None = None
    auth0_audience: str | None = None

    supabase_db_url: str = Field(default="postgresql+psycopg://postgres:postgres@localhost:5432/postgres")

    resend_api_key: str | None = None
    resend_from_email: str = "noreply@growthlaunchpad.app"

    # Backboard agent orchestration
    backboard_api_key: str | None = None
    backboard_base_url: str = "https://app.backboard.io/api"
    backboard_llm_provider: str = "openai"
    backboard_model_name: str = "gpt-4o"
    backboard_memory_mode: str = "On"


@lru_cache
def get_settings() -> Settings:
    return Settings()
