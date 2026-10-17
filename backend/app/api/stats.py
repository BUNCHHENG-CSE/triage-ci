from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.database import get_db
from app.models.schema import FailureLog, FailureCluster

router = APIRouter(prefix="/api/stats", tags=["Dashboard Statistics"])

@router.get("")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Returns high-level analytics, cluster metrics, and ROI figures.
    """
    total_triaged = db.query(func.count(FailureLog.id)).scalar() or 0
    total_clusters = db.query(func.count(FailureCluster.id)).scalar() or 0
    
    # Action type breakdown
    rerun_count = db.query(func.count(FailureLog.id)).filter(FailureLog.action_type == "RERUN").scalar() or 0
    fix_count = db.query(func.count(FailureLog.id)).filter(FailureLog.action_type == "FIX").scalar() or 0
    
    # Top recurring cluster
    top_cluster = db.query(FailureCluster).order_by(FailureCluster.occurrence_count.desc()).first()
    
    # Category distribution
    categories = (
        db.query(FailureLog.root_cause_category, func.count(FailureLog.id))
        .group_by(FailureLog.root_cause_category)
        .all()
    )
    category_counts = {cat: count for cat, count in categories}

    # ROI metrics: 18 minutes saved per failure triage on average
    mins_saved = total_triaged * 18
    hours_saved = round(mins_saved / 60.0, 1)
    dollars_saved = round(hours_saved * 80.0, 2)  # @ $80/hr engineer cost

    return {
        "total_triaged": total_triaged,
        "total_clusters": total_clusters,
        "rerun_count": rerun_count,
        "fix_count": fix_count,
        "top_cluster": {
            "id": top_cluster.id,
            "title": top_cluster.title,
            "category": top_cluster.category,
            "occurrences": top_cluster.occurrence_count
        } if top_cluster else None,
        "category_breakdown": category_counts,
        "hours_saved_total": hours_saved,
        "dollars_saved_total": dollars_saved,
        "roi_pricing_model": {
            "starter_repo_price_monthly": 29,
            "pro_team_price_monthly": 99,
            "scale_team_price_monthly": 199
        }
    }
