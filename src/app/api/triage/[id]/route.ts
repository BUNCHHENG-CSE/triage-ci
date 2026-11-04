import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRemediationPlaybook } from '@/lib/core/pattern-library';
import { TriageResult } from '@/lib/types';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const logId = parseInt(id, 10);
    if (isNaN(logId)) {
      return NextResponse.json({ detail: 'Invalid ID' }, { status: 400 });
    }

    const log = await prisma.failureLog.findUnique({
      where: { id: logId },
      include: { cluster: true },
    });

    if (!log) {
      return NextResponse.json({ detail: 'Triage report not found' }, { status: 404 });
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

    const result: TriageResult = {
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
      excerpt_lines: [],
      total_raw_lines: log.totalRawLines,
      reduction_percentage: 98.0,
      pr_comment_markdown: log.prCommentMarkdown || '',
      remediation_commands: remediationCmds,
      remediation_patch: remediationPatch,
      cluster_id: log.clusterId,
      cluster_occurrence_count: clusterCount,
      created_at: log.createdAt.toISOString(),
    };

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const logId = parseInt(id, 10);
    if (isNaN(logId)) {
      return NextResponse.json({ detail: 'Invalid ID' }, { status: 400 });
    }

    await prisma.failureLog.delete({
      where: { id: logId },
    });

    return NextResponse.json({ status: 'deleted', id: logId });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
