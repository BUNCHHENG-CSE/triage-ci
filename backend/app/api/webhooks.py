import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Header, Request, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.schema import TriageRequest
from app.core.triage_engine import triage_engine

logger = logging.getLogger("triageci.webhooks")
router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])

@router.post("/github")
async def handle_github_webhook(
    request: Request,
    x_github_event: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Receives GitHub Actions Webhook (e.g. workflow_run, check_run).
    Triggers automated failure triage on pipeline failure.
    """
    payload = await request.json()
    event_type = x_github_event or payload.get("event_type", "workflow_run")
    
    # Check if this is a failed workflow run or check run
    conclusion = payload.get("workflow_run", {}).get("conclusion") or payload.get("check_run", {}).get("conclusion")
    status = payload.get("workflow_run", {}).get("status") or payload.get("check_run", {}).get("status")

    repo_info = payload.get("repository", {})
    repo_name = repo_info.get("full_name", "acme-corp/api")
    
    workflow_run = payload.get("workflow_run", {})
    branch = workflow_run.get("head_branch", "main")
    commit_sha = workflow_run.get("head_sha", "HEAD")
    author = workflow_run.get("actor", {}).get("login", "engineer")
    workflow_name = workflow_run.get("name", "CI Workflow")

    # In mock or direct webhook payloads, raw_log may be passed directly or simulated
    raw_log = payload.get("raw_log")
    if not raw_log:
        # Default realistic failure simulation for webhook testing
        raw_log = f"""2026-10-17T08:00:00.000Z ##[group]Run npm test
2026-10-17T08:00:05.000Z FAIL src/api/auth.test.ts
2026-10-17T08:00:05.100Z   ● Auth API › should authenticate valid session
2026-10-17T08:00:05.200Z     AssertionError: assert 401 == 200
2026-10-17T08:00:06.000Z ##[error]Process completed with exit code 1.
"""

    triage_req = TriageRequest(
        raw_log=raw_log,
        provider="github_actions",
        repo_name=repo_name,
        branch=branch,
        commit_sha=commit_sha,
        commit_author=author,
        workflow_name=workflow_name,
        job_name="build-and-test"
    )

    result = await triage_engine.triage_log(triage_req, db)

    return {
        "status": "triaged",
        "triage_id": result.id,
        "repo": repo_name,
        "failing_step": result.exact_failing_step,
        "action_type": result.action_type,
        "root_cause": result.root_cause_summary,
        "cluster_occurrences": result.cluster_occurrence_count
    }


@router.post("/gitlab")
async def handle_gitlab_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Receives GitLab CI Pipeline Hook.
    """
    payload = await request.json()
    object_attrs = payload.get("object_attributes", {})
    pipeline_status = object_attrs.get("status")
    
    project = payload.get("project", {})
    repo_name = project.get("path_with_namespace", "gitlab-org/project")
    branch = object_attrs.get("ref", "main")
    commit_sha = object_attrs.get("sha", "HEAD")
    author = payload.get("user", {}).get("username", "developer")

    raw_log = payload.get("raw_log") or """$ cargo test
error[E0382]: use of moved value: `db_conn`
  --> src/main.rs:24:12
error: could not compile `app`
Command failed with exit code 101
"""

    triage_req = TriageRequest(
        raw_log=raw_log,
        provider="gitlab_ci",
        repo_name=repo_name,
        branch=branch,
        commit_sha=commit_sha,
        commit_author=author,
        workflow_name="GitLab Pipeline",
        job_name="test-stage"
    )

    result = await triage_engine.triage_log(triage_req, db)
    return {
        "status": "triaged",
        "triage_id": result.id,
        "repo": repo_name,
        "root_cause": result.root_cause_summary
    }
