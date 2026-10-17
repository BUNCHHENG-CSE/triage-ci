from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.schema import TriageRequest, TriageResult, FailureLog
from app.core.triage_engine import triage_engine

router = APIRouter(prefix="/api/triage", tags=["Triage"])

@router.post("", response_model=TriageResult)
async def analyze_failure_log(
    request: TriageRequest,
    db: Session = Depends(get_db)
):
    """
    Submits a raw CI failure log to be normalized, noise-reduced,
    and attributed by the pattern-constrained triage engine.
    """
    if not request.raw_log or not request.raw_log.strip():
        raise HTTPException(status_code=400, detail="raw_log cannot be empty")
    
    result = await triage_engine.triage_log(request, db)
    return result


@router.get("/history", response_model=List[TriageResult])
def list_triage_history(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Returns recent failure triage reports.
    """
    logs = db.query(FailureLog).order_by(FailureLog.created_at.desc()).offset(offset).limit(limit).all()
    
    results = []
    for log in logs:
        # Reconstruct excerpt lines if needed
        excerpt_lines = []
        if log.extracted_excerpt:
            for line_str in log.extracted_excerpt.splitlines()[:30]:
                parts = line_str.split("]", 1)
                num = 1
                content = line_str
                if len(parts) == 2 and parts[0].startswith("["):
                    try:
                        num = int(parts[0].replace("[", "").strip())
                        content = parts[1].strip()
                    except ValueError:
                        pass
                excerpt_lines.append({"line_number": num, "content": content, "is_anchor": False})

        cluster_count = log.cluster.occurrence_count if log.cluster else 1

        results.append(TriageResult(
            id=log.id,
            provider=log.provider,
            repo_name=log.repo_name,
            branch=log.branch,
            commit_sha=log.commit_sha,
            commit_author=log.commit_author,
            pr_number=log.pr_number,
            workflow_name=log.workflow_name,
            job_name=log.job_name,
            exact_failing_step=log.exact_failing_step,
            root_cause_category=log.root_cause_category,
            root_cause_summary=log.root_cause_summary,
            action_type=log.action_type,
            suggested_direction=log.suggested_direction,
            confidence_score=log.confidence_score,
            fingerprint=log.fingerprint,
            extracted_excerpt=log.extracted_excerpt,
            excerpt_lines=excerpt_lines,
            total_raw_lines=log.total_raw_lines,
            reduction_percentage=round(max(0, log.total_raw_lines - len(excerpt_lines)) / max(1, log.total_raw_lines) * 100.0, 1),
            pr_comment_markdown=log.pr_comment_markdown or "",
            cluster_id=log.cluster_id,
            cluster_occurrence_count=cluster_count,
            created_at=log.created_at
        ))
    return results


@router.get("/{triage_id}", response_model=TriageResult)
def get_triage_detail(
    triage_id: int,
    db: Session = Depends(get_db)
):
    log = db.query(FailureLog).filter(FailureLog.id == triage_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Triage report not found")
        
    cluster_count = log.cluster.occurrence_count if log.cluster else 1
    
    return TriageResult(
        id=log.id,
        provider=log.provider,
        repo_name=log.repo_name,
        branch=log.branch,
        commit_sha=log.commit_sha,
        commit_author=log.commit_author,
        pr_number=log.pr_number,
        workflow_name=log.workflow_name,
        job_name=log.job_name,
        exact_failing_step=log.exact_failing_step,
        root_cause_category=log.root_cause_category,
        root_cause_summary=log.root_cause_summary,
        action_type=log.action_type,
        suggested_direction=log.suggested_direction,
        confidence_score=log.confidence_score,
        fingerprint=log.fingerprint,
        extracted_excerpt=log.extracted_excerpt,
        excerpt_lines=[],
        total_raw_lines=log.total_raw_lines,
        reduction_percentage=98.0,
        pr_comment_markdown=log.pr_comment_markdown or "",
        cluster_id=log.cluster_id,
        cluster_occurrence_count=cluster_count,
        created_at=log.created_at
    )
