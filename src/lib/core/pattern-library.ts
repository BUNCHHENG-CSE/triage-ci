export interface PatternMatch {
  pattern_id: string;
  category: string;
  action_type: 'RERUN' | 'FIX' | string;
  title: string;
  summary: string;
  suggested_direction: string;
  confidence: number;
  fingerprint: string;
  extracted_entities: Record<string, string>;
  remediation_commands: string[];
  remediation_patch?: string | null;
}

export function getRemediationPlaybook(
  patternId: string,
  category: string,
  actionType: string,
  entities: Record<string, string> = {}
): { commands: string[]; patch_diff?: string | null } {
  const entity = entities.entity || '';

  if (patternId === 'CRED_AWS_STS_EXPIRED') {
    return {
      commands: [
        'aws sts get-caller-identity',
        'aws sso login --profile staging',
        'gh secret set AWS_SESSION_TOKEN --body "<FRESH_SESSION_TOKEN>"',
      ],
      patch_diff: `# .github/workflows/deploy.yml
- uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789012:role/DeployRole
    aws-region: us-east-1
+   role-duration-seconds: 3600`,
    };
  }

  if (patternId === 'CRED_GITHUB_PAT_EXPIRED') {
    return {
      commands: [
        'gh auth login --scopes repo,workflow',
        'gh secret set GH_TOKEN --body "<NEW_PAT_TOKEN>"',
      ],
      patch_diff: `# .github/workflows/ci.yml
- uses: actions/checkout@v4
+ uses: actions/checkout@v4
+   with:
+     token: \${{ secrets.PAT_GITHUB }}`,
    };
  }

  if (patternId === 'CRED_DOCKER_UNAUTHORIZED') {
    return {
      commands: [
        `docker login ${entity || 'docker.io'}`,
        'gh secret set DOCKER_PASSWORD --body "<ACCESS_TOKEN>"',
      ],
      patch_diff: `- uses: docker/login-action@v3
  with:
-   password: \${{ secrets.OLD_PASSWORD }}
+   password: \${{ secrets.DOCKERHUB_TOKEN }}`,
    };
  }

  if (patternId === 'DEP_NPM_ERESOLVE') {
    return {
      commands: [
        'npm install --legacy-peer-deps',
        'npm dedupe',
        'git add package.json package-lock.json && git commit -m "fix(deps): reconcile peer dependencies"',
      ],
      patch_diff: `# .github/workflows/ci.yml
- run: npm ci
+ run: npm ci --legacy-peer-deps`,
    };
  }

  if (patternId === 'DEP_PIP_RESOLVELIB_FAIL') {
    return {
      commands: [
        'pip install --upgrade pip setuptools wheel',
        `pip install ${entity || 'package'} --use-deprecated=legacy-resolver`,
        'pip freeze > requirements.txt',
      ],
      patch_diff: `# requirements.txt
- conflicting-pkg==1.0.0
+ conflicting-pkg>=1.0,<2.0`,
    };
  }

  if (patternId === 'RES_JAVA_HEAP_SPACE') {
    return {
      commands: [
        'export GRADLE_OPTS="-Xmx4096m -XX:MaxMetaspaceSize=1024m"',
        './gradlew --stop && ./gradlew test --no-daemon',
      ],
      patch_diff: `# gradle.properties or CI runner env
+ org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m
+ org.gradle.parallel=false`,
    };
  }

  if (patternId === 'RES_OOM_EXIT_137') {
    return {
      commands: ['docker system prune -af --volumes', 'npm test -- --maxWorkers=50%'],
      patch_diff: `# In CI runner job config
- runs-on: ubuntu-latest
+ runs-on: ubuntu-latest-8core  # Or limit test worker concurrency
- run: npm test
+ run: npm test -- --maxWorkers=2`,
    };
  }

  if (patternId === 'FLK_JEST_ASYNC_TIMEOUT') {
    return {
      commands: [
        'npx jest --testTimeout=15000 --detectOpenHandles',
        'gh run rerun <RUN_ID> --failed',
      ],
      patch_diff: `// jest.config.js or test file
- jest.setTimeout(5000);
+ jest.setTimeout(15000); // Allow async network margin`,
    };
  }

  if (patternId === 'FLK_GO_RACE_DETECTED') {
    return {
      commands: ['go test -race -v -count=1 ./...', 'go vet ./...'],
      patch_diff: `// Synchronize concurrent variable access with sync.Mutex:
+ var mu sync.RWMutex
+ mu.Lock()
+ defer mu.Unlock()`,
    };
  }

  if (patternId === 'FLK_PORT_EADDRINUSE') {
    return {
      commands: [
        'lsof -ti :3000 | xargs kill -9 2>/dev/null || true',
        'gh run rerun <RUN_ID> --failed',
      ],
      patch_diff: `# Use ephemeral dynamic port (port 0) for CI testing
- env:
-   PORT: 3000
+ env:
+   PORT: 0`,
    };
  }

  if (patternId === 'FLK_DB_DEADLOCK') {
    return {
      commands: ['gh run rerun <RUN_ID> --failed', 'pytest --dist=loadscope'],
      patch_diff: `# In test execution command:
- pytest -n auto
+ pytest -n auto --dist=loadscope`,
    };
  }

  if (patternId === 'CODE_TYPESCRIPT_TS2322') {
    return {
      commands: ['npx tsc --noEmit --pretty'],
      patch_diff: `// Reconcile TypeScript types
- const data: TargetType = rawResponse;
+ const data: TargetType = rawResponse as unknown as TargetType;`,
    };
  }

  if (patternId === 'CODE_ESLINT_RULE_FAIL') {
    return {
      commands: ['npx eslint --fix .', 'npm run lint'],
      patch_diff: `// Resolve unused declaration or add underscore prefix:
- const unusedVar = compute();
+ const _unusedVar = compute();`,
    };
  }

  if (patternId === 'CODE_RUST_BORROW_E0382') {
    return {
      commands: ['cargo check', 'cargo test'],
      patch_diff: `// Clone or borrow reference before move:
- audit_log.record(user_session.id);
+ audit_log.record(user_session.id.clone());`,
    };
  }

  if (patternId === 'TEST_PYTEST_ASSERTION') {
    return {
      commands: ['pytest -vv tests/ -k "<FAILING_TEST_NAME>"', 'pytest --pdb'],
      patch_diff: `# Update expected assertion or fix logic regression:
- assert response.status_code == 200
+ assert response.status_code == expected_code`,
    };
  }

  if (patternId === 'INF_MISSING_ENV_VAR') {
    return {
      commands: [
        `gh secret set ${entity || 'DATABASE_URL'} --body "<SECRET_VALUE>"`,
        'export DATABASE_URL="postgresql://localhost:5432/test"',
      ],
      patch_diff: `# .github/workflows/ci.yml
  env:
+   ${entity || 'DATABASE_URL'}: \${{ secrets.${entity || 'DATABASE_URL'} }}`,
    };
  }

  if (patternId === 'INF_DOCKER_COPY_MISSING') {
    return {
      commands: ['npm run build', 'ls -la dist/', 'docker build -t test .'],
      patch_diff: `# .dockerignore or Dockerfile
- dist/
+ # Ensure build artifact step runs before docker build`,
    };
  }

  if (patternId === 'INF_TERRAFORM_ACCESS_DENIED') {
    return {
      commands: [
        'terraform plan',
        'aws iam get-role-policy --role-name <CI_ROLE> --policy-name <POLICY>',
      ],
      patch_diff: `# Add missing permission to IAM policy:
+ "Action": [
+   "s3:PutBucketPolicy"
+ ]`,
    };
  }

  if (patternId === 'INF_SSL_CERT_EXPIRED') {
    return {
      commands: [
        'curl -vI https://registry.internal.acme.com',
        'openssl s_client -connect registry.internal.acme.com:443 -showcerts',
      ],
      patch_diff: `# Renew certificate or pass CA bundle to runner
+ NODE_EXTRA_CA_CERTS=/path/to/internal-ca.pem`,
    };
  }

  if (patternId === 'NET_NPM_ECONNRESET' || patternId === 'NET_CURL_28_TIMEOUT') {
    return {
      commands: ['gh run rerun <RUN_ID> --failed'],
      patch_diff: `# Add retry wrapper around network step:
+ uses: nick-fields/retry@v3
+   with:
+     timeout_minutes: 5
+     max_attempts: 3
+     command: npm ci`,
    };
  }

  if (actionType === 'RERUN') {
    return {
      commands: [
        'gh run rerun <RUN_ID> --failed',
        'git commit --allow-empty -m "ci: trigger retry on transient failure" && git push',
      ],
      patch_diff: `# Add auto-retry wrapper around flaky/transient CI step:
+ uses: nick-fields/retry@v3
+   with:
+     max_attempts: 2
+     command: npm test`,
    };
  }

  return {
    commands: ['git status', 'git diff', 'npm test  # or pytest / cargo test locally'],
    patch_diff: `# Inspect failing test/lint step output and reconcile config:
- failing_configuration: old_value
+ failing_configuration: corrected_value`,
  };
}

