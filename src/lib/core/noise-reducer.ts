import { NormalizedLog, NormalizedLine } from './normalizer';
import { ExcerptLine } from '../types';

// Patterns for identifying step/job demarcation in various CI platforms
const STEP_HEADER_PATTERNS: Array<[RegExp, number]> = [
  // GitHub Actions
  [/^##\[group\]Run\s+(.*)$/i, 1],
  [/^##\[group\](.*)$/i, 1],
  [/^##\[section\]Starting:\s+(.*)$/i, 1],
  [/^Run\s+([a-zA-Z0-9_\-\./@]+.*)$/, 1],
  // Jenkins
  [/^\[Pipeline\]\s+\{\s*\((.*)\)/i, 1],
  [/^\+\s+([a-zA-Z0-9_\-\./]+\s+.*)$/, 1],
  // GitLab CI
  [/^\$+\s+(.*)$/, 1],
  [/^section_start:\d+:([a-zA-Z0-9_\-]+)/, 1],
  // Gradle / Maven
  [/^>\s+Task\s+(:[a-zA-Z0-9_\-:]+)/, 1],
  // Docker
  [/^Step\s+\d+\/\d+\s*:\s*(.*)$/i, 1],
];

// Patterns representing clear failure triggers / anchors
const FAILURE_ANCHOR_PATTERNS: RegExp[] = [
  /##\[error\]/i,
  /Process completed with exit code [1-9]\d*/i,
  /exited with (status|code) [1-9]\d*/i,
  /Command failed with (exit code|status) [1-9]\d*/i,
  /npm ERR! code/i,
  /BUILD FAILED in/i,
  /> Task :.* FAILED/i,
  /Traceback \(most recent call last\):/i,
  /panic: runtime error:/i,
  /java\.lang\.[a-zA-Z0-9_]*Exception/i,
  /java\.lang\.OutOfMemoryError/i,
  /AssertionError:/i,
  /error\[E\d+\]:/i,
  /error TS\d+:/i,
  /FAIL:\s+[A-Za-z0-9_]+/i,
  /FAIL\s+.*\.test\.[jt]sx?/i,
  /FAILED\s+tests?\/./i,
  /Killed\s*$/i,
  /The security token included in the request is expired/i,
  /fatal error:\s+.*/i,
  /ECONNRESET|ETIMEDOUT|ECONNREFUSED/i,
];

// Repetitive high-noise patterns that can be suppressed if they repeat
const NOISE_LINE_PATTERNS: RegExp[] = [
  /^\s*[\.o\*#]{10,}\s*$/, // progress bars / dots
  /^\s*(downloading|fetching|extracting)\s+.*\d+%/i,
  /^\s*\[\s*\d+%\s*\]\s+Building/i,
  /^\s*PASS\s+tests?\/./i,
  /^\s*ok\s+\d+\s+-/i,
];

export class ExtractedWindow {
  failingStep: string;
  anchorLineNum: number;
  excerptLines: Array<{ line_number: number; content: string; is_anchor: boolean }>;
  totalRawLines: number;

  constructor(
    failingStep: string,
    anchorLineNum: number,
    excerptLines: Array<{ line_number: number; content: string; is_anchor: boolean }>,
    totalRawLines: number
  ) {
    this.failingStep = failingStep;
    this.anchorLineNum = anchorLineNum;
    this.excerptLines = excerptLines;
    this.totalRawLines = totalRawLines;
  }

  get excerptText(): string {
    return this.excerptLines
      .map((l) => `[${String(l.line_number).padStart(4, ' ')}] ${l.content}`)
      .join('\n');
  }

  get reductionPercentage(): number {
    if (this.totalRawLines <= 0) return 0.0;
    const reduced = Math.max(0, this.totalRawLines - this.excerptLines.length);
    return Math.round((reduced / this.totalRawLines) * 1000) / 10;
  }
}

export class NoiseReducer {
  contextBefore: number;
  contextAfter: number;

  constructor(contextBefore = 35, contextAfter = 25) {
    this.contextBefore = contextBefore;
    this.contextAfter = contextAfter;
  }

  extractTriageWindow(normalizedLog: NormalizedLog): ExtractedWindow {
    const lines = normalizedLog.lines;
    const totalLines = lines.length;
    if (totalLines === 0) {
      return new ExtractedWindow('Unknown Step', 0, [], 0);
    }

    // Step 1: Detect steps and find failure anchors
    let currentStep = 'Setup / Environment';
    const stepAtLine: Record<number, string> = {};
    const anchorIndices: number[] = [];

    for (let idx = 0; idx < lines.length; idx++) {
      const lineText = lines[idx].text;

      // Check step header
      for (const [pattern, groupIdx] of STEP_HEADER_PATTERNS) {
        const m = lineText.match(pattern);
        if (m && m[groupIdx]) {
          currentStep = m[groupIdx].trim();
          break;
        }
      }
      stepAtLine[idx] = currentStep;

      // Check failure anchor
      for (const anchorPat of FAILURE_ANCHOR_PATTERNS) {
        if (anchorPat.test(lineText)) {
          anchorIndices.push(idx);
          break;
        }
      }
    }

    // Fallback: look for generic error / failed
    if (anchorIndices.length === 0) {
      for (let idx = 0; idx < lines.length; idx++) {
        const lower = lines[idx].text.toLowerCase();
        if (lower.includes('error') || lower.includes('failed') || lower.includes('fatal')) {
          anchorIndices.push(idx);
        }
      }
    }

    let primaryAnchorIdx = 0;
    if (anchorIndices.length === 0) {
      primaryAnchorIdx = Math.max(0, totalLines - 1);
    } else {
      primaryAnchorIdx = this.selectPrimaryAnchor(lines, anchorIndices);
    }

    const failingStep = stepAtLine[primaryAnchorIdx] || 'Execute Pipeline';

    // Step 2: Slice the context window around the anchor
    const startIdx = Math.max(0, primaryAnchorIdx - this.contextBefore);
    const endIdx = Math.min(totalLines, primaryAnchorIdx + this.contextAfter + 1);

    const rawWindow = lines.slice(startIdx, endIdx);

    // Step 3: Filter out excessively noisy lines inside window
    let filteredWindow: Array<{ line_number: number; content: string; is_anchor: boolean }> = [];
    for (let i = 0; i < rawWindow.length; i++) {
      const globalIdx = startIdx + i;
      const isAnchor = anchorIndices.includes(globalIdx);
      const text = rawWindow[i].text;

      const isNoise = NOISE_LINE_PATTERNS.some((pat) => pat.test(text));
      if (isNoise && !isAnchor) {
        continue;
      }

      filteredWindow.push({
        line_number: rawWindow[i].lineNumber,
        content: text,
        is_anchor: isAnchor,
      });
    }

    if (filteredWindow.length === 0) {
      filteredWindow = rawWindow.map((l) => ({
        line_number: l.lineNumber,
        content: l.text,
        is_anchor: false,
      }));
    }

    const anchorLineNum =
      primaryAnchorIdx < lines.length ? lines[primaryAnchorIdx].lineNumber : 1;

    return new ExtractedWindow(failingStep, anchorLineNum, filteredWindow, totalLines);
  }

  private selectPrimaryAnchor(lines: NormalizedLine[], anchorIndices: number[]): number {
    const exitCodePat = /Process completed with exit code|exit status|Command failed with exit code/i;

    for (const idx of anchorIndices) {
      const lineText = lines[idx].text;
      if (!exitCodePat.test(lineText)) {
        return idx;
      }
    }

    return anchorIndices[0];
  }
}
