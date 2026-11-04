import time
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from app.models.database import get_db, engine
from app.models.schema import FailureCluster, FailureLog
from app.core.pattern_library import FAILURE_PATTERNS
from app.config import settings

router = APIRouter(prefix="/api/health", tags=["System Diagnostics"])

START_TIME = time.time()

@router.get("")
def get_system_health(db: Session = Depends(get_db)):
    """
    Returns live health diagnostics: database latency, pattern library count,
    dual-ORM status, and active triage capacity.
    """
    db_start = time.time()
    db_status = "connected"
    db_error = None
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = "error"
        db_error = str(e)
    db_latency_ms = round((time.time() - db_start) * 1000, 2)

    is_sqlite = str(engine.url).startswith("sqlite")
    db_type = "SQLite (WAL mode)" if is_sqlite else "PostgreSQL (Production Pool)"

    # Record counts
    total_logs = db.query(func.count(FailureLog.id)).scalar() or 0
    total_clusters = db.query(func.count(FailureCluster.id)).scalar() or 0

    uptime_sec = round(time.time() - START_TIME, 1)

    # LLM configuration status
    llm_status = "Offline Deterministic Expert Mode (Sub-ms Latency)"
    if settings.OPENAI_API_KEY:
        llm_status = "OpenAI GPT-4o-mini Enabled"
    elif settings.GEMINI_API_KEY:
        llm_status = "Google Gemini-1.5-Flash Enabled"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "service": settings.APP_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "uptime_seconds": uptime_sec,
        "database": {
            "type": db_type,
            "status": db_status,
            "latency_ms": db_latency_ms,
            "error": db_error
        },
        "engine": {
            "pattern_library_size": len(FAILURE_PATTERNS),
            "taxonomies_supported": 8,
            "llm_engine_status": llm_status,
            "total_triaged_logs": total_logs,
            "active_recurring_clusters": total_clusters
        }
    }
