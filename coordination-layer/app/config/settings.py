from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    backend_api_url: str = "http://localhost:3000"
    redis_url: str = "redis://localhost:6379"
    websocket_port: int = 8001
    api_port: int = 8000
    
    # Times in seconds for backend client
    backend_connect_timeout: float = 5.0
    backend_read_timeout: float = 15.0
    backend_retry_count: int = 2

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
