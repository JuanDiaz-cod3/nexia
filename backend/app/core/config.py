from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str

    # JWT: valores por defecto solo como respaldo si el .env no los trae;
    # en la practica siempre vienen de ahi.
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15

    # Origen permitido para CORS: el frontend en desarrollo.
    frontend_url: str = "http://localhost:5173"


settings = Settings()
