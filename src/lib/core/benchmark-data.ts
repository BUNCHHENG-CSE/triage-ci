export interface BenchmarkCase {
  id: string;
  name: string;
  provider: string;
  expected_category: string;
  expected_action_type: 'RERUN' | 'FIX' | string;
  expected_step_contains: string;
  expected_keywords: string[];
  raw_log: string;
}

export const BENCHMARK_CASES: BenchmarkCase[] = [
  {
    id: "case_01",
    name: "AWS STS Session Token Expired",
    provider: "github_actions",
    expected_category: "CREDENTIALS_AUTH",
    expected_action_type: "FIX",
    expected_step_contains: "Deploy",
    expected_keywords: ["AWS", "token", "expired", "credentials"],
    raw_log: `2026-10-17T08:01:05.123Z ##[group]Run actions/checkout@v4
2026-10-17T08:01:06.456Z Syncing repository: acme-corp/payment-service
2026-10-17T08:01:07.789Z ##[endgroup]
2026-10-17T08:01:08.012Z ##[group]Run aws-actions/configure-aws-credentials@v4
2026-10-17T08:01:09.111Z Assuming role arn:aws:iam::123456789012:role/GitHubActionsDeployRole
2026-10-17T08:01:10.222Z ##[endgroup]
2026-10-17T08:01:11.333Z ##[group]Run Deploy to AWS ECS Staging
2026-10-17T08:01:12.444Z > aws ecs update-service --cluster staging-cluster --service payment-api --force-new-deployment
2026-10-17T08:01:15.555Z An error occurred (ExpiredTokenException) when calling the UpdateService operation: The security token included in the request is expired
2026-10-17T08:01:16.666Z ##[error]Process completed with exit code 254.
2026-10-17T08:01:17.777Z ##[endgroup]
`
  },
  {
    id: "case_02",
    name: "NPM Peer Dependency Conflict (ERESOLVE)",
    provider: "github_actions",
    expected_category: "DEPENDENCY",
    expected_action_type: "FIX",
    expected_step_contains: "npm install",
    expected_keywords: ["npm", "dependency", "ERESOLVE", "peer"],
    raw_log: `2026-10-17T09:12:00.100Z ##[group]Run actions/setup-node@v4
2026-10-17T09:12:01.200Z Node version: 20.11.0
2026-10-17T09:12:02.300Z ##[endgroup]
2026-10-17T09:12:03.400Z ##[group]Run npm install
2026-10-17T09:12:05.500Z npm ERR! code ERESOLVE
2026-10-17T09:12:05.501Z npm ERR! ERESOLVE unable to resolve dependency tree
2026-10-17T09:12:05.502Z npm ERR! 
2026-10-17T09:12:05.503Z npm ERR! While resolving: frontend-dashboard@1.0.0
2026-10-17T09:12:05.504Z npm ERR! Found: react@19.0.0
2026-10-17T09:12:05.505Z npm ERR! node_modules/react
2026-10-17T09:12:05.506Z npm ERR!   react@"^19.0.0" from the root project
2026-10-17T09:12:05.507Z npm ERR! 
2026-10-17T09:12:05.508Z npm ERR! Could not resolve dependency:
2026-10-17T09:12:05.509Z npm ERR! peer react@"^18.0.0" from @legacy/table-grid@2.4.1
2026-10-17T09:12:05.510Z npm ERR! node_modules/@legacy/table-grid
2026-10-17T09:12:05.511Z npm ERR!   @legacy/table-grid@"^2.4.1" from the root project
2026-10-17T09:12:06.600Z ##[error]Process completed with exit code 1.
2026-10-17T09:12:07.700Z ##[endgroup]
`
  },
  {
    id: "case_03",
    name: "Gradle JVM Out Of Memory (Java Heap Space)",
    provider: "github_actions",
    expected_category: "RESOURCE_LIMIT",
    expected_action_type: "FIX",
    expected_step_contains: "gradlew",
    expected_keywords: ["OutOfMemoryError", "Java heap", "memory"],
    raw_log: `2026-10-17T10:00:00.000Z ##[group]Run ./gradlew test
2026-10-17T10:00:05.000Z > Task :compileJava UP-TO-DATE
2026-10-17T10:00:10.000Z > Task :processResources UP-TO-DATE
2026-10-17T10:00:15.000Z > Task :classes UP-TO-DATE
2026-10-17T10:00:20.000Z > Task :compileTestJava
2026-10-17T10:00:45.000Z > Task :test
2026-10-17T10:01:20.000Z java.lang.OutOfMemoryError: Java heap space
2026-10-17T10:01:21.000Z 	at java.base/java.util.Arrays.copyOf(Arrays.java:3512)
2026-10-17T10:01:22.000Z 	at com.acme.engine.GraphProcessor.loadNodes(GraphProcessor.java:142)
2026-10-17T10:01:23.000Z > Task :test FAILED
2026-10-17T10:01:24.000Z FAILURE: Build failed with an exception.
2026-10-17T10:01:25.000Z * What went wrong:
2026-10-17T10:01:26.000Z Execution failed for task ':test'.
2026-10-17T10:01:27.000Z ##[error]Process completed with exit code 1.
`
  },
  {
    id: "case_04",
    name: "Jest Asynchronous Test Timeout (Flaky)",
    provider: "github_actions",
    expected_category: "FLAKY_CONCURRENCY",
    expected_action_type: "RERUN",
    expected_step_contains: "npm test",
    expected_keywords: ["Jest", "Timeout", "Async", "callback"],
    raw_log: `2026-10-17T11:00:01.000Z ##[group]Run npm test
2026-10-17T11:00:05.000Z PASS src/auth/login.test.ts
2026-10-17T11:00:07.000Z PASS src/users/profile.test.ts
2026-10-17T11:00:12.000Z FAIL src/payments/stripe-webhook.test.ts
2026-10-17T11:00:12.100Z   ● Stripe Webhook › should process async invoice payload
2026-10-17T11:00:12.200Z     Timeout - Async callback was not invoked within the 5000 ms timeout specified by jest.setTimeout.
2026-10-17T11:00:12.300Z       at src/payments/stripe-webhook.test.ts:38:5
2026-10-17T11:00:13.000Z Test Suites: 1 failed, 14 passed, 15 total
2026-10-17T11:00:14.000Z Tests:       1 failed, 84 passed, 85 total
2026-10-17T11:00:15.000Z ##[error]Process completed with exit code 1.
`
  },
  {
    id: "case_05",
    name: "GitHub PAT Expired During Submodule Checkout",
    provider: "github_actions",
    expected_category: "CREDENTIALS_AUTH",
    expected_action_type: "FIX",
    expected_step_contains: "submodule",
    expected_keywords: ["Authentication", "GitHub", "credentials"],
    raw_log: `2026-10-17T11:30:00.000Z ##[group]Run git submodule update --init --recursive
2026-10-17T11:30:02.000Z Submodule 'vendor/internal-core' (https://github.com/acme-org/internal-core) registered for path 'vendor/internal-core'
2026-10-17T11:30:04.000Z Cloning into '/home/runner/work/app/vendor/internal-core'...
2026-10-17T11:30:05.000Z remote: Invalid username or password.
2026-10-17T11:30:05.100Z fatal: Authentication failed for 'https://github.com/acme-org/internal-core/'
2026-10-17T11:30:06.000Z fatal: clone of 'https://github.com/acme-org/internal-core' into submodule path 'vendor/internal-core' failed
2026-10-17T11:30:07.000Z ##[error]Process completed with exit code 1.
`
  },
  {
    id: "case_06",
    name: "TypeScript Compilation Error TS2322",
    provider: "github_actions",
    expected_category: "COMPILATION_LINT",
    expected_action_type: "FIX",
    expected_step_contains: "tsc",
    expected_keywords: ["TypeScript", "TS2322", "type"],
    raw_log: `2026-10-17T12:00:00.000Z ##[group]Run npm run build
2026-10-17T12:00:01.000Z > acme-web@2.1.0 build
2026-10-17T12:00:01.500Z > tsc --noEmit
2026-10-17T12:00:03.200Z src/components/InvoiceSummary.tsx(45,7): error TS2322: Type 'string' is not assignable to type 'number'.
2026-10-17T12:00:03.201Z   The expected type comes from property 'amountDue' which is declared here on type 'InvoiceCardProps'
2026-10-17T12:00:04.000Z ##[error]Process completed with exit code 2.
`
  },
  {
    id: "case_07",
    name: "Pytest AssertionError in API Test",
    provider: "github_actions",
    expected_category: "TEST_ASSERTION",
    expected_action_type: "FIX",
    expected_step_contains: "pytest",
    expected_keywords: ["Pytest", "AssertionError", "assertion"],
    raw_log: `2026-10-17T12:45:00.000Z ##[group]Run pytest tests/
2026-10-17T12:45:05.000Z ============================= test session starts ==============================
2026-10-17T12:45:06.000Z collected 18 items
2026-10-17T12:45:08.000Z tests/test_auth.py ....                                                 [ 22%]
2026-10-17T12:45:10.000Z tests/test_billing.py F...                                              [ 44%]
2026-10-17T12:45:12.000Z _____________________________ test_create_subscription _____________________________
2026-10-17T12:45:12.100Z     def test_create_subscription(client):
2026-10-17T12:45:12.200Z         response = client.post("/v1/subscriptions", json={"tier": "pro"})
2026-10-17T12:45:12.300Z >       assert response.status_code == 200
2026-10-17T12:45:12.400Z E       AssertionError: assert 404 == 200
2026-10-17T12:45:12.500Z tests/test_billing.py:32: AssertionError
2026-10-17T12:45:14.000Z ========================= 1 failed, 17 passed in 4.12s =========================
2026-10-17T12:45:15.000Z ##[error]Process completed with exit code 1.
`
  },
  {
    id: "case_08",
    name: "Docker COPY File Not Found in Context",
    provider: "github_actions",
    expected_category: "INFRA_ENVIRONMENT",
    expected_action_type: "FIX",
    expected_step_contains: "docker build",
    expected_keywords: ["Docker", "COPY", "file", "build context"],
    raw_log: `2026-10-17T13:10:00.000Z ##[group]Run docker build -t acme-api:latest .
2026-10-17T13:10:01.000Z Sending build context to Docker daemon  24.5MB
2026-10-17T13:10:02.000Z Step 1/8 : FROM node:20-alpine
2026-10-17T13:10:03.000Z Step 2/8 : WORKDIR /app
2026-10-17T13:10:04.000Z Step 3/8 : COPY package*.json ./
2026-10-17T13:10:06.000Z Step 4/8 : RUN npm ci --omit=dev
2026-10-17T13:10:14.000Z Step 5/8 : COPY ./dist/server.js ./server.js
2026-10-17T13:10:15.000Z COPY failed: file not found in build context or excluded by .dockerignore: stat dist/server.js: file does not exist
2026-10-17T13:10:16.000Z ##[error]Process completed with exit code 1.
`
  },
  {
    id: "case_09",
    name: "Missing Environment Variable (KeyError)",
    provider: "github_actions",
    expected_category: "INFRA_ENVIRONMENT",
    expected_action_type: "FIX",
    expected_step_contains: "Run migrations",
    expected_keywords: ["environment variable", "DATABASE_URL", "KeyError"],
    raw_log: `2026-10-17T13:40:00.000Z ##[group]Run Run migrations
2026-10-17T13:40:01.000Z > python manage.py migrate
2026-10-17T13:40:02.000Z Traceback (most recent call last):
2026-10-17T13:40:02.100Z   File "/app/manage.py", line 22, in <module>
2026-10-17T13:40:02.200Z     main()
2026-10-17T13:40:02.300Z   File "/app/config/settings.py", line 45, in get_db_url
2026-10-17T13:40:02.400Z     return os.environ["DATABASE_URL"]
2026-10-17T13:40:02.500Z   File "/usr/lib/python3.11/os.py", line 680, in __getitem__
2026-10-17T13:40:02.600Z     raise KeyError(key) from None
2026-10-17T13:40:02.700Z KeyError: 'DATABASE_URL'
2026-10-17T13:40:03.000Z ##[error]Process completed with exit code 1.
`
  },
  {
    id: "case_10",
    name: "NPM Registry Transient Connection Reset (ECONNRESET)",
    provider: "github_actions",
    expected_category: "TRANSIENT_NETWORK",
    expected_action_type: "RERUN",
    expected_step_contains: "npm ci",
    expected_keywords: ["ECONNRESET", "registry", "network", "transient"],
    raw_log: `2026-10-17T14:15:00.000Z ##[group]Run npm ci
2026-10-17T14:15:10.000Z npm ERR! code ECONNRESET
2026-10-17T14:15:10.100Z npm ERR! errno ECONNRESET
2026-10-17T14:15:10.200Z npm ERR! network request to https://registry.npmjs.org/@types%2freact failed, reason: ECONNRESET
2026-10-17T14:15:10.300Z npm ERR! network This is a problem related to network connectivity.
2026-10-17T14:15:10.400Z npm ERR! network In most cases you are behind a proxy or have bad network settings.
2026-10-17T14:15:11.000Z ##[error]Process completed with exit code 1.
`
  },
  {
    id: "case_11",
    name: "Go Data Race Condition Detected",
    provider: "github_actions",
    expected_category: "FLAKY_CONCURRENCY",
    expected_action_type: "FIX",
    expected_step_contains: "go test -race",
    expected_keywords: ["Go", "DATA RACE", "race condition"],
    raw_log: `2026-10-17T14:40:00.000Z ##[group]Run go test -race ./...
2026-10-17T14:40:05.000Z ok  	github.com/acme/gateway/pkg/router	0.245s
2026-10-17T14:40:08.000Z ==================
2026-10-17T14:40:08.100Z WARNING: DATA RACE
2026-10-17T14:40:08.200Z Write at 0x00c00010a240 by goroutine 19:
2026-10-17T14:40:08.300Z   github.com/acme/gateway/pkg/cache.(*InMemory).Set()
2026-10-17T14:40:08.400Z       /home/runner/work/gateway/pkg/cache/memory.go:42 +0x64
2026-10-17T14:40:08.500Z Previous read at 0x00c00010a240 by goroutine 18:
2026-10-17T14:40:08.600Z   github.com/acme/gateway/pkg/cache.(*InMemory).Get()
2026-10-17T14:40:08.700Z       /home/runner/work/gateway/pkg/cache/memory.go:28 +0x38
2026-10-17T14:40:08.800Z ==================
2026-10-17T14:40:09.000Z FAIL	github.com/acme/gateway/pkg/cache	0.812s
2026-10-17T14:40:10.000Z ##[error]Process completed with exit code 1.
`
  },
  {
    id: "case_12",
    name: "ESLint Static Rule Violations",
    provider: "github_actions",
    expected_category: "COMPILATION_LINT",
    expected_action_type: "FIX",
    expected_step_contains: "npm run lint",
    expected_keywords: ["ESLint", "unused", "problems"],
    raw_log: `2026-10-17T15:00:00.000Z ##[group]Run npm run lint
2026-10-17T15:00:02.000Z > acme-web@1.0.0 lint
2026-10-17T15:00:02.500Z > eslint src --ext .ts,.tsx
2026-10-17T15:00:04.100Z /home/runner/work/web/src/views/Checkout.tsx
2026-10-17T15:00:04.200Z   18:10  error  'clientSecret' is defined but never used  @typescript-eslint/no-unused-vars
2026-10-17T15:00:04.300Z   29:5   error  Missing return type on function           @typescript-eslint/explicit-module-boundary-types
2026-10-17T15:00:05.000Z ✖ 2 problems (2 errors, 0 warnings)
2026-10-17T15:00:06.000Z ##[error]Process completed with exit code 1.
`
  },
  {
    id: "case_13",
    name: "Terraform IAM S3 Access Denied",
    provider: "github_actions",
    expected_category: "INFRA_ENVIRONMENT",
    expected_action_type: "FIX",
    expected_step_contains: "terraform apply",
    expected_keywords: ["IAM", "AccessDenied", "s3"],
    raw_log: `2026-10-17T15:30:00.000Z ##[group]Run terraform apply -auto-approve
2026-10-17T15:30:05.000Z aws_s3_bucket.artifacts: Refreshing state... [id=acme-pipeline-artifacts]
2026-10-17T15:30:08.000Z aws_s3_bucket_policy.policy: Creating...
2026-10-17T15:30:10.000Z Error: AccessDenied: User: arn:aws:iam::123456789012:user/ci-deployer is not authorized to perform: s3:PutBucketPolicy on resource: arn:aws:s3:::acme-pipeline-artifacts
2026-10-17T15:30:10.100Z 	status code: 403, request id: 9G4H7J8K1L2M3N4P
2026-10-17T15:30:11.000Z ##[error]Process completed with exit code 1.
`
  },
  {
    id: "case_14",
    name: "Rust Cargo Borrow Checker Error (E0382)",
    provider: "github_actions",
    expected_category: "COMPILATION_LINT",
    expected_action_type: "FIX",
    expected_step_contains: "cargo build",
    expected_keywords: ["Rust", "E0382", "borrow", "moved"],
    raw_log: `2026-10-17T16:00:00.000Z ##[group]Run cargo build --verbose
2026-10-17T16:00:05.000Z    Compiling acme-engine v0.4.0 (/home/runner/work/engine)
2026-10-17T16:00:08.000Z error[E0382]: use of moved value: \`user_session\`
2026-10-17T16:00:08.100Z   --> src/auth/session.rs:58:24
2026-10-17T16:00:08.200Z    |
2026-10-17T16:00:08.300Z 52 |     let user_session = create_session(&user)?;
2026-10-17T16:00:08.400Z    |         ------------ move occurs because \`user_session\` has type \`Session\`, which does not implement the \`Copy\` trait
2026-10-17T16:00:08.500Z 55 |     cache.store(user_session);
2026-10-17T16:00:08.600Z    |                 ------------ value moved here
2026-10-17T16:00:08.700Z 58 |     audit_log.record(user_session.id);
2026-10-17T16:00:08.800Z    |                        ^^^^^^^^^^^^ value used here after move
2026-10-17T16:00:09.000Z error: could not compile \`acme-engine\` due to previous error
2026-10-17T16:00:10.000Z ##[error]Process completed with exit code 101.
`
  },
  {
    id: "case_15",
    name: "Linux OOM Killer (Exit Code 137)",
    provider: "github_actions",
    expected_category: "RESOURCE_LIMIT",
    expected_action_type: "FIX",
    expected_step_contains: "Run Cypress E2E",
    expected_keywords: ["137", "OOM", "Killed", "memory"],
    raw_log: `2026-10-17T16:30:00.000Z ##[group]Run Run Cypress E2E Tests
2026-10-17T16:30:05.000Z > cypress run --browser chrome
2026-10-17T16:30:20.000Z Running: specs/auth.spec.js (1 of 12)
2026-10-17T16:30:45.000Z Running: specs/billing.spec.js (2 of 12)
2026-10-17T16:31:10.000Z /usr/bin/bash: line 1: 4210 Killed                  cypress run --browser chrome
2026-10-17T16:31:11.000Z ##[error]Process completed with exit code 137.
`
  },
  {
    id: "case_16",
    name: "Postgres Database Transaction Deadlock",
    provider: "github_actions",
    expected_category: "FLAKY_CONCURRENCY",
    expected_action_type: "RERUN",
    expected_step_contains: "pytest -n auto",
    expected_keywords: ["deadlock", "database", "transaction"],
    raw_log: `2026-10-17T17:00:00.000Z ##[group]Run pytest -n auto tests/integration/
2026-10-17T17:00:10.000Z [gw0] PASSED tests/integration/test_orders.py::test_create_order
2026-10-17T17:00:12.000Z [gw1] FAILED tests/integration/test_inventory.py::test_reserve_stock
2026-10-17T17:00:12.100Z django.db.utils.OperationalError: deadlock detected
2026-10-17T17:00:12.200Z DETAIL:  Process 4310 waits for ShareLock on transaction 88921; blocked by process 4311.
2026-10-17T17:00:12.300Z Process 4311 waits for ExclusiveLock on tuple (4, 12) of relation 16421 of database 16384; blocked by process 4310.
2026-10-17T17:00:12.400Z HINT:  See server log for query details.
2026-10-17T17:00:13.000Z ##[error]Process completed with exit code 1.
`
  },
  {
    id: "case_17",
    name: "Port Already Bound (EADDRINUSE)",
    provider: "github_actions",
    expected_category: "FLAKY_CONCURRENCY",
    expected_action_type: "RERUN",
    expected_step_contains: "npm run test:e2e",
    expected_keywords: ["EADDRINUSE", "port", "address already in use"],
    raw_log: `2026-10-17T17:30:00.000Z ##[group]Run npm run test:e2e
2026-10-17T17:30:02.000Z Starting test mock HTTP server on port 8080...
2026-10-17T17:30:03.000Z node:events:497
2026-10-17T17:30:03.100Z       throw er; // Unhandled 'error' event
2026-10-17T17:30:03.200Z       ^
2026-10-17T17:30:03.300Z Error: listen EADDRINUSE: address already in use :::8080
2026-10-17T17:30:03.400Z     at Server.setupListenHandle [as _listen2] (node:net:1904:16)
2026-10-17T17:30:03.500Z     at listenInCluster (node:net:1961:12)
2026-10-17T17:30:04.000Z ##[error]Process completed with exit code 1.
`
  },
  {
    id: "case_18",
    name: "Python Pip ResolutionImpossible Conflict",
    provider: "github_actions",
    expected_category: "DEPENDENCY",
    expected_action_type: "FIX",
    expected_step_contains: "pip install",
    expected_keywords: ["ResolutionImpossible", "pip", "dependencies"],
    raw_log: `2026-10-17T18:00:00.000Z ##[group]Run pip install -r requirements.txt
2026-10-17T18:00:03.000Z Collecting urllib3<2.0,>=1.26 (from requests->-r requirements.txt (line 4))
2026-10-17T18:00:05.000Z Collecting botocore>=1.34.0 (from boto3->-r requirements.txt (line 8))
2026-10-17T18:00:08.000Z pip._vendor.resolvelib.resolvers.ResolutionImpossible: for package cryptography
2026-10-17T18:00:08.100Z The conflict is caused by:
2026-10-17T18:00:08.200Z     pyopenssl 23.2.0 depends on cryptography<42,>=41.0.5
2026-10-17T18:00:08.300Z     paramiko 3.4.0 depends on cryptography>=42.0.0
2026-10-17T18:00:09.000Z ##[error]Process completed with exit code 1.
`
  },
  {
    id: "case_19",
    name: "Curl Download Timeout (Error 28)",
    provider: "github_actions",
    expected_category: "TRANSIENT_NETWORK",
    expected_action_type: "RERUN",
    expected_step_contains: "Install Protoc",
    expected_keywords: ["curl", "timed out", "28", "network"],
    raw_log: `2026-10-17T18:30:00.000Z ##[group]Run Install Protoc Compiler
2026-10-17T18:30:02.000Z > curl -LO https://github.com/protocolbuffers/protobuf/releases/download/v25.1/protoc-25.1-linux-x86_64.zip
2026-10-17T18:30:35.000Z   % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
2026-10-17T18:30:35.100Z                                  Dload  Upload   Total   Spent    Left  Speed
2026-10-17T18:30:35.200Z   0     0    0     0    0     0      0      0 --:--:--  0:00:30 --:--:--     0
2026-10-17T18:30:35.300Z curl: (28) Operation timed out after 30001 milliseconds with 0 bytes received
2026-10-17T18:30:36.000Z ##[error]Process completed with exit code 28.
`
  },
  {
    id: "case_20",
    name: "Artifactory TLS / SSL Certificate Expired",
    provider: "github_actions",
    expected_category: "INFRA_ENVIRONMENT",
    expected_action_type: "FIX",
    expected_step_contains: "docker push",
    expected_keywords: ["certificate", "SSL", "expired"],
    raw_log: `2026-10-17T19:00:00.000Z ##[group]Run docker push registry.internal.acme.com/core:latest
2026-10-17T19:00:02.000Z The push refers to repository [registry.internal.acme.com/core]
2026-10-17T19:00:04.000Z Get "https://registry.internal.acme.com/v2/": x509: certificate has expired or is not yet valid: current time 2026-10-17T19:00:04Z is after 2026-10-15T00:00:00Z
2026-10-17T19:00:05.000Z ##[error]Process completed with exit code 1.
`
  }
];
