import { NextRequest, NextResponse } from 'next/server';
import { triageEngine } from '@/lib/core/triage-engine';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => ({}));
    const rawLog =
      payload.raw_log ||
      payload.log ||
      payload.error_message ||
      'Process failed with exit code 1.';

    const provider = payload.provider || 'custom_ci';
    const repoName = payload.repo_name || payload.repository || 'acme-corp/custom-app';
    const branch = payload.branch || 'main';
    const commitSha = payload.commit_sha || 'HEAD';
    const author = payload.commit_author || payload.author || 'engineer';
    const jobName = payload.job_name || payload.step_name || 'pipeline-job';

    const result = await triageEngine.triageLog({
      raw_log: rawLog,
      provider,
      repo_name: repoName,
      branch,
      commit_sha: commitSha,
      commit_author: author,
      workflow_name: payload.workflow_name || 'Custom CI Runner',
      job_name: jobName,
    });

    return NextResponse.json({
      status: 'triaged',
      triage_id: result.id,
      provider,
      repo: repoName,
      action_type: result.action_type,
      failing_step: result.exact_failing_step,
      root_cause: result.root_cause_summary,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
