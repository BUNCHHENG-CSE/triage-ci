from datetime import datetime, timezone
from typing import Tuple, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.schema import FailureCluster

def get_or_create_cluster(
    db: Session,
    fingerprint: str,
    title: str,
    category: str,
    suggested_action_type: str,
    suggested_direction: str,
    repo_name: str
) -> Tuple[FailureCluster, int]:
    """
    Finds or creates a failure cluster for recurring error tracking.
    Uses row-level locking (with_for_update) on PostgreSQL to prevent concurrency races.
    Returns (cluster, occurrence_count).
    """
    bind = db.get_bind()
    is_sqlite = bind and bind.dialect.name == "sqlite"

    # Query with row lock on PostgreSQL to guarantee thread/process concurrency safety
    query = db.query(FailureCluster).filter(FailureCluster.fingerprint == fingerprint)
    if not is_sqlite:
        query = query.with_for_update()

    cluster = query.first()
    
    if cluster:
        cluster.occurrence_count += 1
        cluster.last_seen = datetime.now(timezone.utc)
        current_repos = list(cluster.affected_repos or [])
        if repo_name and repo_name not in current_repos:
            current_repos.append(repo_name)
            cluster.affected_repos = current_repos
        db.commit()
        db.refresh(cluster)
        return cluster, cluster.occurrence_count
    else:
        now = datetime.now(timezone.utc)
        new_cluster = FailureCluster(
            fingerprint=fingerprint,
            title=title,
            category=category,
            suggested_action_type=suggested_action_type,
            suggested_direction=suggested_direction,
            occurrence_count=1,
            first_seen=now,
            last_seen=now,
            status="ACTIVE",
            affected_repos=[repo_name] if repo_name else []
        )
        try:
            db.add(new_cluster)
            db.commit()
            db.refresh(new_cluster)
            return new_cluster, 1
        except IntegrityError:
            # Concurrent worker created the cluster in between: rollback and update existing
            db.rollback()
            return get_or_create_cluster(
                db=db,
                fingerprint=fingerprint,
                title=title,
                category=category,
                suggested_action_type=suggested_action_type,
                suggested_direction=suggested_direction,
                repo_name=repo_name
            )
