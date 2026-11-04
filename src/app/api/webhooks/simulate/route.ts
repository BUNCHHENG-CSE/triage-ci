import { NextRequest, NextResponse } from 'next/server';
import { triageEngine } from '@/lib/core/triage-engine';

const SIMULATION_SCENARIOS: Record<
  string,
  { title: string; repo: string; step: string; log: string }
> = {
  aws_sts: {
    title: 'AWS STS Session Token Expired',
    repo: 'acme-corp/billing-service',
    step: 'Deploy to AWS ECS',
    log: `2026-10-17T08:01:05.123Z ##[group]Run aws-actions/configure-aws-credentials@v4
2026-10-17T08:01:09.111Z Assuming role arn:aws:iam::123456789012:role/DeployRole
2026-10-17T08:01:10.222Z ##[endgroup]
2026-10-17T08:01:11.333Z ##[group]Run Deploy to AWS ECS Staging
2026-10-17T08:01:12.444Z > aws ecs update-service --cluster staging --service billing-api --force-new-deployment
2026-10-17T08:01:15.555Z An error occurred (ExpiredTokenException) when calling the UpdateService operation: The security token included in the request is expired
2026-10-17T08:01:16.666Z ##[error]Process completed with exit code 254.`,
  },
  jest_timeout: {
    title: 'Jest Async Timeout (Flaky)',
    repo: 'acme-corp/frontend-app',
    step: 'npm test',
    log: `2026-10-17T11:00:01.000Z ##[group]Run npm test
2026-10-17T11:00:05.000Z PASS src/auth.test.ts
2026-10-17T11:00:12.000Z FAIL src/payments/stripe-webhook.test.ts
2026-10-17T11:00:12.100Z   ● Stripe Webhook › should process async invoice payload
2026-10-17T11:00:12.200Z     Timeout - Async callback was not invoked within the 5000 ms timeout specified by jest.setTimeout.
2026-10-17T11:00:15.000Z ##[error]Process completed with exit code 1.`,
  },
  npm_eresolve: {
    title: 'NPM Peer Dependency Conflict',
    repo: 'acme-corp/admin-portal',
    step: 'npm install',
    log: `2026-10-17T09:12:00.100Z ##[group]Run npm install
2026-10-17T09:12:05.500Z npm ERR! code ERESOLVE
2026-10-17T09:12:05.501Z npm ERR! ERESOLVE unable to resolve dependency tree
2026-10-17T09:12:05.502Z npm ERR! While resolving: frontend-dashboard@1.0.0
2026-10-17T09:12:05.504Z npm ERR! Found: react@19.0.0
2026-10-17T09:12:05.508Z npm ERR! Could not resolve dependency:
2026-10-17T09:12:05.509Z npm ERR! peer react@"^18.0.0" from @legacy/table-grid@2.4.1
2026-10-17T09:12:06.600Z ##[error]Process completed with exit code 1.`,
  },
  exit_137: {
    title: 'Linux OOM Killer (Exit 137)',
    repo: 'acme-corp/ml-pipeline',
    step: 'python train_model.py',
    log: `2026-10-17T14:00:10.000Z ##[group]Run model training
2026-10-17T14:02:15.000Z Loading dataset (40 GB)...
2026-10-17T14:03:40.000Z Allocating batch tensor memory...
2026-10-17T14:04:12.000Z /entrypoint.sh: line 14: 4210 Killed                 python train_model.py
2026-10-17T14:04:13.000Z ##[error]Process completed with exit code 137.`,
  },
  rust_borrow: {
    title: 'Rust Borrow Checker Error (E0382)',
    repo: 'acme-corp/crypto-engine',
    step: 'cargo test',
    log: `$ cargo test
error[E0382]: use of moved value: \`db_conn\`
  --> src/main.rs:24:12
error: could not compile \`crypto-engine\`
Command failed with exit code 101`,
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const scenarioKey = body.scenario || 'aws_sts';
    const provider = body.provider || 'github_actions';

    const scenario = SIMULATION_SCENARIOS[scenarioKey] || SIMULATION_SCENARIOS.aws_sts;

    const result = await triageEngine.triageLog({
      raw_log: scenario.log,
      provider,
      repo_name: scenario.repo,
      branch: body.branch || 'main',
      commit_sha: body.commit_sha || 'f7b10ac',
      commit_author: body.commit_author || 'alex.dev@acme.com',
      workflow_name: `CI Pipeline (${provider.charAt(0).toUpperCase() + provider.slice(1)})`,
      job_name: scenario.step,
    });

    return NextResponse.json({
      status: 'simulation_successful',
      scenario: scenario.title,
      provider,
      triage_id: result.id,
      failing_step: result.exact_failing_step,
      action_type: result.action_type,
      root_cause: result.root_cause_summary,
      confidence: result.confidence_score,
      cluster_occurrences: result.cluster_occurrence_count,
      remediation_commands: result.remediation_commands,
      remediation_patch: result.remediation_patch,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
