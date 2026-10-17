import re
from typing import Optional, List, Dict, Any

class PatternMatch:
    def __init__(
        self,
        pattern_id: str,
        category: str,
        action_type: str,  # RERUN vs FIX
        title: str,
        summary: str,
        suggested_direction: str,
        confidence: float,
        fingerprint: str,
        extracted_entities: Dict[str, str] = None
    ):
        self.pattern_id = pattern_id
        self.category = category
        self.action_type = action_type
        self.title = title
        self.summary = summary
        self.suggested_direction = suggested_direction
        self.confidence = confidence
        self.fingerprint = fingerprint
        self.extracted_entities = extracted_entities or {}


class FailurePattern:
    def __init__(
        self,
        pattern_id: str,
        category: str,
        action_type: str,
        regex_list: List[str],
        title: str,
        summary_template: str,
        suggested_direction: str,
        confidence: float = 0.95,
        fingerprint_prefix: str = "cluster"
    ):
        self.pattern_id = pattern_id
        self.category = category
        self.action_type = action_type
        self.compiled_regexes = [re.compile(r, re.IGNORECASE | re.MULTILINE) for r in regex_list]
        self.title = title
        self.summary_template = summary_template
        self.suggested_direction = suggested_direction
        self.confidence = confidence
        self.fingerprint_prefix = fingerprint_prefix

    def match(self, text: str) -> Optional[PatternMatch]:
        for pattern in self.compiled_regexes:
            match = pattern.search(text)
            if match:
                groups = match.groupdict()
                # Also include positional group 1 if present
                entity_name = ""
                if "name" in groups:
                    entity_name = groups["name"]
                elif match.lastindex and match.lastindex >= 1:
                    entity_name = match.group(1).strip()
                
                # Format summary
                try:
                    summary = self.summary_template.format(entity=entity_name, **groups)
                except Exception:
                    summary = self.summary_template.replace("{entity}", entity_name)
                    
                # Format fingerprint
                safe_entity = re.sub(r'[^a-zA-Z0-9_]', '_', entity_name)[:40] if entity_name else "generic"
                fingerprint = f"{self.fingerprint_prefix}:{self.pattern_id}:{safe_entity}".lower()

                return PatternMatch(
                    pattern_id=self.pattern_id,
                    category=self.category,
                    action_type=self.action_type,
                    title=self.title,
                    summary=summary,
                    suggested_direction=self.suggested_direction,
                    confidence=self.confidence,
                    fingerprint=fingerprint,
                    extracted_entities={"entity": entity_name, **groups}
                )
        return None


