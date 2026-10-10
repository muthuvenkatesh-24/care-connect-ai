import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Environment-backed settings with development-friendly defaults."""

    app_env: str = os.getenv("APP_ENV", "development")
    api_host: str = os.getenv("API_HOST", "127.0.0.1")
    api_port: int = int(os.getenv("API_PORT", "8000"))
    mysql_host: str = os.getenv("MYSQL_HOST", "127.0.0.1")
    mysql_port: int = int(os.getenv("MYSQL_PORT", "3306"))
    mysql_database: str = os.getenv("MYSQL_DATABASE", "care_connect")
    mysql_user: str = os.getenv("MYSQL_USER", "care_connect")
    mysql_password: str = os.getenv("MYSQL_PASSWORD", "")


settings = Settings()
