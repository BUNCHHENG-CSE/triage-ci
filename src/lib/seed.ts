import { prisma } from './db';

export async function seedInitialDemoData() {
  try {
    // Check if initial cluster is already present
    const existing = await prisma.failureCluster.findUnique({
      where: { fingerprint: 'cred_aws_sts:cred_aws_sts_expired:generic' },
    });

    if (existing) {
      return;
    }

    // Seed recurring cluster 1: AWS STS Session Token Expired (14 occurrences)
    const credCluster = await prisma.failureCluster.create({
      data: {
        fingerprint: 'cred_aws_sts:cred_aws_sts_expired:generic',
        title: 'AWS STS Session Token Expired',
        category: 'CREDENTIALS_AUTH',
        suggestedActionType: 'FIX',
        suggestedDirection: "Rotate or re-authenticate AWS credentials. In GitHub Actions, ensure 'aws-actions/configure-aws-credentials' uses a fresh role session.",
        occurrenceCount: 14,
        status: 'ACTIVE',
        affectedRepos: JSON.stringify([
          'acme-corp/payment-service',
          'acme-corp/billing-worker',
          'acme-corp/user-api'
        ]),
      },
    });

    // Seed recurring cluster 2: Jest Async Timeout Flaky test (8 occurrences)
    const flakyCluster = await prisma.failureCluster.create({
      data: {
        fingerprint: 'flk_jest_timeout:flk_jest_async_timeout:5000',
        title: 'Jest Asynchronous Callback Timeout (Flaky)',
        category: 'FLAKY_CONCURRENCY',
        suggestedActionType: 'RERUN',
        suggestedDirection: 'Safe to rerun pipeline. Increase jest.setTimeout or mock external network dependencies.',
        occurrenceCount: 8,
        status: 'ACTIVE',
        affectedRepos: JSON.stringify(['acme-corp/frontend-app']),
      },
    });

    // Seed recurring cluster 3: NPM Peer Dependency Conflict (5 occurrences)
    const depCluster = await prisma.failureCluster.create({
      data: {
        fingerprint: 'dep_npm_eresolve:dep_npm_eresolve:generic',
        title: 'NPM Peer Dependency Conflict (ERESOLVE)',
        category: 'DEPENDENCY',
        suggestedActionType: 'FIX',
        suggestedDirection: 'Align peer dependency versions in package.json or use `npm install --legacy-peer-deps`.',
        occurrenceCount: 5,
        status: 'ACTIVE',
        affectedRepos: JSON.stringify(['acme-corp/admin-portal', 'acme-corp/checkout-ui']),
      },
    });

    // Seed recurring cluster 4: Linux OOM Killer (4 occurrences)
    const oomCluster = await prisma.failureCluster.create({
      data: {
        fingerprint: 'res_oom_137:res_oom_exit_137:generic',
        title: 'Process Killed by Linux OOM Killer (Exit 137)',
        category: 'RESOURCE_LIMIT',
        suggestedActionType: 'FIX',
        suggestedDirection: 'Increase runner memory allocation or set `--maxWorkers=2` in test runner.',
        occurrenceCount: 4,
        status: 'ACTIVE',
        affectedRepos: JSON.stringify(['acme-corp/e2e-cypress']),
      },
    });

    // Seed sample FailureLog records associated with these clusters
    await prisma.failureLog.create({
      data: {
        provider: 'github_actions',
        repoName: 'acme-corp/payment-service',
        branch: 'staging',
        commitSha: 'c9f8a12',
        commitAuthor: 'sarah.chen@acme.com',
        prNumber: 142,
        workflowName: 'Deploy to Staging',
        jobName: 'deploy-ecs',
        exactFailingStep: 'Deploy to AWS ECS Staging',
        rootCauseCategory: 'CREDENTIALS_AUTH',
        rootCauseSummary: 'AWS temporary security credentials or STS session token expired during pipeline execution.',
        actionType: 'FIX',
        suggestedDirection: 'Rotate or re-authenticate AWS credentials in GitHub Secrets (AWS_SECRET_ACCESS_KEY).',
        confidenceScore: 0.98,
        fingerprint: 'cred_aws_sts:cred_aws_sts_expired:generic',
        extractedExcerpt: '[  7] > aws ecs update-service --cluster staging-cluster --service payment-api\n[  8] An error occurred (ExpiredTokenException) when calling the UpdateService operation: The security token included in the request is expired\n[  9] ##[error]Process completed with exit code 254.',
        excerptStartLine: 7,
        excerptEndLine: 9,
        totalRawLines: 4200,
        prCommentMarkdown: `### 🔴 CI/CD Failure Triage Report: \`deploy-ecs\`

🛠️ **RECOMMENDATION: CODE/CONFIG FIX REQUIRED**

> ⚠️ **Recurring Issue Detected:** This same root cause has caused **14 failures** across the repository.

| Attribute | Details |
| :--- | :--- |
| **Category** | \`CREDENTIALS_AUTH\` |
| **Failing Step** | \`Deploy to AWS ECS Staging\` |
| **Confidence** | \`98%\` |
| **Noise Reduction** | \`99.3%\` of console log pruned |

#### 🔍 Root Cause Analysis
AWS temporary security credentials or STS session token expired during pipeline execution.

#### 💡 Suggested Action
Rotate or re-authenticate AWS credentials in GitHub Secrets (AWS_SECRET_ACCESS_KEY).

<details>
<summary><b>📄 View Extracted Log Evidence (3 high-signal lines)</b></summary>

\`\`\`log
   7 | > aws ecs update-service --cluster staging-cluster --service payment-api
   8 | An error occurred (ExpiredTokenException) when calling the UpdateService operation: The security token included in the request is expired
   9 | ##[error]Process completed with exit code 254.
\`\`\`
</details>

---
*TCT TriageCI Diagnostic Engine • No pipeline editing • Fast attribution*`,
        remediationCommands: JSON.stringify([
          'aws sts get-caller-identity',
          'aws sso login --profile staging',
          'gh secret set AWS_SESSION_TOKEN --body "<FRESH_SESSION_TOKEN>"'
        ]),
        remediationPatch: `# .github/workflows/deploy.yml
- uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789012:role/DeployRole
    aws-region: us-east-1
+   role-duration-seconds: 3600`,
        clusterId: credCluster.id,
      },
    });

    await prisma.failureLog.create({
      data: {
        provider: 'github_actions',
        repoName: 'acme-corp/frontend-app',
        branch: 'feat/checkout-redesign',
        commitSha: '8e104bc',
        commitAuthor: 'marcus.v@acme.com',
        prNumber: 88,
        workflowName: 'CI / Unit & Integration Tests',
        jobName: 'test-web',
        exactFailingStep: 'npm test',
        rootCauseCategory: 'FLAKY_CONCURRENCY',
        rootCauseSummary: 'Test timed out waiting for an asynchronous callback in stripe-webhook.test.ts.',
        actionType: 'RERUN',
        suggestedDirection: 'Safe to RERUN the pipeline. This is an asynchronous mock latency blip.',
        confidenceScore: 0.94,
        fingerprint: 'flk_jest_timeout:flk_jest_async_timeout:5000',
        extractedExcerpt: '[ 42] FAIL src/payments/stripe-webhook.test.ts\n[ 43]   Timeout - Async callback was not invoked within the 5000 ms timeout specified by jest.setTimeout.\n[ 44] ##[error]Process completed with exit code 1.',
        excerptStartLine: 42,
        excerptEndLine: 44,
        totalRawLines: 2850,
        prCommentMarkdown: `### 🔴 CI/CD Failure Triage Report: \`test-web\`

🔄 **RECOMMENDATION: SAFE TO RERUN**

> ⚠️ **Recurring Issue Detected:** This same root cause has caused **8 failures** across the repository.

| Attribute | Details |
| :--- | :--- |
| **Category** | \`FLAKY_CONCURRENCY\` |
| **Failing Step** | \`npm test\` |
| **Confidence** | \`94%\` |
| **Noise Reduction** | \`98.5%\` of console log pruned |

#### 🔍 Root Cause Analysis
Test timed out waiting for an asynchronous callback in stripe-webhook.test.ts.

#### 💡 Suggested Action
Safe to RERUN the pipeline. This is an asynchronous mock latency blip.

---
*TCT TriageCI Diagnostic Engine • No pipeline editing • Fast attribution*`,
        remediationCommands: JSON.stringify([
          'npx jest --testTimeout=15000 --detectOpenHandles',
          'gh run rerun <RUN_ID> --failed'
        ]),
        remediationPatch: `// jest.config.js or test file
- jest.setTimeout(5000);
+ jest.setTimeout(15000); // Allow async network margin`,
        clusterId: flakyCluster.id,
      },
    });

    await prisma.failureLog.create({
      data: {
        provider: 'github_actions',
        repoName: 'acme-corp/admin-portal',
        branch: 'fix/grid-bump',
        commitSha: '1122ab3',
        commitAuthor: 'alex.t@acme.com',
        prNumber: 310,
        workflowName: 'Node CI',
        jobName: 'build',
        exactFailingStep: 'npm install',
        rootCauseCategory: 'DEPENDENCY',
        rootCauseSummary: 'NPM package dependency conflict: conflicting peer dependency requirements for react@19.0.0.',
        actionType: 'FIX',
        suggestedDirection: 'Align peer dependencies or install with --legacy-peer-deps.',
        confidenceScore: 0.98,
        fingerprint: 'dep_npm_eresolve:dep_npm_eresolve:generic',
        extractedExcerpt: '[ 15] npm ERR! code ERESOLVE\n[ 16] npm ERR! ERESOLVE unable to resolve dependency tree\n[ 17] npm ERR! Could not resolve dependency: peer react@"^18.0.0"\n[ 18] ##[error]Process completed with exit code 1.',
        excerptStartLine: 15,
        excerptEndLine: 18,
        totalRawLines: 1840,
        prCommentMarkdown: `### 🔴 CI/CD Failure Triage Report: \`build\`

🛠️ **RECOMMENDATION: CODE/CONFIG FIX REQUIRED**

> ⚠️ **Recurring Issue Detected:** This same root cause has caused **5 failures** across the repository.

| Attribute | Details |
| :--- | :--- |
| **Category** | \`DEPENDENCY\` |
| **Failing Step** | \`npm install\` |
| **Confidence** | \`98%\` |
| **Noise Reduction** | \`99.0%\` of console log pruned |

#### 🔍 Root Cause Analysis
NPM package dependency conflict: conflicting peer dependency requirements for react@19.0.0.

#### 💡 Suggested Action
Align peer dependencies or install with --legacy-peer-deps.

---
*TCT TriageCI Diagnostic Engine • No pipeline editing • Fast attribution*`,
        remediationCommands: JSON.stringify([
          'npm install --legacy-peer-deps',
          'npm dedupe',
          'git add package.json package-lock.json && git commit -m "fix(deps): reconcile peer dependencies"'
        ]),
        remediationPatch: `# .github/workflows/ci.yml
- run: npm ci
+ run: npm ci --legacy-peer-deps`,
        clusterId: depCluster.id,
      },
    });

  } catch (error) {
    console.error('Error seeding initial demo data:', error);
  }
}
