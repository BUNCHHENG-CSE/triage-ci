import logging
import time
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import QueuePool, NullPool
from app.config import settings

logger = logging.getLogger("triageci.database")

Base = declarative_base()

def create_optimized_engine(url: str):
    is_sqlite = url.startswith("sqlite")
    
    if is_sqlite:
        connect_args = {"check_same_thread": False}
        return create_engine(
            url,
            connect_args=connect_args,
            poolclass=NullPool,
            echo=False
        )
    else:
        # Production PostgreSQL Engine Configuration with QueuePool
        return create_engine(
            url,
            poolclass=QueuePool,
            pool_size=settings.DB_POOL_SIZE,
            max_overflow=settings.DB_MAX_OVERFLOW,
            pool_timeout=settings.DB_POOL_TIMEOUT,
            pool_recycle=settings.DB_POOL_RECYCLE,
            pool_pre_ping=settings.DB_POOL_PRE_PING,
            echo=False
        )

try:
    engine = create_optimized_engine(settings.DATABASE_URL)
except Exception as e:
    logger.warning(f"Could not connect to {settings.DATABASE_URL}: {e}. Falling back to SQLite.")
    engine = create_optimized_engine("sqlite:///./triageci.db")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db(max_retries: int = 5, retry_delay: float = 2.0):
    """
    Initializes database tables with connection retry logic.
    Ensures that if Docker PostgreSQL container is still completing its healthcheck,
    the application retries cleanly.
    """
    global engine, SessionLocal
    
    for attempt in range(1, max_retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            Base.metadata.create_all(bind=engine)
            logger.info("Database tables verified successfully.")
            return
        except Exception as e:
            if attempt < max_retries:
                logger.warning(f"Database connection attempt {attempt}/{max_retries} failed ({e}). Retrying in {retry_delay}s...")
                time.sleep(retry_delay)
            else:
                if not settings.DATABASE_URL.startswith("sqlite"):
                    logger.error(f"Failed to connect to PostgreSQL after {max_retries} attempts: {e}. Falling back to local SQLite.")
                    engine = create_optimized_engine("sqlite:///./triageci.db")
                    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
                    Base.metadata.create_all(bind=engine)
                else:
                    raise e
