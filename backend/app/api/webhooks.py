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


@router.post("/jenkins")
async def handle_jenkins_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Receives Jenkins Pipeline Notification or Webhook Trigger.
    Parses build status and logs for failure attribution.
    """
    payload = await request.json()
    job_name = payload.get("name") or payload.get("job_name", "jenkins-build-job")
    build_info = payload.get("build", {})
    status = build_info.get("status") or payload.get("status", "FAILURE")
    
    # Parse git details if present
    scm = build_info.get("scm", {})
    repo_name = scm.get("url", "acme-corp/service").replace("https://github.com/", "").replace(".git", "")
    branch = scm.get("branch", "main").replace("origin/", "")
    commit_sha = scm.get("commit", "HEAD")[:7]

    raw_log = payload.get("raw_log") or build_info.get("log") or """[Pipeline] { (Build & Test)
[Pipeline] sh
+ ./gradlew test
> Task :test
java.lang.OutOfMemoryError: Java heap space
	at java.base/java.util.Arrays.copyOf(Arrays.java:3512)
> Task :test FAILED
[Pipeline] }
[Pipeline] ERROR: script returned exit code 1
Finished: FAILURE
"""

    triage_req = TriageRequest(
        raw_log=raw_log,
        provider="jenkins",
        repo_name=repo_name,
        branch=branch,
        commit_sha=commit_sha,
        commit_author=payload.get("author", "jenkins-worker"),
        workflow_name=job_name,
        job_name=job_name
    )

    result = await triage_engine.triage_log(triage_req, db)
    return {
        "status": "triaged",
        "triage_id": result.id,
        "provider": "jenkins",
        "repo": repo_name,
        "job": job_name,
        "failing_step": result.exact_failing_step,
        "action_type": result.action_type,
        "root_cause": result.root_cause_summary,
        "cluster_occurrences": result.cluster_occurrence_count
    }


@router.post("/generic")
async def handle_generic_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Generic webhook receiver for CircleCI, Bitbucket Pipelines, Buildkite,
    Argo Workflows, or custom runner scripts.
    """
    payload = await request.json()
    raw_log = payload.get("raw_log")
    if not raw_log:
        raw_log = payload.get("log") or payload.get("error_message") or "Process failed with exit code 1."

    provider = payload.get("provider", "custom_ci")
    repo_name = payload.get("repo_name") or payload.get("repository", "acme-corp/custom-app")
    branch = payload.get("branch", "main")
    commit_sha = payload.get("commit_sha", "HEAD")
    author = payload.get("commit_author") or payload.get("author", "engineer")
    job_name = payload.get("job_name") or payload.get("step_name", "pipeline-job")

    triage_req = TriageRequest(
        raw_log=raw_log,
        provider=provider,
        repo_name=repo_name,
        branch=branch,
        commit_sha=commit_sha,
        commit_author=author,
        workflow_name=payload.get("workflow_name", "Custom CI Runner"),
        job_name=job_name
    )

    result = await triage_engine.triage_log(triage_req, db)
    return {
        "status": "triaged",
        "triage_id": result.id,
        "provider": provider,
        "repo": repo_name,
        "action_type": result.action_type,
        "failing_step": result.exact_failing_step,
        "root_cause": result.root_cause_summary
    }


