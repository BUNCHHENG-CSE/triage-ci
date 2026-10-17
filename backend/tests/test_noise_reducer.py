import pytest
from app.core.normalizer import normalize_log
from app.core.noise_reducer import NoiseReducer

def test_noise_reduction_and_window_extraction():
    # Simulate 200 lines of noise with a failure anchor in the middle
    lines = ["Running task setup"]
    for i in range(100):
        lines.append(f"Downloading package part {i} ... 100%")
    lines.append("##[group]Run npm test")
    lines.append("FAIL src/auth.test.ts")
    lines.append("  ● Auth › should login")
    lines.append("    AssertionError: assert 401 == 200")
    lines.append("##[error]Process completed with exit code 1.")
    for i in range(50):
        lines.append("Uploading artifact cache...")
    
    raw = "\n".join(lines)
    normalized = normalize_log(raw)
    reducer = NoiseReducer(context_before=10, context_after=10)
    window = reducer.extract_triage_window(normalized)

    assert window.total_raw_lines > 150
    assert len(window.excerpt_lines) < 30
    assert window.reduction_percentage > 80.0
    assert "npm test" in window.failing_step
    assert any("AssertionError" in text for _, text, _ in window.excerpt_lines)
