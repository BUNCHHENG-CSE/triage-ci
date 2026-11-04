import pytest
from app.core.pattern_library import get_remediation_playbook, PatternLibraryEngine
from app.models.database import SessionLocal
from app.models.schema import TriageRequest
from app.core.triage_engine import triage_engine

def test_remediation_playbook_generation():
    # 1. AWS STS Expired
    pb_aws = get_remediation_playbook("CRED_AWS_STS_EXPIRED", "CREDENTIALS_AUTH", "FIX")
    assert len(pb_aws["commands"]) > 0
    assert any("aws" in cmd for cmd in pb_aws["commands"])
    assert "role-duration-seconds" in pb_aws["patch_diff"]

    # 2. NPM ERESOLVE
    pb_npm = get_remediation_playbook("DEP_NPM_ERESOLVE", "DEPENDENCY", "FIX")
    assert any("legacy-peer-deps" in cmd for cmd in pb_npm["commands"])
    assert "--legacy-peer-deps" in pb_npm["patch_diff"]

    # 3. Flaky Jest Timeout
    pb_jest = get_remediation_playbook("FLK_JEST_ASYNC_TIMEOUT", "FLAKY_CONCURRENCY", "RERUN")
    assert any("jest" in cmd or "gh run" in cmd for cmd in pb_jest["commands"])
    assert "jest.setTimeout" in pb_jest["patch_diff"]

    # 4. Generic RERUN fallback
    pb_rerun = get_remediation_playbook("UNKNOWN", "TRANSIENT_NETWORK", "RERUN")
    assert any("gh run rerun" in cmd for cmd in pb_rerun["commands"])

@pytest.mark.anyio
async def test_triage_engine_populates_remediation():
    db = SessionLocal()
    try:
        sample_log = """2026-10-17T08:00:00.000Z ##[group]Run npm install
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
npm ERR! Could not resolve dependency: peer react@"^18.0.0" from @legacy/table-grid@2.4.1
##[error]Process completed with exit code 1.
"""
        req = TriageRequest(
            raw_log=sample_log,
            provider="github_actions",
            repo_name="acme/test-repo",
            branch="main",
            job_name="install"
        )
        result = await triage_engine.triage_log(req, db)
        assert result.action_type == "FIX"
        assert result.root_cause_category == "DEPENDENCY"
        assert len(result.remediation_commands) > 0
        assert any("legacy-peer-deps" in cmd for cmd in result.remediation_commands)
        assert result.remediation_patch is not None
    finally:
        db.close()
