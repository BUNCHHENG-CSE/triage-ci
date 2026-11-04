import { NextRequest, NextResponse } from 'next/server';
import { triageEngine } from '@/lib/core/triage-engine';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => ({}));
    const objectAttrs = payload.object_attributes || {};

    const project = payload.project || {};
    const repoName = project.path_with_namespace || 'gitlab-org/project';
    const branch = objectAttrs.ref || 'main';
    const commitSha = objectAttrs.sha || 'HEAD';
    const author = payload.user?.username || 'developer';

    const rawLog =
      payload.raw_log ||
      `$ cargo test
error[E0382]: use of moved value: \`db_conn\`
  --> src/main.rs:24:12
error: could not compile \`app\`
Command failed with exit code 101
`;

    const result = await triageEngine.triageLog({
      raw_log: rawLog,
      provider: 'gitlab_ci',
      repo_name: repoName,
      branch,
      commit_sha: commitSha,
      commit_author: author,
      workflow_name: 'GitLab Pipeline',
      job_name: 'test-stage',
    });

    return NextResponse.json({
      status: 'triaged',
      triage_id: result.id,
      repo: repoName,
      root_cause: result.root_cause_summary,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
