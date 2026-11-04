import { NextRequest, NextResponse } from 'next/server';
import { triageEngine } from '@/lib/core/triage-engine';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => ({}));
    const jobName = payload.name || payload.job_name || 'jenkins-build-job';
    const buildInfo = payload.build || {};

    const scm = buildInfo.scm || {};
    const repoName = (scm.url || 'acme-corp/service')
      .replace('https://github.com/', '')
      .replace('.git', '');
    const branch = (scm.branch || 'main').replace('origin/', '');
    const commitSha = (scm.commit || 'HEAD').slice(0, 7);

    const rawLog =
      payload.raw_log ||
      buildInfo.log ||
      `[Pipeline] { (Build & Test)
[Pipeline] sh
+ ./gradlew test
> Task :test
java.lang.OutOfMemoryError: Java heap space
	at java.base/java.util.Arrays.copyOf(Arrays.java:3512)
> Task :test FAILED
[Pipeline] }
[Pipeline] ERROR: script returned exit code 1
Finished: FAILURE
`;

    const result = await triageEngine.triageLog({
      raw_log: rawLog,
      provider: 'jenkins',
      repo_name: repoName,
      branch,
      commit_sha: commitSha,
      commit_author: payload.author || 'jenkins-worker',
      workflow_name: jobName,
      job_name: jobName,
    });

    return NextResponse.json({
      status: 'triaged',
      triage_id: result.id,
      provider: 'jenkins',
      repo: repoName,
      job: jobName,
      failing_step: result.exact_failing_step,
      action_type: result.action_type,
      root_cause: result.root_cause_summary,
      cluster_occurrences: result.cluster_occurrence_count,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
