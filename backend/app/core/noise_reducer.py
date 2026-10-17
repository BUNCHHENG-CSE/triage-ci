import re
from typing import List, Tuple, Optional, Dict, Any
from app.core.normalizer import NormalizedLog

# Patterns for identifying step/job demarcation in various CI platforms
STEP_HEADER_PATTERNS = [
    # GitHub Actions
    (re.compile(r'^##\[group\]Run\s+(.*)$', re.IGNORECASE), 1),
    (re.compile(r'^##\[group\](.*)$', re.IGNORECASE), 1),
    (re.compile(r'^##\[section\]Starting:\s+(.*)$', re.IGNORECASE), 1),
    (re.compile(r'^Run\s+([a-zA-Z0-9_\-\./@]+.*)$'), 1),
    # Jenkins
    (re.compile(r'^\[Pipeline\]\s+\{\s*\((.*)\)', re.IGNORECASE), 1),
    (re.compile(r'^\+\s+([a-zA-Z0-9_\-\./]+\s+.*)$'), 1),
    # GitLab CI
    (re.compile(r'^\$+\s+(.*)$'), 1),
    (re.compile(r'^section_start:\d+:([a-zA-Z0-9_\-]+)'), 1),
    # Gradle / Maven
    (re.compile(r'^>\s+Task\s+(:[a-zA-Z0-9_\-:]+)'), 1),
    # Docker
    (re.compile(r'^Step\s+\d+/\d+\s*:\s*(.*)$', re.IGNORECASE), 1),
]

# Patterns representing clear failure triggers / anchors
FAILURE_ANCHOR_PATTERNS = [
    re.compile(r'##\[error\]', re.IGNORECASE),
    re.compile(r'Process completed with exit code [1-9]\d*', re.IGNORECASE),
    re.compile(r'exited with (status|code) [1-9]\d*', re.IGNORECASE),
    re.compile(r'Command failed with (exit code|status) [1-9]\d*', re.IGNORECASE),
    re.compile(r'npm ERR! code', re.IGNORECASE),
    re.compile(r'BUILD FAILED in', re.IGNORECASE),
    re.compile(r'> Task :.* FAILED', re.IGNORECASE),
    re.compile(r'Traceback \(most recent call last\):', re.IGNORECASE),
    re.compile(r'panic: runtime error:', re.IGNORECASE),
    re.compile(r'java\.lang\.[a-zA-Z0-9_]*Exception', re.IGNORECASE),
    re.compile(r'java\.lang\.OutOfMemoryError', re.IGNORECASE),
    re.compile(r'AssertionError:', re.IGNORECASE),
    re.compile(r'error\[E\d+\]:', re.IGNORECASE),
    re.compile(r'error TS\d+:', re.IGNORECASE),
    re.compile(r'FAIL:\s+[A-Za-z0-9_]+', re.IGNORECASE),
    re.compile(r'FAIL\s+.*\.test\.[jt]sx?', re.IGNORECASE),
    re.compile(r'FAILED\s+tests?/.*', re.IGNORECASE),
    re.compile(r'Killed\s*$', re.IGNORECASE),
    re.compile(r'The security token included in the request is expired', re.IGNORECASE),
    re.compile(r'fatal error:\s+.*', re.IGNORECASE),
    re.compile(r'ECONNRESET|ETIMEDOUT|ECONNREFUSED', re.IGNORECASE),
]

# Repetitive high-noise patterns that can be suppressed if they repeat
NOISE_LINE_PATTERNS = [
    re.compile(r'^\s*[\.o\*#]{10,}\s*$'),  # progress bars / dots
    re.compile(r'^\s*(downloading|fetching|extracting)\s+.*\d+%', re.IGNORECASE),
    re.compile(r'^\s*\[\s*\d+%\s*\]\s+Building', re.IGNORECASE),
    re.compile(r'^\s*PASS\s+tests?/.*', re.IGNORECASE),
    re.compile(r'^\s*ok\s+\d+\s+-', re.IGNORECASE),
]


