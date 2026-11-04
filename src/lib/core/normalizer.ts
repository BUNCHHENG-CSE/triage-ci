// ANSI escape sequence regex pattern
const ANSI_ESCAPE_PATTERN = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

// Timestamp patterns commonly found in CI logs (GitHub Actions, GitLab, Jenkins)
const TIMESTAMP_PREFIX_PATTERN = /^(?:\[?(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\]?\s*)+/;

// Common sensitive credential patterns to redact before log processing or storage
const SECRET_PATTERNS: Array<[RegExp, string | ((match: string, ...groups: string[]) => string)]> = [
  // AWS Access Key ID
  [/\b(AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b/g, '$1[REDACTED_AWS_KEY]'],
  // GitHub Personal Access Tokens
  [/\bghp_[a-zA-Z0-9]{36}\b/g, '[REDACTED_GH_TOKEN]'],
  [/\bgithub_pat_[a-zA-Z0-9_]{82}\b/g, '[REDACTED_GH_PAT]'],
  // Bearer tokens
  [/\bBearer\s+[a-zA-Z0-9_\-\.]{20,}\b/gi, 'Bearer [REDACTED_BEARER_TOKEN]'],
  // AWS Secret Key assignments
  [/(aws_secret_access_key\s*[:=]\s*)[A-Za-z0-9/+=]{30,}/gi, '$1[REDACTED_AWS_SECRET]'],
  // Generic password or token assignments in environment outputs
  [/(password|secret|token|api_key|auth_token)\s*[:=]\s*["']?[a-zA-Z0-9_\-\.+=/]{12,}["']?/gi, '$1=[REDACTED_CREDENTIAL]'],
];

export interface NormalizedLine {
  lineNumber: number;
  text: string;
}

export class NormalizedLog {
  rawLineCount: number;
  lines: NormalizedLine[];
  redactedSecretsCount: number;

  constructor(rawLines: string[]) {
    this.rawLineCount = rawLines.length;
    this.lines = [];
    this.redactedSecretsCount = 0;
    this.normalize(rawLines);
  }

  private normalize(rawLines: string[]) {
    for (let idx = 0; idx < rawLines.length; idx++) {
      const lineNum = idx + 1;
      let clean = rawLines[idx].replace(/[\r\n]+$/, '');

      // Remove ANSI colors and formatting
      clean = clean.replace(ANSI_ESCAPE_PATTERN, '');

      // Remove timestamp prefix if present
      clean = clean.replace(TIMESTAMP_PREFIX_PATTERN, '');

      // Redact sensitive secrets
      for (const [pattern, replacement] of SECRET_PATTERNS) {
        if (typeof replacement === 'string') {
          clean = clean.replace(pattern, replacement);
        } else {
          clean = clean.replace(pattern, replacement);
        }
      }

      this.lines.push({ lineNumber: lineNum, text: clean });
    }
  }

  getFullCleanedText(): string {
    return this.lines.map((l) => l.text).join('\n');
  }
}

export function normalizeLog(rawLog: string): NormalizedLog {
  const rawLines = rawLog.split(/\r?\n/);
  return new NormalizedLog(rawLines);
}
