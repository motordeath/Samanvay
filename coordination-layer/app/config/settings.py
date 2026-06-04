from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    backend_api_url: str
    redis_url: str
    websocket_port: int = 8001
    api_port: int = 8000
    frontend_url: str
    node_env: str = "development"
    
    # Times in seconds for backend client
    backend_connect_timeout: float = 5.0
    backend_read_timeout: float = 15.0
    backend_retry_count: int = 2

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
