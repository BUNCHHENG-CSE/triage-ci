import os
import socket
import subprocess
from typing import List
from pydantic import BaseModel

def _resolve_postgres_host(default_host: str = "localhost", port: int = 5434) -> str:
    """
    Intelligently resolves PostgreSQL host for WSL Docker or local development.
    Tries localhost, 127.0.0.1, and the WSL2 virtual interface IP.
    """
    # 1. Test localhost and 127.0.0.1 directly
    for host in (default_host, "127.0.0.1", "localhost"):
        try:
            with socket.create_connection((host, port), timeout=0.5):
                return host
        except Exception:
            pass
            
    # 2. Try WSL2 internal IP address if running on Windows with WSL
    if os.name == "nt":
        try:
            out = subprocess.check_output(
                ["wsl", "-d", "RockyLinux-10.1", "ip", "-4", "addr", "show", "eth0"],
                text=True,
                timeout=1.5
            )
            for line in out.splitlines():
                if "inet " in line:
                    ip = line.split()[1].split("/")[0]
                    with socket.create_connection((ip, port), timeout=0.5):
                        return ip
        except Exception:
            pass

    return default_host

def _get_database_url() -> str:
    url = os.getenv("DATABASE_URL", "")
    
    # If explicitly configured in environment, use it with driver normalization
    if url:
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url

    # Otherwise auto-configure for local WSL Docker PostgreSQL
    port = int(os.getenv("POSTGRES_PORT", "5434"))
    user = os.getenv("POSTGRES_USER", "triageci")
    password = os.getenv("POSTGRES_PASSWORD", "triageci_secure_pass")
    db_name = os.getenv("POSTGRES_DB", "triageci")
    
    host = _resolve_postgres_host("localhost", port)
    return f"postgresql+psycopg://{user}:{password}@{host}:{port}/{db_name}"

class Settings(BaseModel):
    APP_NAME: str = "TriageCI"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "production")
    
    # Database Settings
    DATABASE_URL: str = _get_database_url()
    DB_POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", "20"))
    DB_MAX_OVERFLOW: int = int(os.getenv("DB_MAX_OVERFLOW", "10"))
    DB_POOL_TIMEOUT: int = int(os.getenv("DB_POOL_TIMEOUT", "30"))
    DB_POOL_RECYCLE: int = int(os.getenv("DB_POOL_RECYCLE", "1800"))
    DB_POOL_PRE_PING: bool = os.getenv("DB_POOL_PRE_PING", "true").lower() in ("true", "1", "t")
    
    # LLM API Keys (optional; if not provided, high-accuracy constrained heuristic engine is used)
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    
    # GitHub Webhook Secret
    GITHUB_WEBHOOK_SECRET: str = os.getenv("GITHUB_WEBHOOK_SECRET", "triageci_webhook_secret_dev")
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]
    
    # Benchmark target
    BENCHMARK_TARGET_ACCURACY: float = 0.75  # 15/20 = 75% minimum to sell

settings = Settings()