# 50+ Real-world Failure Patterns grouped by domain
FAILURE_PATTERNS: List[FailurePattern] = [
    # -------------------------------------------------------------
    # 1. CREDENTIALS & AUTH (Recurring infrastructure pain point)
    # -------------------------------------------------------------
    FailurePattern(
        pattern_id="CRED_AWS_STS_EXPIRED",
        category="CREDENTIALS_AUTH",
        action_type="FIX",
        regex_list=[
            r"The security token included in the request is expired",
            r"ExpiredTokenException",
            r"ExpiredToken: The security token included in the request is expired"
        ],
        title="AWS STS Session Token Expired",
        summary_template="AWS temporary security credentials or STS session token expired during pipeline execution.",
        suggested_direction="Rotate or re-authenticate AWS credentials. In GitHub Actions, ensure 'aws-actions/configure-aws-credentials' uses a fresh role session or check AWS IAM role session duration limits.",
        confidence=0.98,
        fingerprint_prefix="cred_aws_sts"
    ),
    FailurePattern(
        pattern_id="CRED_GITHUB_PAT_EXPIRED",
        category="CREDENTIALS_AUTH",
        action_type="FIX",
        regex_list=[
            r"remote:\s+Invalid username or password",
            r"fatal: Authentication failed for ['\"]https://github\.com/(?P<name>[^/'\"\s]+/[^/'\"\s]+)",
            r"Bad credentials.*api\.github\.com",
            r"HTTP 401: Bad credentials"
        ],
        title="GitHub Authentication / PAT Expired",
        summary_template="GitHub Personal Access Token or workflow secret has expired or lacks repository scope for '{entity}'.",
        suggested_direction="Update the expired repository secret (e.g. GH_TOKEN or PERSONAL_ACCESS_TOKEN) with a valid token possessing appropriate read/write scopes.",
        confidence=0.97,
        fingerprint_prefix="cred_gh_pat"
    ),
    FailurePattern(
        pattern_id="CRED_DOCKER_UNAUTHORIZED",
        category="CREDENTIALS_AUTH",
        action_type="FIX",
        regex_list=[
            r"unauthorized:\s+authentication required",
            r"denied:\s+requested access to the resource is denied",
            r"Error response from daemon:\s+Get \"https://(?P<name>[^/]+)/v2/.*unauthorized"
        ],
        title="Container Registry Authentication Failed",
        summary_template="Registry credentials for '{entity}' failed authentication or token lack push/pull permissions.",
        suggested_direction="Verify Docker Hub, ECR, or GHCR login step (e.g. `docker/login-action`) secrets: verify username and password/token validity.",
        confidence=0.96,
        fingerprint_prefix="cred_docker_auth"
    ),
    FailurePattern(
        pattern_id="CRED_VAULT_TOKEN_EXPIRED",
        category="CREDENTIALS_AUTH",
        action_type="FIX",
        regex_list=[
            r"Vault.*permission denied.*token expired",
            r"code: 403.*token is expired"
        ],
        title="HashiCorp Vault Token Expired",
        summary_template="Vault access token expired prior to fetching required secrets.",
        suggested_direction="Renew Vault authentication token or reconfigure Vault AppRole/OIDC authentication in CI.",
        confidence=0.95,
        fingerprint_prefix="cred_vault"
    ),

    # -------------------------------------------------------------
    # 2. DEPENDENCY RESOLUTION & LOCKFILE
    # -------------------------------------------------------------
    FailurePattern(
        pattern_id="DEP_NPM_ERESOLVE",
        category="DEPENDENCY",
        action_type="FIX",
        regex_list=[
            r"npm ERR! code ERESOLVE[\s\S]*?Could not resolve dependency:[\s\S]*?peer (?P<name>[@a-zA-Z0-9_\-\./]+)",
            r"npm ERR! code ERESOLVE",
            r"ERESOLVE unable to resolve dependency tree"
        ],
        title="NPM Peer Dependency Conflict (ERESOLVE)",
        summary_template="NPM package dependency conflict: conflicting peer dependency requirements for '{entity}'.",
        suggested_direction="Align conflicting peer versions in package.json or use `npm install --legacy-peer-deps` / update package-lock.json to reconcile the tree.",
        confidence=0.98,
        fingerprint_prefix="dep_npm_eresolve"
    ),
    FailurePattern(
        pattern_id="DEP_PIP_RESOLVELIB_FAIL",
        category="DEPENDENCY",
        action_type="FIX",
        regex_list=[
            r"ResolutionImpossible:\s+for package (?P<name>[a-zA-Z0-9_\-]+)",
            r"pip._vendor.resolvelib.resolvers.ResolutionImpossible",
            r"ERROR: Cannot install .* because these package versions have conflicting dependencies"
        ],
        title="Python Pip Resolution Impossible",
        summary_template="Conflicting Python package constraints found during dependency resolution for '{entity}'.",
        suggested_direction="Inspect requirements.txt or pyproject.toml: pin compatible version constraints or re-generate lockfile.",
        confidence=0.96,
        fingerprint_prefix="dep_pip_conflict"
    ),
    FailurePattern(
        pattern_id="DEP_POETRY_LOCK_MISMATCH",
        category="DEPENDENCY",
        action_type="FIX",
        regex_list=[
            r"pyproject\.toml changed significantly since poetry\.lock was last generated",
            r"poetry\.lock is not consistent with pyproject\.toml"
        ],
        title="Poetry Lockfile Out of Sync",
        summary_template="pyproject.toml was edited without synchronizing poetry.lock.",
        suggested_direction="Run `poetry lock --no-update` locally and commit the updated poetry.lock file.",
        confidence=0.97,
        fingerprint_prefix="dep_poetry_lock"
    ),
    FailurePattern(
        pattern_id="DEP_CARGO_CRATE_CONFLICT",
        category="DEPENDENCY",
        action_type="FIX",
        regex_list=[
            r"error: failed to select a version for `(?P<name>[^`]+)`",
            r"error: failed to parse lock file at: Cargo\.lock"
        ],
        title="Rust Cargo Dependency Resolution Failure",
        summary_template="Cargo was unable to select a matching version for crate '{entity}'.",
        suggested_direction="Run `cargo update -p {entity}` or verify version constraints in Cargo.toml.",
        confidence=0.95,
        fingerprint_prefix="dep_cargo_conflict"
    ),

    # -------------------------------------------------------------
    # 3. RESOURCE LIMITS & OUT OF MEMORY
    # -------------------------------------------------------------
    FailurePattern(
        pattern_id="RES_OOM_EXIT_137",
        category="RESOURCE_LIMIT",
        action_type="FIX",
        regex_list=[
            r"Process completed with exit code 137",
            r"/usr/bin/bash: line \d+: \d+ Killed",
            r"Command terminated by signal 9 \(SIGKILL\)"
        ],
        title="Process Killed by Linux OOM Killer (Exit 137)",
        summary_template="The CI runner kernel killed the process due to exceeding memory limits (SIGKILL 137).",
        suggested_direction="Increase runner memory allocation, split concurrent test workers (e.g. `--maxWorkers=2`), or optimize memory-intensive build steps.",
        confidence=0.96,
        fingerprint_prefix="res_oom_137"
    ),
    FailurePattern(
        pattern_id="RES_JAVA_HEAP_SPACE",
        category="RESOURCE_LIMIT",
        action_type="FIX",
        regex_list=[
            r"java\.lang\.OutOfMemoryError:\s+Java heap space",
            r"OutOfMemoryError:\s+GC overhead limit exceeded"
        ],
        title="JVM Out Of Memory (Java Heap Space)",
        summary_template="Gradle or JVM build tool exhausted heap space during compilation/test execution.",
        suggested_direction="Increase Gradle heap in gradle.properties: `org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m`.",
        confidence=0.98,
        fingerprint_prefix="res_java_heap"
    ),
    FailurePattern(
        pattern_id="RES_NODE_HEAP_OOM",
        category="RESOURCE_LIMIT",
        action_type="FIX",
        regex_list=[
            r"FATAL ERROR:\s+Reached heap limit Allocation failed - JavaScript heap out of memory",
            r"JavaScript heap out of memory"
        ],
        title="Node.js Heap Out of Memory",
        summary_template="Node process exceeded V8 default memory limit during bundler or test execution.",
        suggested_direction="Pass `NODE_OPTIONS=--max-old-space-size=4096` in the CI job environment.",
        confidence=0.98,
        fingerprint_prefix="res_node_heap"
    ),
    FailurePattern(
        pattern_id="RES_DISK_SPACE_EXHAUSTED",
        category="RESOURCE_LIMIT",
        action_type="FIX",
        regex_list=[
            r"No space left on device",
            r"ENOSPC:\s+no space left on device"
        ],
        title="Runner Disk Space Exhausted (ENOSPC)",
        summary_template="The CI runner disk filled up completely during image pull or artifact build.",
        suggested_direction="Add a pre-run disk cleanup step (e.g. `docker system prune -af`, removing unused tool caches) or upgrade runner storage tier.",
        confidence=0.97,
        fingerprint_prefix="res_enospc"
    ),

    # -------------------------------------------------------------
    # 4. TRANSIENT NETWORK & REGISTRY OUTAGES
    # -------------------------------------------------------------
    FailurePattern(
        pattern_id="NET_NPM_ECONNRESET",
        category="TRANSIENT_NETWORK",
        action_type="RERUN",
        regex_list=[
            r"npm ERR! code (ECONNRESET|ETIMEDOUT|EAI_AGAIN)",
            r"npm ERR! errno (ECONNRESET|ETIMEDOUT|EAI_AGAIN)",
            r"FetchError: request to https://registry\.npmjs\.org/.* failed, reason: (?P<name>ECONNRESET|ETIMEDOUT)"
        ],
        title="NPM Registry Network Transient Error",
        summary_template="Transient network socket drop ({entity}) communicating with the package registry.",
        suggested_direction="Safe to RERUN the pipeline. This was caused by an external registry timeout or network blip.",
        confidence=0.97,
        fingerprint_prefix="net_npm_socket"
    ),
    FailurePattern(
        pattern_id="NET_CURL_28_TIMEOUT",
        category="TRANSIENT_NETWORK",
        action_type="RERUN",
        regex_list=[
            r"curl:\s+\(28\)\s+(Operation timed out|Failed to connect)",
            r"curl:\s+\(35\)\s+OpenSSL SSL_connect: Connection reset by peer",
            r"Could not connect to (?P<name>[a-zA-Z0-9_\-\.]+):80.*Connection timed out"
        ],
        title="HTTP Download / Curl Timeout (Error 28)",
        summary_template="External HTTP request timed out ({entity}) while downloading dependency or asset.",
        suggested_direction="Safe to RERUN. If persistent, check availability status of the target endpoint '{entity}'.",
        confidence=0.96,
        fingerprint_prefix="net_curl_28"
    ),
    FailurePattern(
        pattern_id="NET_APT_GET_UNREACHABLE",
        category="TRANSIENT_NETWORK",
        action_type="RERUN",
        regex_list=[
            r"Could not connect to archive\.ubuntu\.com",
            r"W: Failed to fetch http://.*\.ubuntu\.com.*Connection failed",
            r"E: Unable to fetch some archives, maybe run apt-get update"
        ],
        title="Ubuntu Package Mirror Transiently Unreachable",
        summary_template="Apt-get mirror connection dropped during system dependency installation.",
        suggested_direction="Safe to RERUN. If error recurs, switch mirror or add `--fix-missing` to apt-get.",
        confidence=0.96,
        fingerprint_prefix="net_apt_mirror"
    ),
    FailurePattern(
        pattern_id="NET_HTTP_502_503_REGISTRY",
        category="TRANSIENT_NETWORK",
        action_type="RERUN",
        regex_list=[
            r"received unexpected HTTP status: 502 Bad Gateway",
            r"received unexpected HTTP status: 503 Service Unavailable",
            r"HTTP/1\.1 503 Service Temporarily Unavailable"
        ],
        title="Upstream Service 502/503 Unavailable",
        summary_template="Remote server returned HTTP 502/503 during package or image download.",
        suggested_direction="Safe to RERUN the pipeline. Remote infrastructure was temporarily degraded.",
        confidence=0.95,
        fingerprint_prefix="net_upstream_503"
    ),

    # -------------------------------------------------------------
    # 5. FLAKY TESTS & CONCURRENCY CONFLICTS
    # -------------------------------------------------------------
    FailurePattern(
        pattern_id="FLK_JEST_ASYNC_TIMEOUT",
        category="FLAKY_CONCURRENCY",
        action_type="RERUN",
        regex_list=[
            r"Timeout - Async callback was not invoked within the (?P<name>\d+)\s*ms timeout specified by jest\.setTimeout",
            r"Exceeded timeout of (?P<name>\d+)\s*ms for a (hook|test)"
        ],
        title="Jest Asynchronous Callback Timeout (Flaky)",
        summary_template="Test timed out waiting for an asynchronous callback or unhandled promise resolution.",
        suggested_direction="RERUN may pass. For permanent resolution, check for unhandled asynchronous promises, increase test timeout, or mock external I/O.",
        confidence=0.93,
        fingerprint_prefix="flk_jest_timeout"
    ),
    FailurePattern(
        pattern_id="FLK_GO_RACE_DETECTED",
        category="FLAKY_CONCURRENCY",
        action_type="FIX",
        regex_list=[
            r"WARNING: DATA RACE[\s\S]*?Write at 0x[0-9a-f]+ by goroutine \d+[\s\S]*?Previous read at 0x[0-9a-f]+",
            r"WARNING: DATA RACE"
        ],
        title="Go Data Race Condition Detected",
        summary_template="Go race detector caught unsynchronized concurrent read/write access to shared memory.",
        suggested_direction="Add a sync.Mutex, sync.RWMutex, or channel synchronization to guard concurrent memory access.",
        confidence=0.97,
        fingerprint_prefix="flk_go_race"
    ),
    FailurePattern(
        pattern_id="FLK_DB_DEADLOCK",
        category="FLAKY_CONCURRENCY",
        action_type="RERUN",
        regex_list=[
            r"deadlock detected[\s\S]*?Process \d+ waits for ShareLock",
            r"ERROR: deadlock detected",
            r"Deadlock found when trying to get lock; try restarting transaction"
        ],
        title="Database Transaction Deadlock",
        summary_template="Parallel test suite triggered concurrent database transaction locks.",
        suggested_direction="RERUN pipeline. To avoid recurrence, isolate parallel test databases (e.g. per-worker DB) or order table locks consistently.",
        confidence=0.94,
        fingerprint_prefix="flk_db_deadlock"
    ),
    FailurePattern(
        pattern_id="FLK_PORT_EADDRINUSE",
        category="FLAKY_CONCURRENCY",
        action_type="RERUN",
        regex_list=[
            r"Error: listen EADDRINUSE: address already in use [0-9\.:]+:(?P<name>\d+)",
            r"address already in use (:::|\*+:)(?P<name>\d+)",
            r"bind: address already in use"
        ],
        title="TCP Port Collision (EADDRINUSE)",
        summary_template="Port {entity} is already bound by an orphan process or parallel test worker.",
        suggested_direction="RERUN pipeline. Ensure server tear-down hooks kill child processes or allocate random ports (`port: 0`) in tests.",
        confidence=0.95,
        fingerprint_prefix="flk_eaddrinuse"
    ),

    # -------------------------------------------------------------
    # 6. CODE COMPILATION, TYPESCRIPT & LINTING
    # -------------------------------------------------------------
    FailurePattern(
        pattern_id="CODE_TYPESCRIPT_TS2322",
        category="COMPILATION_LINT",
        action_type="FIX",
        regex_list=[
            r"error TS2322:\s+(?P<name>Type '.*' is not assignable to type '.*')",
            r"error TS\d+:\s+(?P<name>.*)"
        ],
        title="TypeScript Compilation Type Error",
        summary_template="TypeScript compiler detected type incompatibility: {entity}.",
        suggested_direction="FIX: Update type definitions or cast the incompatible value in the failing file.",
        confidence=0.97,
        fingerprint_prefix="code_ts_type"
    ),
    FailurePattern(
        pattern_id="CODE_RUST_BORROW_E0382",
        category="COMPILATION_LINT",
        action_type="FIX",
        regex_list=[
            r"error\[E0382\]:\s+use of moved value:\s+`(?P<name>[^`]+)`",
            r"error\[E\d+\]:\s+(?P<name>.*)"
        ],
        title="Rust Borrow Checker Error (E0382)",
        summary_template="Rust compiler rejected variable move/borrow: use of moved value '{entity}'.",
        suggested_direction="FIX: Clone the value before moving, or pass by reference (`&{entity}`).",
        confidence=0.98,
        fingerprint_prefix="code_rust_borrow"
    ),
    FailurePattern(
        pattern_id="CODE_ESLINT_RULE_FAIL",
        category="COMPILATION_LINT",
        action_type="FIX",
        regex_list=[
            r"(?P<name>\d+\s+problems?\s+\(\d+\s+errors?,\s+\d+\s+warnings?\))",
            r"ESLint found problems",
            r"error\s+['\"][^'\"]+['\"]\s+is defined but never used\s+@typescript-eslint/no-unused-vars"
        ],
        title="ESLint Static Analysis Violations",
        summary_template="Linter checks failed with rule violations: {entity}.",
        suggested_direction="FIX: Run `npm run lint -- --fix` locally or remove unused declarations before committing.",
        confidence=0.96,
        fingerprint_prefix="code_eslint"
    ),

    # -------------------------------------------------------------
    # 7. UNIT & INTEGRATION TEST ASSERTIONS
    # -------------------------------------------------------------
    FailurePattern(
        pattern_id="TEST_PYTEST_ASSERTION",
        category="TEST_ASSERTION",
        action_type="FIX",
        regex_list=[
            r"AssertionError:\s+assert\s+(?P<name>.*)",
            r"E\s+AssertionError:\s+(?P<name>.*)",
            r"FAILED\s+(?P<name>tests/[a-zA-Z0-9_\-\./]+::[a-zA-Z0-9_]+)\s+-\s+AssertionError"
        ],
        title="Pytest Assertion Failure",
        summary_template="Test expectation mismatch in pytest: {entity}.",
        suggested_direction="FIX: Inspect business logic or update assertion expectations if specifications changed.",
        confidence=0.96,
        fingerprint_prefix="test_pytest_assert"
    ),
    FailurePattern(
        pattern_id="TEST_JEST_EXPECT_FAIL",
        category="TEST_ASSERTION",
        action_type="FIX",
        regex_list=[
            r"expect\(received\)\.(?P<name>[a-zA-Z0-9_]+)\(expected\)[\s\S]*?Expected:[\s\S]*?Received:",
            r"FAIL\s+(?P<name>[a-zA-Z0-9_\-\./]+\.test\.[jt]sx?)"
        ],
        title="Jest Test Assertion Mismatch",
        summary_template="Jest test assertion failed in test suite '{entity}'.",
        suggested_direction="FIX: Check received vs expected diff in the test suite and fix the regression.",
        confidence=0.96,
        fingerprint_prefix="test_jest_assert"
    ),
    FailurePattern(
        pattern_id="TEST_GO_UNIT_FAIL",
        category="TEST_ASSERTION",
        action_type="FIX",
        regex_list=[
            r"--- FAIL:\s+(?P<name>[a-zA-Z0-9_]+)\s+\(\d+\.\d+s\)"
        ],
        title="Go Unit Test Failure",
        summary_template="Go unit test '{entity}' failed during execution.",
        suggested_direction="FIX: Run `go test -v -run {entity}` locally to reproduce and resolve the failed condition.",
        confidence=0.96,
        fingerprint_prefix="test_go_fail"
    ),

    # -------------------------------------------------------------
    # 8. INFRASTRUCTURE & ENVIRONMENT CONFIGURATION
    # -------------------------------------------------------------
    FailurePattern(
        pattern_id="INF_MISSING_ENV_VAR",
        category="INFRA_ENVIRONMENT",
        action_type="FIX",
        regex_list=[
            r"KeyError:\s+['\"](?P<name>[A-Z0-9_]+)['\"]",
            r"Missing required environment variable:\s*(?P<name>[A-Z0-9_]+)",
            r"process\.env\.(?P<name>[A-Z0-9_]+) is undefined"
        ],
        title="Missing Required Environment Variable",
        summary_template="Application crashed attempting to access missing environment variable '{entity}'.",
        suggested_direction="Add '{entity}' to GitHub Actions repository secrets / workflow environment variables block.",
        confidence=0.97,
        fingerprint_prefix="inf_missing_env"
    ),
    FailurePattern(
        pattern_id="INF_DOCKER_COPY_MISSING",
        category="INFRA_ENVIRONMENT",
        action_type="FIX",
        regex_list=[
            r"COPY failed:\s+file not found in build context or excluded by \.dockerignore:\s+stat\s+(?P<name>[^\s:]+)",
            r"failed to solve: failed to compute cache key: .* not found"
        ],
        title="Docker COPY File Not Found in Context",
        summary_template="Dockerfile COPY command failed: file or folder '{entity}' missing from build context.",
        suggested_direction="Verify file path in Dockerfile and ensure it is not excluded by `.dockerignore` or missing from git.",
        confidence=0.97,
        fingerprint_prefix="inf_docker_copy"
    ),
    FailurePattern(
        pattern_id="INF_TERRAFORM_ACCESS_DENIED",
        category="INFRA_ENVIRONMENT",
        action_type="FIX",
        regex_list=[
            r"AccessDenied:\s+User: .* is not authorized to perform:\s+(?P<name>[a-zA-Z0-9:]+)",
            r"Error: AccessDenied:\s+Access Denied"
        ],
        title="Cloud IAM Access Denied (Terraform)",
        summary_template="Terraform CI identity lacks IAM permission: '{entity}'.",
        suggested_direction="Grant the required IAM permission '{entity}' to the CI role/user in cloud provider IAM policies.",
        confidence=0.97,
        fingerprint_prefix="inf_tf_access"
    ),
    FailurePattern(
        pattern_id="INF_SSL_CERT_EXPIRED",
        category="INFRA_ENVIRONMENT",
        action_type="FIX",
        regex_list=[
            r"certificate has expired",
            r"CERT_HAS_EXPIRED",
            r"SSL certificate problem: certificate has expired"
        ],
        title="TLS / SSL Certificate Expired",
        summary_template="Connecting to internal artifact registry or server failed due to expired SSL certificate.",
        suggested_direction="Renew the expired SSL certificate on the target internal service or registry.",
        confidence=0.96,
        fingerprint_prefix="inf_ssl_cert"
    ),
]


class PatternLibraryEngine:
    def __init__(self, patterns: List[FailurePattern] = None):
        self.patterns = patterns or FAILURE_PATTERNS

    def match(self, text: str) -> Optional[PatternMatch]:
        """
        Scans text against curated failure patterns and returns the best matching pattern.
        """
        for pattern in self.patterns:
            match = pattern.match(text)
            if match:
                return match
        return None