class ExtractedWindow:
    def __init__(
        self,
        failing_step: str,
        anchor_line_num: int,
        excerpt_lines: List[Tuple[int, str, bool]],  # (line_num, text, is_anchor)
        total_raw_lines: int
    ):
        self.failing_step = failing_step
        self.anchor_line_num = anchor_line_num
        self.excerpt_lines = excerpt_lines
        self.total_raw_lines = total_raw_lines
        
    @property
    def excerpt_text(self) -> str:
        return "\n".join(f"[{line_num:4d}] {text}" for line_num, text, _ in self.excerpt_lines)
    
    @property
    def reduction_percentage(self) -> float:
        if self.total_raw_lines <= 0:
            return 0.0
        reduced = max(0, self.total_raw_lines - len(self.excerpt_lines))
        return round((reduced / self.total_raw_lines) * 100.0, 1)


class NoiseReducer:
    def __init__(self, context_before: int = 35, context_after: int = 25):
        self.context_before = context_before
        self.context_after = context_after

    def extract_triage_window(self, normalized_log: NormalizedLog) -> ExtractedWindow:
        lines = normalized_log.lines
        total_lines = len(lines)
        if total_lines == 0:
            return ExtractedWindow("Unknown Step", 0, [], 0)

        # Step 1: Detect steps and find failure anchors
        current_step = "Setup / Environment"
        step_at_line: Dict[int, str] = {}
        anchor_indices: List[int] = []

        for idx, (line_num, line_text) in enumerate(lines):
            # Check step header
            for pattern, group_idx in STEP_HEADER_PATTERNS:
                m = pattern.search(line_text)
                if m:
                    current_step = m.group(group_idx).strip()
                    break
            step_at_line[idx] = current_step

            # Check failure anchor
            for anchor_pat in FAILURE_ANCHOR_PATTERNS:
                if anchor_pat.search(line_text):
                    anchor_indices.append(idx)
                    break

        # If no explicit anchor pattern matched, fallback to looking for 'error' or 'failed'
        if not anchor_indices:
            for idx, (line_num, line_text) in enumerate(lines):
                lower = line_text.lower()
                if "error" in lower or "failed" in lower or "fatal" in lower:
                    anchor_indices.append(idx)

        # If still none found, default to last 40 lines
        if not anchor_indices:
            primary_anchor_idx = max(0, total_lines - 1)
        else:
            # Prefer the most informative anchor (often the first significant exception/failure anchor,
            # or the exit code anchor's preceding error)
            primary_anchor_idx = self._select_primary_anchor(lines, anchor_indices)

        failing_step = step_at_line.get(primary_anchor_idx, "Execute Pipeline")

        # Step 2: Slice the context window around the anchor
        start_idx = max(0, primary_anchor_idx - self.context_before)
        end_idx = min(total_lines, primary_anchor_idx + self.context_after + 1)

        raw_window = lines[start_idx:end_idx]

        # Step 3: Filter out excessively noisy lines inside the window
        filtered_window: List[Tuple[int, str, bool]] = []
        for idx_in_lines, (line_num, text) in enumerate(raw_window, start=start_idx):
            is_anchor = (idx_in_lines in anchor_indices)
            
            # If line is high noise and not an anchor, we can suppress it unless it provides context
            is_noise = any(np.search(text) for np in NOISE_LINE_PATTERNS)
            if is_noise and not is_anchor:
                continue

            filtered_window.append((line_num, text, is_anchor))

        # Guarantee at least some lines exist
        if not filtered_window:
            filtered_window = [(num, txt, False) for num, txt in raw_window]

        anchor_line_num = lines[primary_anchor_idx][0] if primary_anchor_idx < len(lines) else 1

        return ExtractedWindow(
            failing_step=failing_step,
            anchor_line_num=anchor_line_num,
            excerpt_lines=filtered_window,
            total_raw_lines=total_lines
        )

    def _select_primary_anchor(self, lines: List[Tuple[int, str]], anchor_indices: List[int]) -> int:
        """
        Picks the root-cause anchor. Often CI prints "Process completed with exit code 1"
        at the very end, but the real error (Traceback, ERESOLVE, OOM, ExpiredToken) was 10-30 lines prior.
        """
        # If the last anchor is just an exit code or ##[error] Process completed, look backwards
        # for a specific stack trace / root cause anchor
        exit_code_pat = re.compile(r'Process completed with exit code|exit status|Command failed with exit code', re.IGNORECASE)
        
        # Scan anchors from first to last
        for idx in anchor_indices:
            line_text = lines[idx][1]
            # If line contains an explicit known cause (not just generic exit code)
            if not exit_code_pat.search(line_text):
                # This is likely the real cause anchor
                return idx

        # If all anchors were exit codes or nothing else matched, pick the first anchor
        return anchor_indices[0]
