import logging
import time
from sqlalchemy import create_engine, text, event
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import QueuePool, NullPool
from app.config import settings

logger = logging.getLogger("triageci.database")

Base = declarative_base()

def create_optimized_engine(url: str):
    is_sqlite = url.startswith("sqlite")
    
    if is_sqlite:
        connect_args = {"check_same_thread": False, "timeout": 30.0}
        eng = create_engine(
            url,
            connect_args=connect_args,
            poolclass=NullPool,
            echo=False
        )
        
        # Enable WAL mode and PRAGMA settings for high concurrency
        @event.listens_for(eng, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            try:
                cursor.execute("PRAGMA journal_mode=WAL")
                cursor.execute("PRAGMA synchronous=NORMAL")
            except Exception:
                pass
            finally:
                cursor.close()
                
        return eng
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
    Initializes database tables.
    For SQLite: tables are created immediately.
    For PostgreSQL: retries cleanly with connection polling while containers initialize.
    """
    global engine, SessionLocal
    is_sqlite = str(engine.url).startswith("sqlite")
    
    # 1. Immediate initialization for SQLite
    if is_sqlite:
        try:
            Base.metadata.create_all(bind=engine)
            # Lightweight schema migration for SQLite
            with engine.connect() as conn:
                res = conn.execute(text("PRAGMA table_info(failure_logs)"))
                cols = [row[1] for row in res.fetchall()]
                if cols:
                    if "remediation_commands" not in cols:
                        conn.execute(text("ALTER TABLE failure_logs ADD COLUMN remediation_commands TEXT DEFAULT '[]'"))
                    if "remediation_patch" not in cols:
                        conn.execute(text("ALTER TABLE failure_logs ADD COLUMN remediation_patch TEXT DEFAULT ''"))
                    conn.commit()
            logger.info("SQLite database tables verified successfully.")
            return
        except Exception as e:
            logger.error(f"Error initializing SQLite database: {e}")
            raise e

    # 2. Connection retry logic for PostgreSQL
    for attempt in range(1, max_retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            Base.metadata.create_all(bind=engine)
            
            # Ensure composite indexes exist even if tables were pre-created
            with engine.connect() as conn:
                for table in Base.metadata.tables.values():
                    for idx in table.indexes:
                        cols = ", ".join([c.name for c in idx.columns])
                        conn.execute(text(f"CREATE INDEX IF NOT EXISTS {idx.name} ON {table.name} ({cols});"))
                # Check column migrations for PostgreSQL
                conn.execute(text("ALTER TABLE failure_logs ADD COLUMN IF NOT EXISTS remediation_commands JSONB DEFAULT '[]';"))
                conn.execute(text("ALTER TABLE failure_logs ADD COLUMN IF NOT EXISTS remediation_patch TEXT;"))
                conn.commit()

            logger.info("PostgreSQL database tables and composite indexes verified successfully.")
            return
        except Exception as e:
            if attempt < max_retries:
                logger.warning(f"PostgreSQL connection attempt {attempt}/{max_retries} failed ({e}). Retrying in {retry_delay}s...")
                time.sleep(retry_delay)
            else:
                logger.error(f"Failed to connect to PostgreSQL after {max_retries} attempts: {e}. Falling back to local SQLite.")
                engine = create_optimized_engine("sqlite:///./triageci.db")
                SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
                Base.metadata.create_all(bind=engine)
