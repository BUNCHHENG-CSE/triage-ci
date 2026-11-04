import os
import socket
import subprocess
from pathlib import Path
from typing import List
from pydantic import BaseModel

def _get_project_root() -> Path:
    """
    Returns the root directory of the TriageCI project.
    config.py is located at backend/app/config.py
    """
    return Path(__file__).resolve().parent.parent.parent

def _resolve_postgres_host(default_host: str = "localhost", port: int = 5434) -> str:
    """
    Intelligently resolves PostgreSQL host for WSL Docker or local development.
    Tries localhost, 127.0.0.1, and the WSL2 virtual interface IP.
    """
    for host in (default_host, "127.0.0.1", "localhost"):
        try:
            with socket.create_connection((host, port), timeout=0.3):
                return host
        except Exception:
            pass
            
    if os.name == "nt":
        try:
            out = subprocess.check_output(
                ["wsl", "-d", "RockyLinux-10.1", "ip", "-4", "addr", "show", "eth0"],
                text=True,
                timeout=0.8
            )
            for line in out.splitlines():
                if "inet " in line:
                    ip = line.split()[1].split("/")[0]
                    with socket.create_connection((ip, port), timeout=0.3):
                        return ip
        except Exception:
            pass

    return default_host

def _get_database_url() -> str:
    url = os.getenv("DATABASE_URL", "").strip()
    project_root = _get_project_root()
    
    # 1. Normalize SQLite file: protocol (used by Prisma or .env)
    if url.startswith("file:"):
        path_str = url[5:]
        p = Path(path_str)
        if not p.is_absolute():
            target = (project_root / p.name).resolve().as_posix()
        else:
            target = p.resolve().as_posix()
        return f"sqlite:///{target}"

    # 2. Normalize SQLite sqlite:/// protocol (ensuring consistent project root path)
    if url.startswith("sqlite:"):
        prefix = "sqlite:///"
        if url.startswith(prefix):
            raw_path = url[len(prefix):]
            p = Path(raw_path)
            # Check if relative path (not absolute and not Windows drive letter like C:)
            if not p.is_absolute() and not (len(raw_path) > 1 and raw_path[1] == ':'):
                target = (project_root / p.name).resolve().as_posix()
                return f"sqlite:///{target}"
        return url

    # 3. PostgreSQL driver normalization
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    elif url:
        return url

    # 4. If POSTGRES_USER is explicitly provided in env, configure for PostgreSQL
    if os.getenv("POSTGRES_USER"):
        port = int(os.getenv("POSTGRES_PORT", "5434"))
        user = os.getenv("POSTGRES_USER", "triageci")
        password = os.getenv("POSTGRES_PASSWORD", "triageci_secure_pass")
        db_name = os.getenv("POSTGRES_DB", "triageci")
        host = _resolve_postgres_host("localhost", port)
        return f"postgresql+psycopg://{user}:{password}@{host}:{port}/{db_name}"

    # 5. Default zero-config fallback: local SQLite at project root
    default_db = (project_root / "triageci.db").resolve().as_posix()
    return f"sqlite:///{default_db}"

class Settings(BaseModel):
    APP_NAME: str = "TCT TriageCI"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
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