export class FailurePattern {
  pattern_id: string;
  category: string;
  action_type: string;
  regex_list: RegExp[];
  title: string;
  summary_template: string;
  suggested_direction: string;
  confidence: number;
  fingerprint_prefix: string;

  constructor(config: {
    pattern_id: string;
    category: string;
    action_type: string;
    regex_list: RegExp[];
    title: string;
    summary_template: string;
    suggested_direction: string;
    confidence?: number;
    fingerprint_prefix?: string;
  }) {
    this.pattern_id = config.pattern_id;
    this.category = config.category;
    this.action_type = config.action_type;
    this.regex_list = config.regex_list;
    this.title = config.title;
    this.summary_template = config.summary_template;
    this.suggested_direction = config.suggested_direction;
    this.confidence = config.confidence ?? 0.95;
    this.fingerprint_prefix = config.fingerprint_prefix ?? 'cluster';
  }

  match(text: string): PatternMatch | null {
    for (const pattern of this.regex_list) {
      const m = text.match(pattern);
      if (m) {
        let entityName = '';
        if (m.groups && m.groups.name) {
          entityName = m.groups.name;
        } else if (m[1]) {
          entityName = m[1].trim();
        }

        let summary = this.summary_template;
        if (summary.includes('{entity}')) {
          summary = summary.replace(/{entity}/g, entityName || 'component');
        }

        const safeEntity = entityName
          ? entityName.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 40).toLowerCase()
          : 'generic';
        const fingerprint = `${this.fingerprint_prefix}:${this.pattern_id}:${safeEntity}`.toLowerCase();

        const playbook = getRemediationPlaybook(
          this.pattern_id,
          this.category,
          this.action_type,
          { entity: entityName }
        );

        return {
          pattern_id: this.pattern_id,
          category: this.category,
          action_type: this.action_type,
          title: this.title,
          summary,
          suggested_direction: this.suggested_direction,
          confidence: this.confidence,
          fingerprint,
          extracted_entities: { entity: entityName },
          remediation_commands: playbook.commands,
          remediation_patch: playbook.patch_diff || null,
        };
      }
    }
    return null;
  }
}

