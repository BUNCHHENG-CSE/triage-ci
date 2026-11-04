from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.database import get_db
from app.models.schema import FailureLog, FailureCluster

router = APIRouter(prefix="/api/stats", tags=["Dashboard Statistics"])

@router.get("")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Returns high-level analytics, cluster metrics, CI health index, and ROI figures.
    """
    total_triaged = db.query(func.count(FailureLog.id)).scalar() or 0
    total_clusters = db.query(func.count(FailureCluster.id)).scalar() or 0
    
    # Action type breakdown
    rerun_count = db.query(func.count(FailureLog.id)).filter(FailureLog.action_type == "RERUN").scalar() or 0
    fix_count = db.query(func.count(FailureLog.id)).filter(FailureLog.action_type == "FIX").scalar() or 0
    total_actions = rerun_count + fix_count
    
    # Flakiness Index (% of pipeline failures that are transient reruns)
    flakiness_index = round((rerun_count / max(1, total_actions)) * 100, 1)

    # Top recurring clusters
    top_clusters = (
        db.query(FailureCluster)
        .order_by(FailureCluster.occurrence_count.desc())
        .limit(5)
        .all()
    )
    top_cluster = top_clusters[0] if top_clusters else None
    
    # Category distribution
    categories = (
        db.query(FailureLog.root_cause_category, func.count(FailureLog.id))
        .group_by(FailureLog.root_cause_category)
        .all()
    )
    category_counts = {cat: count for cat, count in categories}

    # Provider breakdown
    providers = (
        db.query(FailureLog.provider, func.count(FailureLog.id))
        .group_by(FailureLog.provider)
        .all()
    )
    provider_counts = {prov: count for prov, count in providers}

    # ROI metrics:
    # 1. Developer context-switch saved: 18 minutes saved per failure triage on average
    mins_saved = total_triaged * 18
    hours_saved = round(mins_saved / 60.0, 1)
    dollars_saved = round(hours_saved * 80.0, 2)  # @ $80/hr engineer cost

    # 2. CI Runner cost & compute time saved:
    # Knowing a failure is "FIX REQUIRED" prevents engineers from blindly clicking "Rerun Job".
    # Each avoided futile rerun saves ~20 minutes of CI runner capacity ($0.008/min runner cost).
    runner_minutes_saved = fix_count * 20
    runner_hours_saved = round(runner_minutes_saved / 60.0, 1)
    runner_cloud_spend_saved = round(runner_minutes_saved * 0.008, 2)

    return {
        "total_triaged": total_triaged,
        "total_clusters": total_clusters,
        "rerun_count": rerun_count,
        "fix_count": fix_count,
        "flakiness_index": flakiness_index,
        "runner_hours_saved": runner_hours_saved,
        "runner_cloud_spend_saved": runner_cloud_spend_saved,
        "top_cluster": {
            "id": top_cluster.id,
            "title": top_cluster.title,
            "category": top_cluster.category,
            "occurrences": top_cluster.occurrence_count
        } if top_cluster else None,
        "top_culprits": [
            {
                "id": c.id,
                "title": c.title,
                "category": c.category,
                "occurrences": c.occurrence_count,
                "action_type": c.suggested_action_type,
                "status": c.status,
                "affected_repos": c.affected_repos or []
            }
            for c in top_clusters
        ],
        "category_breakdown": category_counts,
        "provider_breakdown": provider_counts,
        "hours_saved_total": hours_saved,
        "dollars_saved_total": dollars_saved,
        "roi_pricing_model": {
            "starter_repo_price_monthly": 29,
            "pro_team_price_monthly": 99,
            "scale_team_price_monthly": 199
        }
    }
