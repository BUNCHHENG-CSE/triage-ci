import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.anyio
async def test_health_diagnostics_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "database" in data
        assert data["database"]["status"] == "connected"
        assert data["engine"]["pattern_library_size"] >= 30

@pytest.mark.anyio
async def test_jenkins_webhook():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "name": "payment-api-build",
            "build": {
                "status": "FAILURE",
                "scm": {"url": "https://github.com/acme/payment-api.git", "branch": "origin/main", "commit": "a1b2c3d"},
                "log": """[Pipeline] { (Build)
java.lang.OutOfMemoryError: Java heap space
[Pipeline] ERROR: script returned exit code 1
"""
            }
        }
        response = await ac.post("/api/webhooks/jenkins", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "triaged"
        assert data["provider"] == "jenkins"
        assert data["action_type"] == "FIX"

@pytest.mark.anyio
async def test_webhook_simulator():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "scenario": "jest_timeout",
            "provider": "github_actions"
        }
        response = await ac.post("/api/webhooks/simulate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "simulation_successful"
        assert data["action_type"] == "RERUN"
        assert "remediation_commands" in data

@pytest.mark.anyio
async def test_slack_dispatch_simulation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "webhook_url": "https://hooks.slack.com/services/DUMMY/TEST/KEY",
            "repo_name": "acme-corp/api",
            "job_name": "test-suite",
            "failing_step": "npm test",
            "root_cause_summary": "Jest callback timeout",
            "action_type": "RERUN",
            "suggested_direction": "Safe to rerun",
            "cluster_occurrences": 3
        }
        response = await ac.post("/api/notifications/slack", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "simulated_success"

@pytest.mark.anyio
async def test_triage_history_search_and_filter():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Filter by action_type=RERUN
        response = await ac.get("/api/triage/history?action_type=RERUN")
        assert response.status_code == 200
        results = response.json()
        for r in results:
            assert r["action_type"] == "RERUN"
            assert "remediation_commands" in r
