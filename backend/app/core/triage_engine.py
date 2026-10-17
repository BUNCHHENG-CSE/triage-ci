import time
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.core.normalizer import normalize_log
from app.core.noise_reducer import NoiseReducer
from app.core.pattern_library import PatternLibraryEngine
from app.core.llm_provider import LLMProvider
from app.core.clustering import get_or_create_cluster
from app.core.pr_commenter import format_github_pr_comment
from app.models.schema import TriageRequest, TriageResult, ExcerptLine, FailureLog

class TriageEngine:
    def __init__(self):
        self.noise_reducer = NoiseReducer()
        self.pattern_engine = PatternLibraryEngine()
        self.llm_provider = LLMProvider()

    async def triage_log(self, request: TriageRequest, db: Session) -> TriageResult:
        start_time = time.time()

        # Step 1: Normalize log (ANSI removal, timestamp strip, secret redaction)
        normalized = normalize_log(request.raw_log)

        # Step 2: Noise reduction & window extraction
        window = self.noise_reducer.extract_triage_window(normalized)

        # Step 3: Pattern matching against the high-signal window
        pattern_match = self.pattern_engine.match(window.excerpt_text)
        # If not found in the window, search the entire cleaned log as fallback
        if not pattern_match:
            pattern_match = self.pattern_engine.match(normalized.get_full_cleaned_text())

        # Step 4: Summarization (LLM or pattern-constrained heuristic)
        analysis = await self.llm_provider.summarize_triage(
            extracted_excerpt=window.excerpt_text,
            failing_step_detected=window.failing_step,
            pattern_match=pattern_match,
            job_name=request.job_name or "CI Job",
            repo_name=request.repo_name or "repo"
        )

        failing_step = analysis.get("exact_failing_step") or window.failing_step
        category = analysis.get("root_cause_category") or (pattern_match.category if pattern_match else "UNKNOWN_FAILURE")
        root_cause_summary = analysis.get("root_cause_summary") or "Pipeline failed during step execution."
        action_type = analysis.get("action_type") or (pattern_match.action_type if pattern_match else "FIX")
        suggested_direction = analysis.get("suggested_direction") or "Check step error output."
        confidence_score = float(analysis.get("confidence_score") or 0.90)

        # Step 5: Clustering & Fingerprint
        if pattern_match:
            fingerprint = pattern_match.fingerprint
            cluster_title = pattern_match.title
        else:
            safe_step = failing_step.lower().replace(" ", "_")[:30]
            fingerprint = f"cluster:{category.lower()}:{safe_step}"
            cluster_title = f"{category}: {failing_step}"

        cluster, occurrence_count = get_or_create_cluster(
            db=db,
            fingerprint=fingerprint,
            title=cluster_title,
            category=category,
            suggested_action_type=action_type,
            suggested_direction=suggested_direction,
            repo_name=request.repo_name or "unknown/repo"
        )

        # Step 6: Convert excerpt lines to schema
        excerpt_lines = [
            ExcerptLine(line_number=num, content=txt, is_anchor=is_anchor)
            for num, txt, is_anchor in window.excerpt_lines
        ]

        # Step 7: Format GitHub PR comment
        pr_comment = format_github_pr_comment(
            job_name=request.job_name or "test",
            failing_step=failing_step,
            root_cause_category=category,
            root_cause_summary=root_cause_summary,
            action_type=action_type,
            suggested_direction=suggested_direction,
            confidence_score=confidence_score,
            reduction_percentage=window.reduction_percentage,
            excerpt_lines=excerpt_lines,
            cluster_occurrences=occurrence_count
        )

        # Step 8: Persist failure log entry
        db_log = FailureLog(
            provider=request.provider or "github_actions",
            repo_name=request.repo_name or "unknown/repo",
            branch=request.branch or "main",
            commit_sha=request.commit_sha or "HEAD",
            commit_author=request.commit_author or "engineer",
            pr_number=request.pr_number,
            workflow_name=request.workflow_name or "CI Pipeline",
            job_name=request.job_name or "test",
            exact_failing_step=failing_step,
            root_cause_category=category,
            root_cause_summary=root_cause_summary,
            action_type=action_type,
            suggested_direction=suggested_direction,
            confidence_score=confidence_score,
            fingerprint=fingerprint,
            extracted_excerpt=window.excerpt_text,
            excerpt_start_line=excerpt_lines[0].line_number if excerpt_lines else 1,
            excerpt_end_line=excerpt_lines[-1].line_number if excerpt_lines else 1,
            total_raw_lines=window.total_raw_lines,
            raw_log=request.raw_log[:50000],  # safeguard max size in db
            pr_comment_markdown=pr_comment,
            cluster_id=cluster.id
        )
        db.add(db_log)
        db.commit()
        db.refresh(db_log)

        return TriageResult(
            id=db_log.id,
            provider=db_log.provider,
            repo_name=db_log.repo_name,
            branch=db_log.branch,
            commit_sha=db_log.commit_sha,
            commit_author=db_log.commit_author,
            pr_number=db_log.pr_number,
            workflow_name=db_log.workflow_name,
            job_name=db_log.job_name,
            exact_failing_step=failing_step,
            root_cause_category=category,
            root_cause_summary=root_cause_summary,
            action_type=action_type,
            suggested_direction=suggested_direction,
            confidence_score=confidence_score,
            fingerprint=fingerprint,
            extracted_excerpt=window.excerpt_text,
            excerpt_lines=excerpt_lines,
            total_raw_lines=window.total_raw_lines,
            reduction_percentage=window.reduction_percentage,
            pr_comment_markdown=pr_comment,
            cluster_id=cluster.id,
            cluster_occurrence_count=occurrence_count,
            created_at=db_log.created_at
        )

# Global engine instance
triage_engine = TriageEngine()
