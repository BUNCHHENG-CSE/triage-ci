import os
from pydantic import BaseModel
from typing import List

class Settings(BaseModel):
    APP_NAME: str = "TriageCI"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./triageci.db")
    
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