SIMULATION_SCENARIOS = {
    "aws_sts": {
        "title": "AWS STS Session Token Expired",
        "repo": "acme-corp/billing-service",
        "step": "Deploy to AWS ECS",
        "log": """2026-10-17T08:01:05.123Z ##[group]Run aws-actions/configure-aws-credentials@v4
2026-10-17T08:01:09.111Z Assuming role arn:aws:iam::123456789012:role/DeployRole
2026-10-17T08:01:10.222Z ##[endgroup]
2026-10-17T08:01:11.333Z ##[group]Run Deploy to AWS ECS Staging
2026-10-17T08:01:12.444Z > aws ecs update-service --cluster staging --service billing-api --force-new-deployment
2026-10-17T08:01:15.555Z An error occurred (ExpiredTokenException) when calling the UpdateService operation: The security token included in the request is expired
2026-10-17T08:01:16.666Z ##[error]Process completed with exit code 254."""
    },
    "jest_timeout": {
        "title": "Jest Async Timeout (Flaky)",
        "repo": "acme-corp/frontend-app",
        "step": "npm test",
        "log": """2026-10-17T11:00:01.000Z ##[group]Run npm test
2026-10-17T11:00:05.000Z PASS src/auth.test.ts
2026-10-17T11:00:12.000Z FAIL src/payments/stripe-webhook.test.ts
2026-10-17T11:00:12.100Z   ● Stripe Webhook › should process async invoice payload
2026-10-17T11:00:12.200Z     Timeout - Async callback was not invoked within the 5000 ms timeout specified by jest.setTimeout.
2026-10-17T11:00:15.000Z ##[error]Process completed with exit code 1."""
    },
    "npm_eresolve": {
        "title": "NPM Peer Dependency Conflict",
        "repo": "acme-corp/admin-portal",
        "step": "npm install",
        "log": """2026-10-17T09:12:00.100Z ##[group]Run npm install
2026-10-17T09:12:05.500Z npm ERR! code ERESOLVE
2026-10-17T09:12:05.501Z npm ERR! ERESOLVE unable to resolve dependency tree
2026-10-17T09:12:05.502Z npm ERR! While resolving: frontend-dashboard@1.0.0
2026-10-17T09:12:05.504Z npm ERR! Found: react@19.0.0
2026-10-17T09:12:05.508Z npm ERR! Could not resolve dependency:
2026-10-17T09:12:05.509Z npm ERR! peer react@"^18.0.0" from @legacy/table-grid@2.4.1
2026-10-17T09:12:06.600Z ##[error]Process completed with exit code 1."""
    },
    "exit_137": {
        "title": "Linux OOM Killer (Exit 137)",
        "repo": "acme-corp/ml-pipeline",
        "step": "python train_model.py",
        "log": """2026-10-17T14:00:10.000Z ##[group]Run model training
2026-10-17T14:02:15.000Z Loading dataset (40 GB)...
2026-10-17T14:03:40.000Z Allocating batch tensor memory...
2026-10-17T14:04:12.000Z /entrypoint.sh: line 14: 4210 Killed                 python train_model.py
2026-10-17T14:04:13.000Z ##[error]Process completed with exit code 137."""
    },
    "rust_borrow": {
        "title": "Rust Borrow Checker Error (E0382)",
        "repo": "acme-corp/crypto-engine",
        "step": "cargo test",
        "log": """$ cargo test
error[E0382]: use of moved value: `db_conn`
  --> src/main.rs:24:12
error: could not compile `crypto-engine`
Command failed with exit code 101"""
    }
}


@router.post("/simulate")
async def simulate_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Live Webhook Test Simulator:
    Trigger simulated failure webhooks from GitHub Actions, GitLab CI, Jenkins, or Generic runners.
    Instantly attribution-analyzed and persisted for immediate UI viewing!
    """
    body = await request.json()
    scenario_key = body.get("scenario", "aws_sts")
    provider = body.get("provider", "github_actions")
    
    scenario = SIMULATION_SCENARIOS.get(scenario_key, SIMULATION_SCENARIOS["aws_sts"])
    
    triage_req = TriageRequest(
        raw_log=scenario["log"],
        provider=provider,
        repo_name=scenario["repo"],
        branch=body.get("branch", "main"),
        commit_sha=body.get("commit_sha", "f7b10ac"),
        commit_author=body.get("commit_author", "alex.dev@acme.com"),
        workflow_name=f"CI Pipeline ({provider.capitalize()})",
        job_name=scenario["step"]
    )

    result = await triage_engine.triage_log(triage_req, db)
    return {
        "status": "simulation_successful",
        "scenario": scenario["title"],
        "provider": provider,
        "triage_id": result.id,
        "failing_step": result.exact_failing_step,
        "action_type": result.action_type,
        "root_cause": result.root_cause_summary,
        "confidence": result.confidence_score,
        "cluster_occurrences": result.cluster_occurrence_count,
        "remediation_commands": result.remediation_commands,
        "remediation_patch": result.remediation_patch
    }
