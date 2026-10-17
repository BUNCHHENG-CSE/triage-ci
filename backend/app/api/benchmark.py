import time
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.schema import BenchmarkRunSummary, BenchmarkResultItem, TriageRequest
from app.data.benchmark_data import BENCHMARK_CASES
from app.core.triage_engine import triage_engine

router = APIRouter(prefix="/api/benchmark", tags=["Benchmark Validation"])

@router.get("/cases")
def get_benchmark_cases():
    """
    Returns the catalog of 20 real failure logs and ground-truth specs.
    """
    # Exclude raw_log from lightweight list or return truncated preview
    return [
        {
            "id": c["id"],
            "name": c["name"],
            "provider": c["provider"],
            "expected_category": c["expected_category"],
            "expected_action_type": c["expected_action_type"],
            "expected_step_contains": c["expected_step_contains"],
            "log_preview": c["raw_log"][:300] + "..."
        }
        for c in BENCHMARK_CASES
    ]

@router.post("/run", response_model=BenchmarkRunSummary)
async def run_benchmark_suite(db: Session = Depends(get_db)):
    """
    Executes the full 20 real failure logs validation suite.
    Evaluates attribution correctness against ground truth.
    Target threshold: >= 15/20 correct (75%) required to sell.
    """
    results: List[BenchmarkResultItem] = []
    total_time_ms = 0.0

    for case in BENCHMARK_CASES:
        start_t = time.time()
        
        req = TriageRequest(
            raw_log=case["raw_log"],
            provider=case["provider"],
            repo_name="acme/benchmark-suite",
            branch="main",
            job_name=case["name"]
        )
        
        triage_res = await triage_engine.triage_log(req, db)
        elapsed_ms = (time.time() - start_t) * 1000.0
        total_time_ms += elapsed_ms

        # Validation checks
        category_match = (triage_res.root_cause_category == case["expected_category"])
        action_match = (triage_res.action_type == case["expected_action_type"])
        step_match = (
            case["expected_step_contains"].lower() in triage_res.exact_failing_step.lower()
            or case["expected_step_contains"].lower() in triage_res.extracted_excerpt.lower()
        )
        
        # Keyword checks in summary
        summary_lower = triage_res.root_cause_summary.lower()
        keyword_hits = sum(1 for kw in case["expected_keywords"] if kw.lower() in summary_lower or kw.lower() in triage_res.extracted_excerpt.lower())
        keywords_ok = keyword_hits >= 1

        # Overall pass condition: category and action match, and reasonable step/keyword alignment
        case_passed = category_match and action_match and (step_match or keywords_ok)

        explanation = (
            f"Category: {'MATCH' if category_match else 'MISMATCH'} ({triage_res.root_cause_category} vs {case['expected_category']}), "
            f"Action: {'MATCH' if action_match else 'MISMATCH'} ({triage_res.action_type} vs {case['expected_action_type']})"
        )

        results.append(BenchmarkResultItem(
            case_id=case["id"],
            name=case["name"],
            passed=case_passed,
            predicted_category=triage_res.root_cause_category,
            expected_category=case["expected_category"],
            predicted_action=triage_res.action_type,
            expected_action=case["expected_action_type"],
            predicted_step=triage_res.exact_failing_step,
            expected_step_contains=case["expected_step_contains"],
            root_cause_summary=triage_res.root_cause_summary,
            confidence_score=triage_res.confidence_score,
            processing_time_ms=round(elapsed_ms, 2),
            explanation=explanation
        ))

    passed_count = sum(1 for r in results if r.passed)
    total_count = len(results)
    accuracy_pct = round((passed_count / total_count) * 100.0, 1) if total_count > 0 else 0.0
    ready_to_sell = passed_count >= 15
    avg_latency = round(total_time_ms / total_count, 1) if total_count > 0 else 0.0

    return BenchmarkRunSummary(
        total_cases=total_count,
        passed_cases=passed_count,
        failed_cases=total_count - passed_count,
        accuracy_percentage=accuracy_pct,
        ready_to_sell=ready_to_sell,
        threshold_percentage=75.0,  # 15/20
        avg_latency_ms=avg_latency,
        results=results
    )