export const FAILURE_PATTERNS: FailurePattern[] = [
  // 1. CREDENTIALS & AUTH
  new FailurePattern({
    pattern_id: 'CRED_AWS_STS_EXPIRED',
    category: 'CREDENTIALS_AUTH',
    action_type: 'FIX',
    regex_list: [
      /The security token included in the request is expired/i,
      /ExpiredTokenException/i,
      /ExpiredToken: The security token included in the request is expired/i,
    ],
    title: 'AWS STS Session Token Expired',
    summary_template: 'AWS temporary security credentials or STS session token expired during pipeline execution.',
    suggested_direction: "Rotate or re-authenticate AWS credentials. In GitHub Actions, ensure 'aws-actions/configure-aws-credentials' uses a fresh role session or check AWS IAM role session duration limits.",
    confidence: 0.98,
    fingerprint_prefix: 'cred_aws_sts',
  }),

  new FailurePattern({
    pattern_id: 'CRED_GITHUB_PAT_EXPIRED',
    category: 'CREDENTIALS_AUTH',
    action_type: 'FIX',
    regex_list: [
      /remote:\s+Invalid username or password/i,
      /fatal: Authentication failed for ['"]https:\/\/github\.com\/(?<name>[^/'"\s]+\/[^/'"\s]+)/i,
      /Bad credentials.*api\.github\.com/i,
      /HTTP 401: Bad credentials/i,
    ],
    title: 'GitHub Authentication / PAT Expired',
    summary_template: "GitHub Personal Access Token or workflow secret has expired or lacks repository scope for '{entity}'.",
    suggested_direction: 'Update the expired repository secret (e.g. GH_TOKEN or PERSONAL_ACCESS_TOKEN) with a valid token possessing appropriate read/write scopes.',
    confidence: 0.97,
    fingerprint_prefix: 'cred_gh_pat',
  }),

  new FailurePattern({
    pattern_id: 'CRED_DOCKER_UNAUTHORIZED',
    category: 'CREDENTIALS_AUTH',
    action_type: 'FIX',
    regex_list: [
      /unauthorized:\s+authentication required/i,
      /denied:\s+requested access to the resource is denied/i,
      /Error response from daemon:\s+Get "https:\/\/(?<name>[^/]+)\/v2\/.*unauthorized/i,
    ],
    title: 'Container Registry Authentication Failed',
    summary_template: "Registry credentials for '{entity}' failed authentication or token lack push/pull permissions.",
    suggested_direction: 'Verify Docker Hub, ECR, or GHCR login step (e.g. `docker/login-action`) secrets: verify username and password/token validity.',
    confidence: 0.96,
    fingerprint_prefix: 'cred_docker_auth',
  }),

  new FailurePattern({
    pattern_id: 'CRED_VAULT_TOKEN_EXPIRED',
    category: 'CREDENTIALS_AUTH',
    action_type: 'FIX',
    regex_list: [
      /Vault.*permission denied.*token expired/i,
      /code: 403.*token is expired/i,
    ],
    title: 'HashiCorp Vault Token Expired',
    summary_template: 'Vault access token expired prior to fetching required secrets.',
    suggested_direction: 'Renew Vault authentication token or reconfigure Vault AppRole/OIDC authentication in CI.',
    confidence: 0.95,
    fingerprint_prefix: 'cred_vault',
  }),

  // 2. DEPENDENCY RESOLUTION & LOCKFILE
  new FailurePattern({
    pattern_id: 'DEP_NPM_ERESOLVE',
    category: 'DEPENDENCY',
    action_type: 'FIX',
    regex_list: [
      /npm ERR! code ERESOLVE[\s\S]*?Could not resolve dependency:[\s\S]*?peer (?<name>[@a-zA-Z0-9_\-\.\/]+)/i,
      /npm ERR! code ERESOLVE/i,
      /ERESOLVE unable to resolve dependency tree/i,
    ],
    title: 'NPM Peer Dependency Conflict (ERESOLVE)',
    summary_template: "NPM package dependency conflict: conflicting peer dependency requirements for '{entity}'.",
    suggested_direction: 'Align conflicting peer versions in package.json or use `npm install --legacy-peer-deps` / update package-lock.json to reconcile the tree.',
    confidence: 0.98,
    fingerprint_prefix: 'dep_npm_eresolve',
  }),

  new FailurePattern({
    pattern_id: 'DEP_PIP_RESOLVELIB_FAIL',
    category: 'DEPENDENCY',
    action_type: 'FIX',
    regex_list: [
      /ResolutionImpossible:\s+for package (?<name>[a-zA-Z0-9_\-]+)/i,
      /pip\._vendor\.resolvelib\.resolvers\.ResolutionImpossible/i,
      /ERROR: Cannot install .* because these package versions have conflicting dependencies/i,
    ],
    title: 'Python Pip Resolution Impossible',
    summary_template: "Conflicting Python package constraints found during dependency resolution for '{entity}'.",
    suggested_direction: 'Inspect requirements.txt or pyproject.toml: pin compatible version constraints or re-generate lockfile.',
    confidence: 0.96,
    fingerprint_prefix: 'dep_pip_conflict',
  }),

  new FailurePattern({
    pattern_id: 'DEP_POETRY_LOCK_MISMATCH',
    category: 'DEPENDENCY',
    action_type: 'FIX',
    regex_list: [
      /pyproject\.toml changed significantly since poetry\.lock was last generated/i,
      /poetry\.lock is not consistent with pyproject\.toml/i,
    ],
    title: 'Poetry Lockfile Out of Sync',
    summary_template: 'pyproject.toml was edited without synchronizing poetry.lock.',
    suggested_direction: 'Run `poetry lock --no-update` locally and commit the updated poetry.lock file.',
    confidence: 0.97,
    fingerprint_prefix: 'dep_poetry_lock',
  }),

  new FailurePattern({
    pattern_id: 'DEP_CARGO_CRATE_CONFLICT',
    category: 'DEPENDENCY',
    action_type: 'FIX',
    regex_list: [
      /error: failed to select a version for `(?<name>[^`]+)`/i,
      /error: failed to parse lock file at: Cargo\.lock/i,
    ],
    title: 'Rust Cargo Dependency Resolution Failure',
    summary_template: "Cargo was unable to select a matching version for crate '{entity}'.",
    suggested_direction: 'Run `cargo update -p {entity}` or verify version constraints in Cargo.toml.',
    confidence: 0.95,
    fingerprint_prefix: 'dep_cargo_conflict',
  }),

  // 3. RESOURCE LIMITS & OUT OF MEMORY
  new FailurePattern({
    pattern_id: 'RES_OOM_EXIT_137',
    category: 'RESOURCE_LIMIT',
    action_type: 'FIX',
    regex_list: [
      /Process completed with exit code 137/i,
      /\/usr\/bin\/bash: line \d+: \d+ Killed/i,
      /Command terminated by signal 9 \(SIGKILL\)/i,
      /line \d+: \d+ Killed/i,
    ],
    title: 'Process Killed by Linux OOM Killer (Exit 137)',
    summary_template: 'The CI runner kernel killed the process due to exceeding memory limits (SIGKILL 137).',
    suggested_direction: 'Increase runner memory allocation, split concurrent test workers (e.g. `--maxWorkers=2`), or optimize memory-intensive build steps.',
    confidence: 0.96,
    fingerprint_prefix: 'res_oom_137',
  }),

  new FailurePattern({
    pattern_id: 'RES_JAVA_HEAP_SPACE',
    category: 'RESOURCE_LIMIT',
    action_type: 'FIX',
    regex_list: [
      /java\.lang\.OutOfMemoryError:\s+Java heap space/i,
      /OutOfMemoryError:\s+GC overhead limit exceeded/i,
    ],
    title: 'JVM Out Of Memory (Java Heap Space)',
    summary_template: 'Gradle or JVM build tool exhausted heap space during compilation/test execution.',
    suggested_direction: 'Increase Gradle heap in gradle.properties: `org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m`.',
    confidence: 0.98,
    fingerprint_prefix: 'res_java_heap',
  }),

  new FailurePattern({
    pattern_id: 'RES_NODE_HEAP_OOM',
    category: 'RESOURCE_LIMIT',
    action_type: 'FIX',
    regex_list: [
      /FATAL ERROR:\s+Reached heap limit Allocation failed - JavaScript heap out of memory/i,
      /JavaScript heap out of memory/i,
    ],
    title: 'Node.js Heap Out of Memory',
    summary_template: 'Node process exceeded V8 default memory limit during bundler or test execution.',
    suggested_direction: 'Pass `NODE_OPTIONS=--max-old-space-size=4096` in the CI job environment.',
    confidence: 0.98,
    fingerprint_prefix: 'res_node_heap',
  }),

  new FailurePattern({
    pattern_id: 'RES_DISK_SPACE_EXHAUSTED',
    category: 'RESOURCE_LIMIT',
    action_type: 'FIX',
    regex_list: [
      /No space left on device/i,
      /ENOSPC:\s+no space left on device/i,
    ],
    title: 'Runner Disk Space Exhausted (ENOSPC)',
    summary_template: 'The CI runner disk filled up completely during image pull or artifact build.',
    suggested_direction: 'Add a pre-run disk cleanup step (e.g. `docker system prune -af`, removing unused tool caches) or upgrade runner storage tier.',
    confidence: 0.97,
    fingerprint_prefix: 'res_enospc',
  }),

  // 4. TRANSIENT NETWORK & REGISTRY OUTAGES
  new FailurePattern({
    pattern_id: 'NET_NPM_ECONNRESET',
    category: 'TRANSIENT_NETWORK',
    action_type: 'RERUN',
    regex_list: [
      /npm ERR! code (ECONNRESET|ETIMEDOUT|EAI_AGAIN)/i,
      /npm ERR! errno (ECONNRESET|ETIMEDOUT|EAI_AGAIN)/i,
      /FetchError: request to https:\/\/registry\.npmjs\.org\/.* failed, reason: (?<name>ECONNRESET|ETIMEDOUT)/i,
    ],
    title: 'NPM Registry Network Transient Error',
    summary_template: 'Transient network socket drop ({entity}) communicating with the package registry.',
    suggested_direction: 'Safe to RERUN the pipeline. This was caused by an external registry timeout or network blip.',
    confidence: 0.97,
    fingerprint_prefix: 'net_npm_socket',
  }),

  new FailurePattern({
    pattern_id: 'NET_CURL_28_TIMEOUT',
    category: 'TRANSIENT_NETWORK',
    action_type: 'RERUN',
    regex_list: [
      /curl:\s+\(28\)\s+(Operation timed out|Failed to connect)/i,
      /curl:\s+\(35\)\s+OpenSSL SSL_connect: Connection reset by peer/i,
      /Could not connect to (?<name>[a-zA-Z0-9_\-\.]+):80.*Connection timed out/i,
      /curl: \(28\) Operation timed out/i,
    ],
    title: 'HTTP Download / Curl Timeout (Error 28)',
    summary_template: 'External HTTP request timed out ({entity}) while downloading dependency or asset.',
    suggested_direction: "Safe to RERUN. If persistent, check availability status of the target endpoint '{entity}'.",
    confidence: 0.96,
    fingerprint_prefix: 'net_curl_28',
  }),

  new FailurePattern({
    pattern_id: 'NET_APT_GET_UNREACHABLE',
    category: 'TRANSIENT_NETWORK',
    action_type: 'RERUN',
    regex_list: [
      /Could not connect to archive\.ubuntu\.com/i,
      /W: Failed to fetch http:\/\/.*\.ubuntu\.com.*Connection failed/i,
      /E: Unable to fetch some archives, maybe run apt-get update/i,
    ],
    title: 'Ubuntu Package Mirror Transiently Unreachable',
    summary_template: 'Apt-get mirror connection dropped during system dependency installation.',
    suggested_direction: 'Safe to RERUN. If error recurs, switch mirror or add `--fix-missing` to apt-get.',
    confidence: 0.96,
    fingerprint_prefix: 'net_apt_mirror',
  }),

  new FailurePattern({
    pattern_id: 'NET_HTTP_502_503_REGISTRY',
    category: 'TRANSIENT_NETWORK',
    action_type: 'RERUN',
    regex_list: [
      /received unexpected HTTP status: 502 Bad Gateway/i,
      /received unexpected HTTP status: 503 Service Unavailable/i,
      /HTTP\/1\.1 503 Service Temporarily Unavailable/i,
    ],
    title: 'Upstream Service 502/503 Unavailable',
    summary_template: 'Remote server returned HTTP 502/503 during package or image download.',
    suggested_direction: 'Safe to RERUN the pipeline. Remote infrastructure was temporarily degraded.',
    confidence: 0.95,
    fingerprint_prefix: 'net_upstream_503',
  }),

  // 5. FLAKY TESTS & CONCURRENCY CONFLICTS
  new FailurePattern({
    pattern_id: 'FLK_JEST_ASYNC_TIMEOUT',
    category: 'FLAKY_CONCURRENCY',
    action_type: 'RERUN',
    regex_list: [
      /Timeout - Async callback was not invoked within the (?<name>\d+)\s*ms timeout specified by jest\.setTimeout/i,
      /Exceeded timeout of (?<name>\d+)\s*ms for a (hook|test)/i,
    ],
    title: 'Jest Asynchronous Callback Timeout (Flaky)',
    summary_template: 'Test timed out waiting for an asynchronous callback or unhandled promise resolution.',
    suggested_direction: 'RERUN may pass. For permanent resolution, check for unhandled asynchronous promises, increase test timeout, or mock external I/O.',
    confidence: 0.93,
    fingerprint_prefix: 'flk_jest_timeout',
  }),

  new FailurePattern({
    pattern_id: 'FLK_GO_RACE_DETECTED',
    category: 'FLAKY_CONCURRENCY',
    action_type: 'FIX',
    regex_list: [
      /WARNING: DATA RACE[\s\S]*?Write at 0x[0-9a-f]+ by goroutine \d+[\s\S]*?Previous read at 0x[0-9a-f]+/i,
      /WARNING: DATA RACE/i,
    ],
    title: 'Go Data Race Condition Detected',
    summary_template: 'Go race detector caught unsynchronized concurrent read/write access to shared memory.',
    suggested_direction: 'Add a sync.Mutex, sync.RWMutex, or channel synchronization to guard concurrent memory access.',
    confidence: 0.97,
    fingerprint_prefix: 'flk_go_race',
  }),

  new FailurePattern({
    pattern_id: 'FLK_DB_DEADLOCK',
    category: 'FLAKY_CONCURRENCY',
    action_type: 'RERUN',
    regex_list: [
      /deadlock detected[\s\S]*?Process \d+ waits for ShareLock/i,
      /ERROR: deadlock detected/i,
      /django\.db\.utils\.OperationalError: deadlock detected/i,
      /Deadlock found when trying to get lock; try restarting transaction/i,
    ],
    title: 'Database Transaction Deadlock',
    summary_template: 'Parallel test suite triggered concurrent database transaction locks.',
    suggested_direction: 'RERUN pipeline. To avoid recurrence, isolate parallel test databases (e.g. per-worker DB) or order table locks consistently.',
    confidence: 0.94,
    fingerprint_prefix: 'flk_db_deadlock',
  }),

  new FailurePattern({
    pattern_id: 'FLK_PORT_EADDRINUSE',
    category: 'FLAKY_CONCURRENCY',
    action_type: 'RERUN',
    regex_list: [
      /Error: listen EADDRINUSE: address already in use [0-9\.:]+:(?<name>\d+)/i,
      /address already in use (:::|\*+:)(?<name>\d+)/i,
      /bind: address already in use/i,
      /Error: listen EADDRINUSE/i,
    ],
    title: 'TCP Port Collision (EADDRINUSE)',
    summary_template: 'Port {entity} is already bound by an orphan process or parallel test worker.',
    suggested_direction: 'RERUN pipeline. Ensure server tear-down hooks kill child processes or allocate random ports (`port: 0`) in tests.',
    confidence: 0.95,
    fingerprint_prefix: 'flk_eaddrinuse',
  }),

  // 6. CODE COMPILATION, TYPESCRIPT & LINTING
  new FailurePattern({
    pattern_id: 'CODE_TYPESCRIPT_TS2322',
    category: 'COMPILATION_LINT',
    action_type: 'FIX',
    regex_list: [
      /error TS2322:\s+(?<name>Type '.*' is not assignable to type '.*')/i,
      /error TS\d+:\s+(?<name>.*)/i,
    ],
    title: 'TypeScript Compilation Type Error',
    summary_template: 'TypeScript compiler detected type incompatibility: {entity}.',
    suggested_direction: 'FIX: Update type definitions or cast the incompatible value in the failing file.',
    confidence: 0.97,
    fingerprint_prefix: 'code_ts_type',
  }),

  new FailurePattern({
    pattern_id: 'CODE_RUST_BORROW_E0382',
    category: 'COMPILATION_LINT',
    action_type: 'FIX',
    regex_list: [
      /error\[E0382\]:\s+use of moved value:\s+`(?<name>[^`]+)`/i,
      /error\[E\d+\]:\s+(?<name>.*)/i,
    ],
    title: 'Rust Borrow Checker Error (E0382)',
    summary_template: "Rust compiler rejected variable move/borrow: use of moved value '{entity}'.",
    suggested_direction: "FIX: Clone the value before moving, or pass by reference (`&{entity}`).",
    confidence: 0.98,
    fingerprint_prefix: 'code_rust_borrow',
  }),

  new FailurePattern({
    pattern_id: 'CODE_ESLINT_RULE_FAIL',
    category: 'COMPILATION_LINT',
    action_type: 'FIX',
    regex_list: [
      /(?<name>\d+\s+problems?\s+\(\d+\s+errors?,\s+\d+\s+warnings?\))/i,
      /ESLint found problems/i,
      /error\s+['"][^'"]+['"]\s+is defined but never used\s+@typescript-eslint\/no-unused-vars/i,
      /✖ \d+ problems \(\d+ errors, \d+ warnings\)/i,
    ],
    title: 'ESLint Static Analysis Violations',
    summary_template: 'Linter checks failed with rule violations: {entity}.',
    suggested_direction: 'FIX: Run `npm run lint -- --fix` locally or remove unused declarations before committing.',
    confidence: 0.96,
    fingerprint_prefix: 'code_eslint',
  }),

  // 7. UNIT & INTEGRATION TEST ASSERTIONS
  new FailurePattern({
    pattern_id: 'TEST_PYTEST_ASSERTION',
    category: 'TEST_ASSERTION',
    action_type: 'FIX',
    regex_list: [
      /AssertionError:\s+assert\s+(?<name>.*)/i,
      /E\s+AssertionError:\s+(?<name>.*)/i,
      /FAILED\s+(?<name>tests\/[a-zA-Z0-9_\-\.\/]+::[a-zA-Z0-9_]+)\s+-\s+AssertionError/i,
    ],
    title: 'Pytest Assertion Failure',
    summary_template: 'Test expectation mismatch in pytest: {entity}.',
    suggested_direction: 'FIX: Inspect business logic or update assertion expectations if specifications changed.',
    confidence: 0.96,
    fingerprint_prefix: 'test_pytest_assert',
  }),

  new FailurePattern({
    pattern_id: 'TEST_JEST_EXPECT_FAIL',
    category: 'TEST_ASSERTION',
    action_type: 'FIX',
    regex_list: [
      /expect\(received\)\.(?<name>[a-zA-Z0-9_]+)\(expected\)[\s\S]*?Expected:[\s\S]*?Received:/i,
      /FAIL\s+(?<name>[a-zA-Z0-9_\-\.\/]+\.test\.[jt]sx?)/i,
    ],
    title: 'Jest Test Assertion Mismatch',
    summary_template: "Jest test assertion failed in test suite '{entity}'.",
    suggested_direction: 'FIX: Check received vs expected diff in the test suite and fix the regression.',
    confidence: 0.96,
    fingerprint_prefix: 'test_jest_assert',
  }),

  new FailurePattern({
    pattern_id: 'TEST_GO_UNIT_FAIL',
    category: 'TEST_ASSERTION',
    action_type: 'FIX',
    regex_list: [/--- FAIL:\s+(?<name>[a-zA-Z0-9_]+)\s+\(\d+\.\d+s\)/i],
    title: 'Go Unit Test Failure',
    summary_template: "Go unit test '{entity}' failed during execution.",
    suggested_direction: 'FIX: Run `go test -v -run {entity}` locally to reproduce and resolve the failed condition.',
    confidence: 0.96,
    fingerprint_prefix: 'test_go_fail',
  }),

  // 8. INFRASTRUCTURE & ENVIRONMENT CONFIGURATION
  new FailurePattern({
    pattern_id: 'INF_MISSING_ENV_VAR',
    category: 'INFRA_ENVIRONMENT',
    action_type: 'FIX',
    regex_list: [
      /KeyError:\s+['"](?<name>[A-Z0-9_]+)['"]/i,
      /Missing required environment variable:\s*(?<name>[A-Z0-9_]+)/i,
      /process\.env\.(?<name>[A-Z0-9_]+) is undefined/i,
    ],
    title: 'Missing Required Environment Variable',
    summary_template: "Application crashed attempting to access missing environment variable '{entity}'.",
    suggested_direction: "Add '{entity}' to GitHub Actions repository secrets / workflow environment variables block.",
    confidence: 0.97,
    fingerprint_prefix: 'inf_missing_env',
  }),

  new FailurePattern({
    pattern_id: 'INF_DOCKER_COPY_MISSING',
    category: 'INFRA_ENVIRONMENT',
    action_type: 'FIX',
    regex_list: [
      /COPY failed:\s+file not found in build context or excluded by \.dockerignore:\s+stat\s+(?<name>[^\s:]+)/i,
      /failed to solve: failed to compute cache key: .* not found/i,
    ],
    title: 'Docker COPY File Not Found in Context',
    summary_template: "Dockerfile COPY command failed: file or folder '{entity}' missing from build context.",
    suggested_direction: 'Verify file path in Dockerfile and ensure it is not excluded by `.dockerignore` or missing from git.',
    confidence: 0.97,
    fingerprint_prefix: 'inf_docker_copy',
  }),

  new FailurePattern({
    pattern_id: 'INF_TERRAFORM_ACCESS_DENIED',
    category: 'INFRA_ENVIRONMENT',
    action_type: 'FIX',
    regex_list: [
      /AccessDenied:\s+User: .* is not authorized to perform:\s+(?<name>[a-zA-Z0-9:]+)/i,
      /Error: AccessDenied:\s+Access Denied/i,
    ],
    title: 'Cloud IAM Access Denied (Terraform)',
    summary_template: "Terraform CI identity lacks IAM permission: '{entity}'.",
    suggested_direction: "Grant the required IAM permission '{entity}' to the CI role/user in cloud provider IAM policies.",
    confidence: 0.97,
    fingerprint_prefix: 'inf_tf_access',
  }),

  new FailurePattern({
    pattern_id: 'INF_SSL_CERT_EXPIRED',
    category: 'INFRA_ENVIRONMENT',
    action_type: 'FIX',
    regex_list: [
      /certificate has expired/i,
      /CERT_HAS_EXPIRED/i,
      /SSL certificate problem: certificate has expired/i,
      /x509: certificate has expired/i,
    ],
    title: 'TLS / SSL Certificate Expired',
    summary_template: 'Connecting to internal artifact registry or server failed due to expired SSL certificate.',
    suggested_direction: 'Renew the expired SSL certificate on the target internal service or registry.',
    confidence: 0.96,
    fingerprint_prefix: 'inf_ssl_cert',
  }),
];

export class PatternLibraryEngine {
  patterns: FailurePattern[];

  constructor(patterns: FailurePattern[] = FAILURE_PATTERNS) {
    this.patterns = patterns;
  }

  match(text: string): PatternMatch | null {
    for (const pattern of this.patterns) {
      const match = pattern.match(text);
      if (match) {
        return match;
      }
    }
    return null;
  }
}
