import re
from typing import List, Tuple

# ANSI escape sequence regex pattern
ANSI_ESCAPE_PATTERN = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')

# Timestamp patterns commonly found in CI logs (GitHub Actions, GitLab, Jenkins)
TIMESTAMP_PREFIX_PATTERN = re.compile(
    r'^(?:\[?(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\]?\s*)+'
)

# Common sensitive credential patterns to redact before log processing or storage
SECRET_PATTERNS = [
    # AWS Access Key ID
    (re.compile(r'\b(AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b'), r'\1[REDACTED_AWS_KEY]'),
    # GitHub Personal Access Tokens
    (re.compile(r'\bghp_[a-zA-Z0-9]{36}\b'), '[REDACTED_GH_TOKEN]'),
    (re.compile(r'\bgithub_pat_[a-zA-Z0-9_]{82}\b'), '[REDACTED_GH_PAT]'),
    # Bearer tokens
    (re.compile(r'(?i)\bBearer\s+[a-zA-Z0-9_\-\.]{20,}\b'), 'Bearer [REDACTED_BEARER_TOKEN]'),
    # AWS Secret Key assignments
    (re.compile(r'(?i)(aws_secret_access_key\s*[:=]\s*)[A-Za-z0-9/+=]{30,}'), r'\1[REDACTED_AWS_SECRET]'),
    # Generic password or token assignments in environment outputs
    (re.compile(r'(?i)(password|secret|token|api_key|auth_token)\s*[:=]\s*["\']?[a-zA-Z0-9_\-\.+=/]{12,}["\']?'), r'\1=[REDACTED_CREDENTIAL]'),
]

class NormalizedLog:
    def __init__(self, raw_lines: List[str]):
        self.raw_line_count = len(raw_lines)
        self.lines: List[Tuple[int, str]] = []  # (1-indexed line_num, cleaned_line)
        self.redacted_secrets_count = 0
        self._normalize(raw_lines)

    def _normalize(self, raw_lines: List[str]):
        for idx, line in enumerate(raw_lines, start=1):
            # Strip trailing newlines/returns
            clean = line.rstrip('\r\n')
            
            # Remove ANSI colors/formatting
            clean = ANSI_ESCAPE_PATTERN.sub('', clean)
            
            # Remove timestamp prefix if present
            clean = TIMESTAMP_PREFIX_PATTERN.sub('', clean)
            
            # Redact sensitive secrets
            for pattern, replacement in SECRET_PATTERNS:
                subbed, count = pattern.subn(replacement, clean)
                if count > 0:
                    self.redacted_secrets_count += count
                    clean = subbed
                    
            self.lines.append((idx, clean))

    def get_full_cleaned_text(self) -> str:
        return "\n".join(text for _, text in self.lines)


def normalize_log(raw_log: str) -> NormalizedLog:
    """
    Splits raw log string into lines and normalizes timestamps, ANSI codes, and secrets.
    """
    raw_lines = raw_log.splitlines()
    return NormalizedLog(raw_lines)
