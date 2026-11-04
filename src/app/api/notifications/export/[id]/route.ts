import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const logId = parseInt(id, 10);
    if (isNaN(logId)) {
      return NextResponse.json({ detail: 'Invalid ID' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'markdown';

    const log = await prisma.failureLog.findUnique({
      where: { id: logId },
    });

    if (!log) {
      return NextResponse.json({ detail: 'Triage log not found' }, { status: 404 });
    }

    if (format === 'json') {
      const data = {
        id: log.id,
        provider: log.provider,
        repository: log.repoName,
        branch: log.branch,
        commit: log.commitSha,
        author: log.commitAuthor,
        failing_step: log.exactFailingStep,
        category: log.rootCauseCategory,
        root_cause: log.rootCauseSummary,
        action_type: log.actionType,
        suggested_direction: log.suggestedDirection,
        remediation_commands: log.remediationCommands,
        remediation_patch: log.remediationPatch,
        fingerprint: log.fingerprint,
        created_at: log.createdAt.toISOString(),
      };

      return new NextResponse(JSON.stringify(data, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename=tct-triageci-report-${logId}.json`,
        },
      });
    } else {
      const md =
        log.prCommentMarkdown ||
        `# CI/CD Failure Triage Report #${log.id}
**Repository:** \`${log.repoName}\` (${log.branch})  
**Failing Step:** \`${log.exactFailingStep}\`  
**Category:** \`${log.rootCauseCategory}\`  
**Action:** \`${log.actionType}\`  

## Root Cause
${log.rootCauseSummary}

## Suggested Direction
${log.suggestedDirection}
`;

      return new NextResponse(md, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename=tct-triageci-report-${logId}.md`,
        },
      });
    }
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
