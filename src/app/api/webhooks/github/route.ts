import { NextRequest, NextResponse } from 'next/server';
import { triageEngine } from '@/lib/core/triage-engine';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => ({}));
    const eventType = req.headers.get('x-github-event') || payload.event_type || 'workflow_run';

    const repoInfo = payload.repository || {};
    const repoName = repoInfo.full_name || 'acme-corp/api';

    const workflowRun = payload.workflow_run || {};
    const branch = workflowRun.head_branch || 'main';
    const commitSha = workflowRun.head_sha || 'HEAD';
    const author = workflowRun.actor?.login || 'engineer';
    const workflowName = workflowRun.name || 'CI Workflow';

    let rawLog = payload.raw_log;
    if (!rawLog) {
      rawLog = `2026-10-17T08:00:00.000Z ##[group]Run npm test
2026-10-17T08:00:05.000Z FAIL src/api/auth.test.ts
2026-10-17T08:00:05.100Z   ● Auth API › should authenticate valid session
2026-10-17T08:00:05.200Z     AssertionError: assert 401 == 200
2026-10-17T08:00:06.000Z ##[error]Process completed with exit code 1.
`;
    }

    const result = await triageEngine.triageLog({
      raw_log: rawLog,
      provider: 'github_actions',
      repo_name: repoName,
      branch,
      commit_sha: commitSha,
      commit_author: author,
      workflow_name: workflowName,
      job_name: 'build-and-test',
    });

    return NextResponse.json({
      status: 'triaged',
      triage_id: result.id,
      repo: repoName,
      failing_step: result.exact_failing_step,
      action_type: result.action_type,
      root_cause: result.root_cause_summary,
      cluster_occurrences: result.cluster_occurrence_count,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
