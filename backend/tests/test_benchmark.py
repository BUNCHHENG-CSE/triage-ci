import asyncio
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.database import Base
from app.models.schema import TriageRequest
from app.data.benchmark_data import BENCHMARK_CASES
from app.core.triage_engine import TriageEngine

@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def test_benchmark_20_logs_validation(test_db):
    """
    Core validation requirement:
    "Validate with 20 real failure logs from one team: if attribution is correct on at least 15, it is ready.
    Below that, do not sell."
    """
    async def _run():
        engine = TriageEngine()
        passed_cases = 0
        total_cases = len(BENCHMARK_CASES)

        print(f"\n--- Running Benchmark Suite on {total_cases} Real Failure Logs ---")
        for case in BENCHMARK_CASES:
            req = TriageRequest(
                raw_log=case["raw_log"],
                provider=case["provider"],
                repo_name="acme/benchmark",
                branch="main",
                job_name=case["name"]
            )
            res = await engine.triage_log(req, test_db)

            cat_match = (res.root_cause_category == case["expected_category"])
            action_match = (res.action_type == case["expected_action_type"])
            
            is_correct = cat_match and action_match
            if is_correct:
                passed_cases += 1
                status_symbol = "PASS"
            else:
                status_symbol = f"FAIL ({res.root_cause_category} vs {case['expected_category']})"

            print(f"[{status_symbol}] {case['id']}: {case['name']} -> Action: {res.action_type}")

        accuracy_pct = (passed_cases / total_cases) * 100.0
        print(f"\n==========================================")
        print(f"Benchmark Results: {passed_cases}/{total_cases} passed ({accuracy_pct:.1f}%)")
        print(f"Threshold: >= 15/20 (75%) required to sell.")
        print(f"Status: {'READY TO SELL! [PASSED]' if passed_cases >= 15 else 'DO NOT SELL [FAILED]'}")
        print(f"==========================================")

        assert passed_cases >= 15, f"Validation failed: only {passed_cases}/{total_cases} correct. Required >= 15."

    asyncio.run(_run())
