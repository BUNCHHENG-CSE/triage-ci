import os
import json
import logging
from typing import Optional, Dict, Any
import httpx
from app.config import settings
from app.core.pattern_library import PatternMatch

logger = logging.getLogger("triageci.llm")

SYSTEM_PROMPT = """You are TriageCI, an expert CI/CD root-cause attribution engine for engineering teams.
You analyze raw, noisy CI build logs to determine:
1. Exactly which pipeline step failed.
2. The root-cause hypothesis (what broke and why).
3. Whether the recommended action is a "RERUN" (transient network, flaky test timeout, registry blip) or "FIX" (code error, missing config, expired secret).
4. Direct suggested next step or fix direction.

CRITICAL CONSTRAINTS:
- You are strictly constrained by the extracted log lines and the pattern library hypothesis.
- DO NOT free-associate or hallucinate.
- DO NOT promise or generate full automated code fixes; provide clear, diagnostic triage and a precise next step.
- Return ONLY valid JSON matching this schema:
{
  "exact_failing_step": "string",
  "root_cause_category": "string",
  "root_cause_summary": "string",
  "action_type": "RERUN" or "FIX",
  "suggested_direction": "string",
  "confidence_score": float between 0.0 and 1.0
}
"""

class LLMProvider:
    def __init__(self):
        self.openai_key = settings.OPENAI_API_KEY
        self.gemini_key = settings.GEMINI_API_KEY
        self.anthropic_key = settings.ANTHROPIC_API_KEY

    async def summarize_triage(
        self,
        extracted_excerpt: str,
        failing_step_detected: str,
        pattern_match: Optional[PatternMatch] = None,
        job_name: str = "CI Job",
        repo_name: str = "repo"
    ) -> Dict[str, Any]:
        """
        Runs LLM summarization with strict failure-pattern library constraints.
        Falls back seamlessly to the deterministic pattern attribution engine.
        """
        # If an external API key is available, attempt LLM call
        if self.openai_key:
            res = await self._call_openai(extracted_excerpt, failing_step_detected, pattern_match, job_name)
            if res:
                return res
        elif self.gemini_key:
            res = await self._call_gemini(extracted_excerpt, failing_step_detected, pattern_match, job_name)
            if res:
                return res

        # Default / Fallback: High-Accuracy Heuristic & Pattern Engine
        return self._heuristic_fallback(extracted_excerpt, failing_step_detected, pattern_match)

    def _heuristic_fallback(
        self,
        extracted_excerpt: str,
        failing_step_detected: str,
        pattern_match: Optional[PatternMatch]
    ) -> Dict[str, Any]:
        """
        Constrained rule-based attribution when LLM is offline or no API key is configured.
        """
        if pattern_match:
            return {
                "exact_failing_step": failing_step_detected,
                "root_cause_category": pattern_match.category,
                "root_cause_summary": pattern_match.summary,
                "action_type": pattern_match.action_type,
                "suggested_direction": pattern_match.suggested_direction,
                "confidence_score": pattern_match.confidence
            }
        
        # Generic fallback if no specific pattern matched
        return {
            "exact_failing_step": failing_step_detected,
            "root_cause_category": "UNKNOWN_FAILURE",
            "root_cause_summary": "The pipeline process exited with non-zero status during execution.",
            "action_type": "FIX",
            "suggested_direction": "Review recent commit diff and step output around the failure anchor.",
            "confidence_score": 0.65
        }

    async def _call_openai(
        self,
        excerpt: str,
        failing_step: str,
        pattern_match: Optional[PatternMatch],
        job_name: str
    ) -> Optional[Dict[str, Any]]:
        try:
            pattern_info = ""
            if pattern_match:
                pattern_info = (
                    f"Pattern library match:\n"
                    f"- Category: {pattern_match.category}\n"
                    f"- Known summary: {pattern_match.summary}\n"
                    f"- Action type: {pattern_match.action_type}\n"
                )

            user_prompt = f"""Job: {job_name}
Detected step: {failing_step}

{pattern_info}

Extracted Log Excerpt:
{excerpt}
"""
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.openai_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": user_prompt}
                        ],
                        "response_format": {"type": "json_object"},
                        "temperature": 0.1
                    }
                )
                if resp.status_code == 200:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    return json.loads(content)
        except Exception as e:
            logger.warning(f"OpenAI call failed, falling back to pattern engine: {e}")
        return None

    async def _call_gemini(
        self,
        excerpt: str,
        failing_step: str,
        pattern_match: Optional[PatternMatch],
        job_name: str
    ) -> Optional[Dict[str, Any]]:
        try:
            pattern_info = ""
            if pattern_match:
                pattern_info = (
                    f"Pattern library match:\n"
                    f"- Category: {pattern_match.category}\n"
                    f"- Known summary: {pattern_match.summary}\n"
                    f"- Action type: {pattern_match.action_type}\n"
                )

            user_prompt = f"""Job: {job_name}
Detected step: {failing_step}

{pattern_info}

Extracted Log Excerpt:
{excerpt}
"""
            async with httpx.AsyncClient(timeout=10.0) as client:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.gemini_key}"
                resp = await client.post(
                    url,
                    json={
                        "contents": [{
                            "parts": [{"text": f"{SYSTEM_PROMPT}\n\n{user_prompt}"}]
                        }],
                        "generationConfig": {"response_mime_type": "application/json"}
                    }
                )
                if resp.status_code == 200:
                    data = resp.json()
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    return json.loads(text)
        except Exception as e:
            logger.warning(f"Gemini call failed, falling back to pattern engine: {e}")
        return None
