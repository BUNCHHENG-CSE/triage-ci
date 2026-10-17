import sys
print("Starting script...", flush=True)

import psycopg
print("Imported psycopg", flush=True)

from sqlalchemy import create_engine, text
print("Imported sqlalchemy", flush=True)

from app.config import settings
print(f"Config loaded: {settings.DATABASE_URL}", flush=True)

from app.models.database import engine, Base, init_db, SessionLocal
print("Database engine imported", flush=True)

# Test 1: Direct psycopg connection using settings.DATABASE_URL
print("Connecting via direct psycopg...", flush=True)
pg_url = settings.DATABASE_URL.replace("postgresql+psycopg://", "postgresql://")
with psycopg.connect(pg_url, connect_timeout=5) as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT version();")
        print("1. Direct Psycopg OK:", cur.fetchone()[0][:35], flush=True)

# Test 2: SQLAlchemy Engine connection
print("Connecting via SQLAlchemy Engine...", flush=True)
with engine.connect() as conn:
    res = conn.execute(text("SELECT current_database(), current_user;")).fetchone()
    print(f"2. SQLAlchemy Engine OK: DB={res[0]}, User={res[1]}", flush=True)

# Test 3: Table creation & index verification
print("Creating tables...", flush=True)
Base.metadata.create_all(bind=engine)
with engine.connect() as conn:
    indexes = conn.execute(text("""
        SELECT tablename, indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        ORDER BY tablename, indexname;
    """)).fetchall()
    print(f"3. Verified PostgreSQL Indexes ({len(indexes)} total):", flush=True)
    for table, idx in indexes:
        print(f"   - {table} -> {idx}", flush=True)

# Test 4: Concurrency-safe get_or_create_cluster
print("Testing cluster creation...", flush=True)
from app.core.clustering import get_or_create_cluster
db = SessionLocal()
cluster, count = get_or_create_cluster(
    db=db,
    fingerprint="test_pg:cluster_001",
    title="PostgreSQL Concurrency Test",
    category="CREDENTIALS_AUTH",
    suggested_action_type="FIX",
    suggested_direction="Check AWS STS credentials",
    repo_name="acme/pg-test"
)
print(f"4. Cluster created/updated: ID={cluster.id}, Occurrences={count}, Status={cluster.status}", flush=True)
db.close()
print("All PostgreSQL tests finished successfully!", flush=True)
