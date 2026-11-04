import pytest
from sqlalchemy import text
from app.config import settings
from app.models.database import engine, SessionLocal, init_db
from app.models.schema import FailureCluster, FailureLog
from app.core.clustering import get_or_create_cluster

def test_sqlite_engine_connection_and_wal():
    """
    Verifies that SQLite engine connects successfully and
    executes queries with WAL journal mode enabled for high concurrency.
    """
    assert "sqlite" in settings.DATABASE_URL
    with engine.connect() as conn:
        res = conn.execute(text("SELECT 1;")).scalar()
        assert res == 1

        journal_mode = conn.execute(text("PRAGMA journal_mode;")).scalar()
        assert journal_mode.lower() in ("wal", "memory")

def test_sqlite_schema_and_tables():
    """
    Verifies that all required tables exist in the SQLite database.
    """
    init_db()
    with engine.connect() as conn:
        tables = [row[0] for row in conn.execute(text("SELECT name FROM sqlite_master WHERE type='table';")).fetchall()]
        assert "failure_clusters" in tables
        assert "failure_logs" in tables

def test_sqlite_relational_crud():
    """
    Verifies relational CRUD (FailureCluster -> FailureLog) in SQLite.
    """
    init_db()
    db = SessionLocal()
    try:
        test_fp = "sqlite:test_fingerprint_unique"
        # 1. Create or get cluster
        cluster, count = get_or_create_cluster(
            db=db,
            fingerprint=test_fp,
            title="SQLite Relational Verification",
            category="INFRA_ENVIRONMENT",
            suggested_action_type="FIX",
            suggested_direction="Ensure local SQLite operates properly",
            repo_name="acme/sqlite-test"
        )
        assert cluster.id is not None
        assert count >= 1

        # 2. Add failure log associated with cluster
        log = FailureLog(
            provider="github_actions",
            repo_name="acme/sqlite-test",
            branch="main",
            commit_sha="sql1234",
            commit_author="sqlite-dev",
            exact_failing_step="pytest",
            root_cause_category="INFRA_ENVIRONMENT",
            root_cause_summary="SQLite relational test execution.",
            action_type="FIX",
            suggested_direction="Verify SQLite relations.",
            confidence_score=0.95,
            fingerprint=test_fp,
            extracted_excerpt="[ 1] All tests passing on SQLite",
            total_raw_lines=50,
            cluster_id=cluster.id
        )
        db.add(log)
        db.commit()
        db.refresh(log)

        assert log.id is not None
        assert log.cluster_id == cluster.id

        # 3. Query relation
        queried = db.query(FailureLog).filter(FailureLog.id == log.id).first()
        assert queried.cluster.fingerprint == test_fp
        assert "acme/sqlite-test" in queried.cluster.affected_repos
    finally:
        db.close()
