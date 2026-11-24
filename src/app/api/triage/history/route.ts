import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRemediationPlaybook } from '@/lib/core/pattern-library';
import { TriageResult, ExcerptLine } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));
    const search = searchParams.get('search')?.trim();
    const category = searchParams.get('category')?.trim();
    const actionType = searchParams.get('action_type')?.trim();
    const provider = searchParams.get('provider')?.trim();
    const repoName = searchParams.get('repo_name')?.trim();

    const where: any = {};

    if (category && category.toUpperCase() !== 'ALL') {
      where.rootCauseCategory = category.toUpperCase();
    }

    if (actionType && actionType.toUpperCase() !== 'ALL') {
      where.actionType = actionType.toUpperCase();
    }

    if (provider && provider.toLowerCase() !== 'all') {
      where.provider = provider.toLowerCase();
    }

    if (repoName) {
      where.repoName = { contains: repoName };
    }

    if (search) {
      where.OR = [
        { repoName: { contains: search } },
        { branch: { contains: search } },
        { commitSha: { contains: search } },
        { commitAuthor: { contains: search } },
        { exactFailingStep: { contains: search } },
        { rootCauseSummary: { contains: search } },
        { fingerprint: { contains: search } },
      ];
    }

    const logs = await prisma.failureLog.findMany({
      where,
      omit: { rawLog: true },
      include: { cluster: { select: { occurrenceCount: true } } },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    const results: TriageResult[] = logs.map((log) => {
      const excerptLines: ExcerptLine[] = [];
      if (log.extractedExcerpt) {
        const rawLines = log.extractedExcerpt.split('\n').slice(0, 30);
        for (const lineStr of rawLines) {
          const parts = lineStr.split(']');
          let num = 1;
          let content = lineStr;
          if (parts.length >= 2 && parts[0].startsWith('[')) {
            const parsed = parseInt(parts[0].replace('[', '').trim(), 10);
            if (!isNaN(parsed)) {
              num = parsed;
              content = parts.slice(1).join(']').trim();
            }
          }
          excerptLines.push({ line_number: num, content, is_anchor: false });
        }
      }

      let remediationCmds: string[] = [];
      let remediationPatch: string | null = log.remediationPatch || null;
      if (log.remediationCommands) {
        try {
          remediationCmds = JSON.parse(log.remediationCommands);
        } catch {
          remediationCmds = [log.remediationCommands];
        }
      }

      if (remediationCmds.length === 0) {
        const pb = getRemediationPlaybook(
          'GENERIC',
          log.rootCauseCategory,
          log.actionType,
          { entity: log.exactFailingStep }
        );
        remediationCmds = pb.commands;
        if (!remediationPatch) {
          remediationPatch = pb.patch_diff || null;
        }
      }

      const clusterCount = log.cluster ? log.cluster.occurrenceCount : 1;
      const reductionPct = Math.round(
        (Math.max(0, log.totalRawLines - excerptLines.length) / Math.max(1, log.totalRawLines)) * 1000
      ) / 10;

      return {
        id: log.id,
        provider: log.provider,
        repo_name: log.repoName,
        branch: log.branch,
        commit_sha: log.commitSha,
        commit_author: log.commitAuthor,
        pr_number: log.prNumber,
        workflow_name: log.workflowName,
        job_name: log.jobName,
        exact_failing_step: log.exactFailingStep,
        root_cause_category: log.rootCauseCategory,
        root_cause_summary: log.rootCauseSummary,
        action_type: log.actionType,
        suggested_direction: log.suggestedDirection,
        confidence_score: log.confidenceScore,
        fingerprint: log.fingerprint,
        extracted_excerpt: log.extractedExcerpt,
        excerpt_lines: excerptLines,
        total_raw_lines: log.totalRawLines,
        reduction_percentage: reductionPct,
        pr_comment_markdown: log.prCommentMarkdown || '',
        remediation_commands: remediationCmds,
        remediation_patch: remediationPatch,
        cluster_id: log.clusterId,
        cluster_occurrence_count: clusterCount,
        created_at: log.createdAt.toISOString(),
      };
    });

    return NextResponse.json(results);
  } catch (err: any) {
    console.error('Error in /api/triage/history:', err);
    return NextResponse.json(
      { error: 'Failed to fetch triage history', detail: err.message },
      { status: 500 }
    );
  }
}
