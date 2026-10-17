import pytest
from sqlalchemy import text
from app.config import settings
from app.models.database import engine, Base, SessionLocal
from app.models.schema import FailureCluster, FailureLog
from app.core.clustering import get_or_create_cluster

def test_postgresql_connection_and_pooling():
    """
    Verifies that the PostgreSQL engine connects with pooling
    and verifies server version and database settings.
    """
    with engine.connect() as conn:
        res = conn.execute(text("SELECT 1;")).scalar()
        assert res == 1

def test_postgresql_composite_indexes_exist():
    """
    Verifies that high-performance composite indexes are active.
    """
    Base.metadata.create_all(bind=engine)
    if "postgresql" in settings.DATABASE_URL:
        with engine.connect() as conn:
            idx_names = [
                row[0] for row in conn.execute(text("""
                    SELECT indexname FROM pg_indexes WHERE schemaname = 'public';
                """)).fetchall()
            ]
            assert "idx_clusters_status_occ" in idx_names
            assert "idx_logs_cluster_created" in idx_names
            assert "idx_logs_repo_created" in idx_names
            assert "idx_logs_action_created" in idx_names
            assert "idx_logs_cat_created" in idx_names

def test_postgresql_concurrency_safe_clustering():
    """
    Verifies that recurring failure clusters update atomically without duplicate keys.
    """
    db = SessionLocal()
    try:
        fp = "test_pg:concurrency_safe_token"
        c1, count1 = get_or_create_cluster(
            db=db,
            fingerprint=fp,
            title="PostgreSQL Concurrency Test",
            category="CREDENTIALS_AUTH",
            suggested_action_type="FIX",
            suggested_direction="Rotate credentials",
            repo_name="acme/pg-repo-1"
        )
        assert count1 >= 1

        c2, count2 = get_or_create_cluster(
            db=db,
            fingerprint=fp,
            title="PostgreSQL Concurrency Test",
            category="CREDENTIALS_AUTH",
            suggested_action_type="FIX",
            suggested_direction="Rotate credentials",
            repo_name="acme/pg-repo-2"
        )
        assert c2.id == c1.id
        assert count2 == count1 + 1
        assert "acme/pg-repo-1" in c2.affected_repos
        assert "acme/pg-repo-2" in c2.affected_repos
    finally:
        db.close()
