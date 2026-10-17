from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.schema import FailureCluster, FailureLog, ClusterSummary

router = APIRouter(prefix="/api/clusters", tags=["Clusters"])

@router.get("", response_model=List[ClusterSummary])
def list_clusters(db: Session = Depends(get_db)):
    """
    Returns recurring failure clusters ordered by occurrence frequency.
    Highlights top issues (e.g. 'this same expired credential has caused 14 failures').
    """
    clusters = db.query(FailureCluster).order_by(FailureCluster.occurrence_count.desc()).all()
    
    return [
        ClusterSummary(
            id=c.id,
            fingerprint=c.fingerprint,
            title=c.title,
            category=c.category,
            suggested_action_type=c.suggested_action_type,
            suggested_direction=c.suggested_direction,
            occurrence_count=c.occurrence_count,
            first_seen=c.first_seen,
            last_seen=c.last_seen,
            status=c.status,
            affected_repos=c.affected_repos or []
        )
        for c in clusters
    ]

@router.post("/{cluster_id}/resolve")
def resolve_cluster(cluster_id: int, db: Session = Depends(get_db)):
    cluster = db.query(FailureCluster).filter(FailureCluster.id == cluster_id).first()
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    
    cluster.status = "RESOLVED" if cluster.status != "RESOLVED" else "ACTIVE"
    db.commit()
    db.refresh(cluster)
    return {"status": "success", "cluster_id": cluster.id, "new_status": cluster.status}
