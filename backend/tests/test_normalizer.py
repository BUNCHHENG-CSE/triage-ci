import pytest
from app.core.normalizer import normalize_log

def test_ansi_escape_removal():
    raw = "\x1b[31mError:\x1b[0m \x1b[1mProcess failed\x1b[0m"
    normalized = normalize_log(raw)
    assert len(normalized.lines) == 1
    assert normalized.lines[0][1] == "Error: Process failed"

def test_timestamp_removal():
    raw = "2026-10-17T08:12:34.5678901Z ##[error]Process completed with exit code 1."
    normalized = normalize_log(raw)
    assert normalized.lines[0][1] == "##[error]Process completed with exit code 1."

def test_secret_redaction():
    raw = "Deploying using AKIAIOSFODNN7EXAMPLE and secret aws_secret_access_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
    normalized = normalize_log(raw)
    assert "[REDACTED_AWS_KEY]" in normalized.lines[0][1]
    assert "[REDACTED_AWS_SECRET]" in normalized.lines[0][1]
    assert "wJalrXUtnFEMI" not in normalized.lines[0][1]
    assert normalized.redacted_secrets_count >= 2
