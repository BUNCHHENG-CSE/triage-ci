import json
import urllib.request
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.schema import FailureLog
from app.core.pr_commenter import format_slack_card

router = APIRouter(prefix="/api/notifications", tags=["Notifications & Sharing"])

class SlackDispatchRequest(BaseModel):
    webhook_url: str
    triage_id: Optional[int] = None
    repo_name: str
    job_name: str
    failing_step: str
    root_cause_summary: str
    action_type: str
    suggested_direction: str
    cluster_occurrences: int = 1

class DiscordDispatchRequest(BaseModel):
    webhook_url: str
    repo_name: str
    job_name: str
    failing_step: str
    root_cause_summary: str
    action_type: str
    suggested_direction: str
    cluster_occurrences: int = 1

@router.post("/slack")
async def dispatch_slack_alert(req: SlackDispatchRequest):
    """
    Sends an actionable Slack Card Block Kit payload to an Incoming Slack Webhook URL.
    """
    payload = format_slack_card(
        repo_name=req.repo_name,
        job_name=req.job_name,
        failing_step=req.failing_step,
        root_cause_summary=req.root_cause_summary,
        action_type=req.action_type,
        suggested_direction=req.suggested_direction,
        cluster_occurrences=req.cluster_occurrences
    )

    url = req.webhook_url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        raise HTTPException(status_code=400, detail="Invalid Slack Webhook URL. Must start with https://")

    # If it's a test or dummy webhook URL, return simulated success
    if "example.com" in url or "hooks.slack.com/services/DUMMY" in url:
        return {
            "status": "simulated_success",
            "message": "Slack payload validated successfully (simulated webhook URL).",
            "payload_preview": payload
        }

    try:
        req_data = json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(
            url,
            data=req_data,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(request, timeout=5) as response:
            resp_body = response.read().decode("utf-8")
            return {
                "status": "delivered",
                "message": "Slack notification successfully delivered to channel.",
                "response": resp_body
            }
    except Exception as e:
        return {
            "status": "dispatch_error",
            "error": str(e),
            "payload_preview": payload
        }


@router.post("/discord")
async def dispatch_discord_alert(req: DiscordDispatchRequest):
    """
    Sends a rich Discord embed card to an Incoming Discord Webhook URL.
    """
    url = req.webhook_url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        raise HTTPException(status_code=400, detail="Invalid Discord Webhook URL.")

    color = 0x10b981 if req.action_type == "RERUN" else 0xef4444

    discord_payload = {
        "username": "TriageCI Bot",
        "avatar_url": "https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/terminal.svg",
        "embeds": [
            {
                "title": f"🔴 CI/CD Failure Attribution: {req.repo_name} / {req.job_name}",
                "color": color,
                "fields": [
                    {"name": "Action Required", "value": f"`{req.action_type}`", "inline": True},
                    {"name": "Failing Step", "value": f"`{req.failing_step}`", "inline": True},
                    {"name": "Recurring Count", "value": f"{req.cluster_occurrences}x", "inline": True},
                    {"name": "Root Cause", "value": req.root_cause_summary, "inline": False},
                    {"name": "Suggested Fix", "value": req.suggested_direction, "inline": False}
                ],
                "footer": {"text": "TriageCI Diagnostic Engine • Zero Pipeline Editing"}
            }
        ]
    }

    if "discord.com/api/webhooks/dummy" in url or "example.com" in url:
        return {
            "status": "simulated_success",
            "message": "Discord payload validated successfully (simulated webhook URL).",
            "payload_preview": discord_payload
        }

    try:
        req_data = json.dumps(discord_payload).encode("utf-8")
        request = urllib.request.Request(
            url,
            data=req_data,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(request, timeout=5) as response:
            return {
                "status": "delivered",
                "message": "Discord alert delivered successfully."
            }
    except Exception as e:
        return {
            "status": "dispatch_error",
            "error": str(e),
            "payload_preview": discord_payload
        }


@router.get("/export/{triage_id}")
def export_triage_report(
    triage_id: int,
    format: str = Query("markdown", pattern="^(markdown|json)$"),
    db: Session = Depends(get_db)
):
    """
    Exports a comprehensive triage report as Markdown (.md) or JSON for postmortems.
    """
    log = db.query(FailureLog).filter(FailureLog.id == triage_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Triage log not found")

    if format == "json":
        data = {
            "id": log.id,
            "provider": log.provider,
            "repository": log.repo_name,
            "branch": log.branch,
            "commit": log.commit_sha,
            "author": log.commit_author,
            "failing_step": log.exact_failing_step,
            "category": log.root_cause_category,
            "root_cause": log.root_cause_summary,
            "action_type": log.action_type,
            "suggested_direction": log.suggested_direction,
            "remediation_commands": log.remediation_commands,
            "remediation_patch": log.remediation_patch,
            "fingerprint": log.fingerprint,
            "created_at": str(log.created_at)
        }
        return Response(
            content=json.dumps(data, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=triageci-report-{triage_id}.json"}
        )
    else:
        md = log.pr_comment_markdown or f"""# CI/CD Failure Triage Report #{log.id}
**Repository:** `{log.repo_name}` ({log.branch})  
**Failing Step:** `{log.exact_failing_step}`  
**Category:** `{log.root_cause_category}`  
**Action:** `{log.action_type}`  

## Root Cause
{log.root_cause_summary}

## Suggested Direction
{log.suggested_direction}
"""
        return Response(
            content=md,
            media_type="text/markdown",
            headers={"Content-Disposition": f"attachment; filename=triageci-report-{triage_id}.md"}
        )
