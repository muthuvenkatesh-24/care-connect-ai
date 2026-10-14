import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy.engine import URL

load_dotenv(Path(__file__).resolve().parents[3] / ".env")


class Settings:
    """Environment-backed settings with development-friendly defaults."""

    api_host: str = os.getenv("API_HOST", "127.0.0.1")
    api_port: int = int(os.getenv("API_PORT", "8000"))
    mysql_host: str = os.getenv("MYSQL_HOST", "127.0.0.1")
    mysql_port: int = int(os.getenv("MYSQL_PORT", "3306"))
    mysql_database: str = os.getenv("MYSQL_DATABASE", "care_connect")
    mysql_user: str = os.getenv("MYSQL_USER", "care_connect")
    mysql_password: str = os.getenv("MYSQL_PASSWORD", "")
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "")
    access_token_minutes: int = int(os.getenv("ACCESS_TOKEN_MINUTES", "15"))
    app_env: str = os.getenv("APP_ENV", "development")
    # Public origin of the frontend, used to build Health Passport QR links (opaque codes only).
    public_app_origin: str = os.getenv("PUBLIC_APP_ORIGIN", "http://localhost:5173")

    @property
    def database_url(self) -> URL:
        return URL.create(
            "mysql+pymysql",
            username=self.mysql_user,
            password=self.mysql_password,
            host=self.mysql_host,
            port=self.mysql_port,
            database=self.mysql_database,
            query={"charset": "utf8mb4"},
        )


settings = Settings()
