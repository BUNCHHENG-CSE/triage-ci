from typing import Optional, List
from app.models.schema import ExcerptLine

def format_github_pr_comment(
    job_name: str,
    failing_step: str,
    root_cause_category: str,
    root_cause_summary: str,
    action_type: str,
    suggested_direction: str,
    confidence_score: float,
    reduction_percentage: float,
    excerpt_lines: List[ExcerptLine],
    cluster_occurrences: int = 1
) -> str:
    """
    Builds a clean, actionable GitHub PR comment markdown.
    """
    badge = "🔄 **RECOMMENDATION: SAFE TO RERUN**" if action_type == "RERUN" else "🛠️ **RECOMMENDATION: CODE/CONFIG FIX REQUIRED**"
    conf_pct = int(confidence_score * 100)

    # Recurring cluster callout
    cluster_callout = ""
    if cluster_occurrences > 1:
        cluster_callout = f"\n> ⚠️ **Recurring Issue Detected:** This same root cause has caused **{cluster_occurrences} failures** across the repository.\n"

    # Build snippet lines
    snippet_code = "\n".join(
        f"{line.line_number:4d} | {line.content}" for line in excerpt_lines
    )

    markdown = f"""### 🔴 CI/CD Failure Triage Report: `{job_name}`

{badge}
{cluster_callout}
| Attribute | Details |
| :--- | :--- |
| **Category** | `{root_cause_category}` |
| **Failing Step** | `{failing_step}` |
| **Confidence** | `{conf_pct}%` |
| **Noise Reduction** | `{reduction_percentage}%` of console log pruned |

#### 🔍 Root Cause Analysis
{root_cause_summary}

#### 💡 Suggested Action
{suggested_direction}

<details>
<summary><b>📄 View Extracted Log Evidence ({len(excerpt_lines)} high-signal lines)</b></summary>

```log
{snippet_code}
```
</details>

---
*TriageCI Diagnostic Engine • No pipeline editing • Fast attribution*
"""
    return markdown.strip()


def format_slack_card(
    repo_name: str,
    job_name: str,
    failing_step: str,
    root_cause_summary: str,
    action_type: str,
    suggested_direction: str,
    cluster_occurrences: int
) -> dict:
    """
    Builds a Slack Block Kit JSON card payload.
    """
    color = "#36a64f" if action_type == "RERUN" else "#dc2626"
    return {
        "attachments": [
            {
                "color": color,
                "blocks": [
                    {
                        "type": "header",
                        "text": {
                            "type": "plain_text",
                            "text": f"CI Failure: {repo_name} / {job_name}"
                        }
                    },
                    {
                        "type": "section",
                        "fields": [
                            {"type": "mrkdwn", "text": f"*Action:* `{action_type}`"},
                            {"type": "mrkdwn", "text": f"*Failing Step:* `{failing_step}`"},
                            {"type": "mrkdwn", "text": f"*Occurrences:* `{cluster_occurrences} times`"}
                        ]
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": f"*Root Cause:*\n{root_cause_summary}\n\n*Suggested Action:*\n{suggested_direction}"
                        }
                    }
                ]
            }
        ]
    }
