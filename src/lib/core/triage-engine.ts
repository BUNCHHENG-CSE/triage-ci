import { normalizeLog } from './normalizer';
import { NoiseReducer } from './noise-reducer';
import { PatternLibraryEngine, getRemediationPlaybook } from './pattern-library';
import { LLMProvider } from './llm-provider';
import { getOrCreateCluster } from './clustering';
import { formatGithubPrComment } from './pr-commenter';
import { prisma } from '../db';
import { TriageResult, ExcerptLine } from '../types';

export interface TriageInput {
  raw_log: string;
  provider?: string;
  repo_name?: string;
  branch?: string;
  commit_sha?: string;
  commit_author?: string;
  pr_number?: number | null;
  workflow_name?: string;
  job_name?: string;
}

export class TriageEngine {
  private noiseReducer = new NoiseReducer();
  private patternEngine = new PatternLibraryEngine();
  private llmProvider = new LLMProvider();

  async triageLog(input: TriageInput): Promise<TriageResult> {
    const rawLog = input.raw_log || '';

    // Step 1: Normalize log (ANSI removal, timestamp strip, secret redaction)
    const normalized = normalizeLog(rawLog);

    // Step 2: Noise reduction & window extraction
    const window = this.noiseReducer.extractTriageWindow(normalized);

    // Step 3: Pattern matching against the high-signal window
    let patternMatch = this.patternEngine.match(window.excerptText);
    if (!patternMatch) {
      patternMatch = this.patternEngine.match(normalized.getFullCleanedText());
    }

    // Step 4: Summarization (LLM or pattern-constrained heuristic)
    const analysis = await this.llmProvider.summarizeTriage({
      extractedExcerpt: window.excerptText,
      failingStepDetected: window.failingStep,
      patternMatch,
      jobName: input.job_name || 'CI Job',
      repoName: input.repo_name || 'repo',
    });

    const failingStep = analysis.exact_failing_step || window.failingStep;
    const category =
      analysis.root_cause_category ||
      (patternMatch ? patternMatch.category : 'UNKNOWN_FAILURE');
    const rootCauseSummary =
      analysis.root_cause_summary || 'Pipeline failed during step execution.';
    const actionType =
      analysis.action_type || (patternMatch ? patternMatch.action_type : 'FIX');
    const suggestedDirection =
      analysis.suggested_direction || 'Check step error output.';
    const confidenceScore = Number(analysis.confidence_score) || 0.9;

    // Step 5: Clustering, Fingerprint & Remediation Playbook
    let fingerprint: string;
    let clusterTitle: string;
    let remediationCommands: string[];
    let remediationPatch: string | null = null;

    if (patternMatch) {
      fingerprint = patternMatch.fingerprint;
      clusterTitle = patternMatch.title;
      remediationCommands = patternMatch.remediation_commands;
      remediationPatch = patternMatch.remediation_patch || null;
    } else {
      const safeStep = failingStep
        .toLowerCase()
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .slice(0, 30);
      fingerprint = `cluster:${category.toLowerCase()}:${safeStep}`;
      clusterTitle = `${category}: ${failingStep}`;

      const fallbackPlaybook = getRemediationPlaybook(
        'GENERIC',
        category,
        actionType,
        { entity: safeStep }
      );
      remediationCommands = fallbackPlaybook.commands;
      remediationPatch = fallbackPlaybook.patch_diff || null;
    }

    const { cluster, occurrenceCount } = await getOrCreateCluster({
      fingerprint,
      title: clusterTitle,
      category,
      suggestedActionType: actionType,
      suggestedDirection,
      repoName: input.repo_name || 'unknown/repo',
    });

    // Step 6: Convert excerpt lines to format
    const excerptLines: ExcerptLine[] = window.excerptLines.map((l) => ({
      line_number: l.line_number,
      content: l.content,
      is_anchor: l.is_anchor,
    }));

    // Step 7: Format GitHub PR comment
    const prComment = formatGithubPrComment({
      jobName: input.job_name || 'test',
      failingStep,
      rootCauseCategory: category,
      rootCauseSummary,
      actionType,
      suggestedDirection,
      confidenceScore,
      reductionPercentage: window.reductionPercentage,
      excerptLines,
      clusterOccurrences: occurrenceCount,
    });

    // Step 8: Persist failure log entry in database
    const dbLog = await prisma.failureLog.create({
      data: {
        provider: input.provider || 'github_actions',
        repoName: input.repo_name || 'unknown/repo',
        branch: input.branch || 'main',
        commitSha: input.commit_sha || 'HEAD',
        commitAuthor: input.commit_author || 'engineer',
        prNumber: input.pr_number ?? null,
        workflowName: input.workflow_name || 'CI Pipeline',
        jobName: input.job_name || 'test',
        exactFailingStep: failingStep,
        rootCauseCategory: category,
        rootCauseSummary: rootCauseSummary,
        actionType,
        suggestedDirection,
        confidenceScore,
        fingerprint,
        extractedExcerpt: window.excerptText,
        excerptStartLine: excerptLines[0]?.line_number ?? 1,
        excerptEndLine: excerptLines[excerptLines.length - 1]?.line_number ?? 1,
        totalRawLines: window.totalRawLines,
        rawLog: rawLog.slice(0, 50000), // safeguard max size
        prCommentMarkdown: prComment,
        remediationCommands: JSON.stringify(remediationCommands),
        remediationPatch,
        clusterId: cluster.id,
      },
    });

    return {
      id: dbLog.id,
      provider: dbLog.provider,
      repo_name: dbLog.repoName,
      branch: dbLog.branch,
      commit_sha: dbLog.commitSha,
      commit_author: dbLog.commitAuthor,
      pr_number: dbLog.prNumber,
      workflow_name: dbLog.workflowName,
      job_name: dbLog.jobName,
      exact_failing_step: dbLog.exactFailingStep,
      root_cause_category: dbLog.rootCauseCategory,
      root_cause_summary: dbLog.rootCauseSummary,
      action_type: dbLog.actionType,
      suggested_direction: dbLog.suggestedDirection,
      confidence_score: dbLog.confidenceScore,
      fingerprint: dbLog.fingerprint,
      extracted_excerpt: dbLog.extractedExcerpt,
      excerpt_lines: excerptLines,
      total_raw_lines: dbLog.totalRawLines,
      reduction_percentage: window.reductionPercentage,
      pr_comment_markdown: prComment,
      remediation_commands: remediationCommands,
      remediation_patch: remediationPatch,
      cluster_id: cluster.id,
      cluster_occurrence_count: occurrenceCount,
      created_at: dbLog.createdAt.toISOString(),
    };
  }
}

export const triageEngine = new TriageEngine();
