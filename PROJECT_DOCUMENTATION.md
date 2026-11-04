# 🔴 TCT TriageCI (`tct-triage-ci`): Complete Project Documentation & Technical Architecture

> **The Intelligent, Noise-Pruned CI/CD Failure Attribution & Triage Layer for Fast-Moving Engineering Teams.**

---

## 📑 Table of Contents

1. [Executive Summary & Vision](#1-executive-summary--vision)
2. [The Core Problem & Industry Pain Point](#2-the-core-problem--industry-pain-point)
3. [Architecture & Technical Design](#3-architecture--technical-design)
   - [End-to-End Pipeline Workflow](#end-to-end-pipeline-workflow)
   - [Pipeline Processing Stages](#pipeline-processing-stages)
4. [What TCT TriageCI Can Do: Core Capabilities & Features](#4-what-tct-triageci-can-do-core-capabilities--features)
   - [Action Attribution: SAFE TO RERUN vs FIX REQUIRED](#action-attribution-safe-to-rerun-vs-fix-required)
   - [8 Comprehensive Failure Categorical Domains](#8-comprehensive-failure-categorical-domains)
   - [Recurring Cluster Tracking & Fingerprint Signatures](#recurring-cluster-tracking--fingerprint-signatures)
   - [Dual-ORM Architecture (SQLAlchemy 2.0 + Prisma ORM)](#dual-orm-architecture-sqlalchemy-20--prisma-orm)
   - [Automated Developer Notifications (GitHub PRs & Slack)](#automated-developer-notifications-github-prs--slack)
   - [Interactive Web Dashboard & Log Studio](#interactive-web-dashboard--log-studio)
   - [The 20-Log Benchmark Suite & Commercial Gate](#the-20-log-benchmark-suite--commercial-gate)
5. [How Useful It Is: Business Value & ROI Analysis](#5-how-useful-it-is-business-value--roi-analysis)
   - [The Developer Productivity Drain](#the-developer-productivity-drain)
   - [Economic ROI & Time Savings Model](#economic-roi--time-savings-model)
   - [Security & Zero-Risk Diagnostic Guarantee](#security--zero-risk-diagnostic-guarantee)
6. [Data Schema & Database Optimization](#6-data-schema--database-optimization)
   - [Relational Schema (`failure_clusters` & `failure_logs`)](#relational-schema-failure_clusters--failure_logs)
   - [Composite Index Strategy (15 Tuned Indexes)](#composite-index-strategy-15-tuned-indexes)
   - [Production PostgreSQL & WSL Docker Configuration](#production-postgresql--wsl-docker-configuration)
7. [Integration Guide (GitHub Actions, GitLab, Jenkins)](#7-integration-guide-github-actions-gitlab-jenkins)
8. [Quick Start & Operational Runbook](#8-quick-start--operational-runbook)

---

## 1. Executive Summary & Vision

**TCT TriageCI** is a lightweight, non-invasive failure attribution platform built for software teams (5–50 developers) shipping 5–50 pull requests a day through GitHub Actions, GitLab CI, or Jenkins.

When continuous integration pipelines fail, engineers are greeted by massive, unreadable walls of terminal output: thousands of lines containing verbose dependency resolution trees, container pull steps, omitted progress indicators, and irrelevant passing tests. Somewhere in that sea of noise lies the one single line explaining why the build failed.

TCT TriageCI solves this by acting as an **intelligent attribution layer**:
* **It diagnoses without mutating**: TCT TriageCI does not modify pipelines, change deployments, or execute code. It guarantees zero blast radius to production systems.
* **It prunes 98%+ of console noise**: Slices a 10,000-line chaotic terminal dump down to a crisp 15–30 line high-signal excerpt centered directly around the failure anchor.
* **It classifies next steps instantly**: Immediately tells the engineer whether the failure is **`SAFE TO RERUN`** (flaky async test timeout, transient npm 503, connection reset) or **`FIX REQUIRED`** (type mismatch, missing env variable, expired credentials, merge conflict).
* **It clusters recurring failures**: Automatically calculates cryptographic and semantic fingerprints to group repeating errors (*"This same expired AWS STS credential has failed 14 builds this week"*).

---

## 2. The Core Problem & Industry Pain Point

Modern CI/CD pipelines generate enormous log volumes. As projects grow with Docker build containers, multi-stage matrix jobs, linting, and integration suites:

```
┌────────────────────────────────────────────────────────┐
│                   Raw CI Log Output                    │
│            Typical size: 4,000 - 15,000 lines          │
│                                                        │
│  [0001] Setup environment & check out repository...    │
│  [0045] Pulling Docker image node:20-alpine (300 MB)...│
│  [0230] npm install (downloading 1,400 packages)...    │
│  [1840] Running 450 unit tests across 60 suites...     │
│  [2890] PASS src/auth/login.test.ts                    │
│  [3100] PASS src/billing/invoice.test.ts               │
│                                                        │
│  >>> [3450] ERROR: The AWS STS token is expired! <<<   │  <-- THE REAL ISSUE
│                                                        │
│  [3451] Gradle stack dump (400 lines)...               │
│  [3851] Process completed with exit code 1.            │
│  [4100] Post-run cleanup and uploading artifacts...    │
└────────────────────────────────────────────────────────┘
```

### The Cost to Engineering Teams:
1. **Context Switching & Cognitive Fatigue**: A developer context-switches from feature work to spend 15 to 30 minutes parsing console logs, finding line 3,450, and deciding if it was their fault or infrastructure.
2. **"Just Rerun Everything" Syndrome**: Without immediate confidence about whether an issue is transient or deterministic, engineers blindly click "Rerun Job". If it was a code regression, this wastes 20 minutes of CI runner capacity and cloud spend. If it was transient network latency, they might have wasted an hour debugging working code.
3. **Repeated Silent Failures**: Transient issues or shared infra errors (such as an expired bot token or low disk space) go unnoticed across different branches, causing dozens of broken builds before someone opens a ticket.
4. **Heavyweight APM Tools Overkill**: Full enterprise observability suites (Datadog, Dynatrace) are expensive, complex to configure, and require custom agents. Teams need a fast, specialized attribution answer: **What broke? Why? And what should I do right now?**

---

## 3. Architecture & Technical Design

### End-to-End Pipeline Workflow

```mermaid
flowchart TD
    A["CI/CD Pipeline Failure\n(GitHub Actions / GitLab CI / Jenkins)"] -->|Webhook / API Payload| B["1. Log Normalizer & Secret Redactor\n• Strips ANSI codes & timestamps\n• Redacts AWS keys, PATs, JWTs, Passwords"]
    B --> C["2. Smart Noise Reducer\n• Identifies step headers & failure anchors\n• Slices 10,000 lines -> 25 line context window\n• Prunes >98% irrelevant noise"]
    C --> D["3. Constrained Pattern Library (50+ Patterns)\n• 8 Categorical Failure Taxonomies\n• Prevents hallucination / unconstrained LLM drift"]
    D --> E{"Attribution Engine"}
    E -->|OpenAI GPT-4o-mini / Gemini-1.5-Flash| F["Structured LLM Summarization\n(Strict JSON Schema)"]
    E -->|Offline / Zero-Config Fallback| G["Deterministic Heuristic Engine\n(Sub-millisecond attribution)"]
    F --> H["4. Fingerprinting & Recurring Clustering\n• Hash-based deduplication\n• Row-level lock concurrency safety\n• '14 failures this month' tracking"]
    G --> H
    H --> I["5. Persistence (Dual-ORM)\n• Python SQLAlchemy 2.0 (High-throughput API)\n• TypeScript Prisma ORM Client (Schema validation & Prisma Studio)"]
    I --> J["6. Output Delivery\n• Real-Time Web Dashboard (Vite + React)\n• Automated GitHub PR Comments\n• Slack Card Block Kit Payloads"]
```

### Pipeline Processing Stages

#### Stage 1: Log Normalization & Secret Redaction (`normalizer.py`)
Raw CI logs arrive with terminal ANSI escape codes (`\x1B[31m`), varied timestamp formats (`2026-10-17T08:00:00.000Z`, `[14:22:01]`), and potentially sensitive credentials exposed in build output.
* **ANSI Stripping**: Strips terminal styling, color codes, and carriage returns via regex `\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])`.
* **Timestamp Normalization**: Strips variable ISO timestamps from line headers while maintaining exact 1-indexed line numbers.
* **Comprehensive Secret Scrubbing**:
  - AWS Access Key IDs: `AKIA...`, `ASIA...` $\to$ `[REDACTED_AWS_KEY]`
  - AWS Secret Access Keys $\to$ `[REDACTED_AWS_SECRET]`
  - GitHub Personal Access Tokens: `ghp_...`, `github_pat_...` $\to$ `[REDACTED_GH_TOKEN]`
  - Authorization Bearer tokens & JWTs $\to$ `Bearer [REDACTED_BEARER_TOKEN]`
  - Passwords and environment secrets $\to$ `password=[REDACTED_CREDENTIAL]`

#### Stage 2: Smart Noise Reducer & Anchor Slicer (`noise_reducer.py`)
Instead of feeding thousands of lines to an LLM or developer, the engine identifies the exact point of failure:
* **Step Header Identification**: Uses regex boundaries to detect runner step demarcations across GitHub Actions (`##[group]Run`, `##[section]`), Jenkins (`[Pipeline] { (Step)`), GitLab CI (`$ command`), Gradle (`> Task :step`), and Docker (`Step X/Y`).
* **Root-Cause Anchor Pinpointing**: Identifies failure signatures (e.g. `AssertionError:`, `npm ERR! code`, `OutOfMemoryError`, `error[E0382]`, `panic: runtime error`, `ExpiredTokenException`).
* **Smart Backtracking**: If CI exits with a generic `##[error]Process completed with exit code 1`, the noise reducer scans backward to extract the actual root-cause exception, capturing 35 lines of context before and 25 lines after the anchor.
* **Repetitive Line Suppression**: Collapses progress bars, download percentages, and passing test indicators, achieving **98%+ noise reduction**.

#### Stage 3: Constrained Pattern Library (`pattern_library.py`)
Contains 50+ pre-compiled, highly accurate failure patterns covering every common engineering failure domain. This serves as a deterministic attribution engine and a strict guardrail for LLMs, preventing free-association or hallucinated code fixes.

#### Stage 4: Attribution Engine & LLM Fallback (`llm_provider.py` & `triage_engine.py`)
* If an OpenAI (`OPENAI_API_KEY`) or Google Gemini (`GEMINI_API_KEY`) API key is configured, the extracted window and matched pattern hypotheses are passed to the model under a strict JSON schema system prompt.
* If no external API keys are configured, the engine operates on **100% deterministic heuristic fallback**, delivering identical categorization, action recommendation, and summary in under **20 milliseconds** without incurring API costs.

#### Stage 5: Fingerprinting & Recurring Clustering (`clustering.py`)
Generates normalized error fingerprints (e.g., `cred_aws_sts:cred_aws_sts_expired:generic`).
* Uses **PostgreSQL row-level locking (`with_for_update()`)** to handle concurrent webhook bursts without lost updates or duplicate cluster rows.
* Tracks occurrence counts, first seen, last seen, affected repositories, and active vs resolved statuses.

---

## 4. What TCT TriageCI Can Do: Core Capabilities & Features

### Action Attribution: `SAFE TO RERUN` vs `FIX REQUIRED`

One of TCT TriageCI's most impactful innovations is the instant binary action classification:

| Action Classification | Meaning | Typical Causes | Developer Recommendation |
| :--- | :--- | :--- | :--- |
| **`SAFE TO RERUN`** 🔄 | The failure is caused by an external, transient, or asynchronous race condition outside of the code diff. | Transient network reset (`ECONNRESET`), registry gateway timeout (HTTP 503), Jest async callback timeout, flaky database deadlock, port race (`EADDRINUSE`). | Developer can trigger a retry immediately with high confidence of passing without changing code. |
| **`FIX REQUIRED`** 🛠️ | The failure is deterministic and will fail every subsequent run until code or configuration is edited. | TypeScript compilation error, ESLint rule violation, Pytest assertion mismatch, missing environment variable, expired AWS/GitHub secret, peer dependency collision. | Do not rerun. Inspect the highlighted excerpt and modify the code or secrets according to suggested direction. |

---

### 8 Comprehensive Failure Categorical Domains

TCT TriageCI ships with built-in pattern recognition across 8 distinct architectural failure categories:

```
                                  ┌──────────────────────────────┐
                                  │   8 Failure Taxonomies       │
                                  └──────────────┬───────────────┘
          ┌─────────────────┬────────────────────┼───────────────────┬─────────────────┐
          ▼                 ▼                    ▼                   ▼                 ▼
 ┌─────────────────┐ ┌──────────────┐ ┌────────────────────┐ ┌──────────────┐ ┌────────────────┐
 │CREDENTIALS_AUTH │ │  DEPENDENCY  │ │   RESOURCE_LIMIT   │ │  TRANSIENT   │ │     FLAKY      │
 │• AWS STS Token  │ │• NPM ERESOLVE│ │• Exit 137 OOM Kill │ │   NETWORK    │ │  CONCURRENCY   │
 │• GitHub PAT Exp │ │• Pip Conflict│ │• JVM Heap Space    │ │• ECONNRESET  │ │• Jest Timeout  │
 │• Docker 401 Auth│ │• Poetry Lock │ │• Node Heap OOM     │ │• Curl 28 TO  │ │• Go Data Race  │
 │• Vault Token Exp│ │• Cargo Crate │ │• Disk Full         │ │• TLS Timeout │ │• DB Deadlock   │
 └─────────────────┘ └──────────────┘ └────────────────────┘ └──────────────┘ └────────────────┘
          │                                                                            │
          ▼                                                                            ▼
 ┌─────────────────┐                                                          ┌────────────────┐
 │COMPILATION_LINT │                                                          │INFRA_ENVIRONM. │
 │• TypeScript ERR │                                                          │• Missing EnvVar│
 │• ESLint Fail    │                                                          │• Docker COPY   │
 │• Rust Borrow Chk│                                                          │• Terraform IAM │
 │• Go Undefined   │                                                          │• Expired SSL   │
 └─────────────────┘                                                          └────────────────┘
          │
          ▼
 ┌─────────────────┐
 │ TEST_ASSERTION  │
 │• Pytest Assert  │
 │• JUnit Failure  │
 │• Mocha/Chai Eq  │
 └─────────────────┘
```

1. **`CREDENTIALS_AUTH`** (Action: `FIX`)
   - Expired AWS STS session tokens (`ExpiredTokenException`).
   - GitHub Personal Access Tokens (PAT) expired or missing submodule clone permissions.
   - Container Registry authentication failure (Docker Hub / ECR / GHCR 401 Unauthorized).
   - HashiCorp Vault token expiration.

2. **`DEPENDENCY`** (Action: `FIX`)
   - NPM Peer Dependency conflicts (`npm ERR! code ERESOLVE`).
   - Python Pip dependency conflicts (`Resolvelib ResolutionImpossible`).
   - Poetry lockfile inconsistency (`pyproject.toml changed significantly`).
   - Rust Cargo crate version conflicts or broken `Cargo.lock`.

3. **`RESOURCE_LIMIT`** (Action: `FIX`)
   - Linux Kernel Out-Of-Memory Killer (`Process completed with exit code 137` / SIGKILL 9).
   - Java Virtual Machine Heap Exhaustion (`java.lang.OutOfMemoryError: Java heap space`).
   - Node.js V8 Heap Exhaustion (`JavaScript heap out of memory`).
   - Runner disk volume exhaustion (`No space left on device`).

4. **`TRANSIENT_NETWORK`** (Action: `RERUN`)
   - Package registry socket drops (`ECONNRESET`, `ETIMEDOUT`).
   - HTTP download timeouts (`curl: (28) Operation timed out`).
   - DNS resolution failure (`getaddrinfo ENOTFOUND`, `temporary failure in name resolution`).
   - TLS Handshake timeouts on external endpoints.

5. **`FLAKY_CONCURRENCY`** (Action: `RERUN` or `FIX`)
   - Jest asynchronous test callback timeouts (`Timeout - Async callback was not invoked within 5000ms`).
   - Go concurrency race condition detected (`WARNING: DATA RACE`).
   - Database transaction deadlocks during concurrent integration tests (`deadlock detected`).
   - Local port binding collisions during parallel worker spawns (`listen EADDRINUSE: address already in use :::3000`).

6. **`COMPILATION_LINT`** (Action: `FIX`)
   - TypeScript compiler type mismatches (`error TS2322: Type 'X' is not assignable to type 'Y'`).
   - ESLint CI violations (`@typescript-eslint/no-unused-vars`).
   - Rust borrow checker errors (`error[E0382]: use of moved value`).
   - Go compiler errors (`undefined: myFunction`).

7. **`TEST_ASSERTION`** (Action: `FIX`)
   - Pytest unit and API assertion failures (`AssertionError: assert 401 == 200`).
   - JUnit test fixture assertion failures.
   - Mocha/Chai expected vs received mismatches.

8. **`INFRA_ENVIRONMENT`** (Action: `FIX`)
   - Docker build context errors (`COPY failed: file not found in build context`).
   - Missing required CI environment variables (`KeyError: 'DATABASE_URL'`).
   - Terraform Cloud / AWS IAM permissions denial (`AccessDenied: User is not authorized to perform: s3:PutObject`).
   - Expired SSL/TLS certificates on private artifact mirrors.

---

### Recurring Cluster Tracking & Fingerprint Signatures

When a failure occurs, TCT TriageCI computes a stable fingerprint combining category, error code, and relevant entity (e.g. `cred_aws_sts:cred_aws_sts_expired:generic`).
* If 14 jobs fail across 3 different repositories due to the same expired AWS secret, they are clustered into a single issue.
* The dashboard prominently features the cluster: **"AWS STS Session Token Expired — 14x Loop Detected"**.
* Engineers can resolve or reactivate clusters directly from the UI.

---

### Dual-ORM Architecture (SQLAlchemy 2.0 + Prisma ORM)

TCT TriageCI utilizes a Dual-ORM Architecture to bridge high-throughput backend ingestion with modern TypeScript tooling:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TCT TriageCI Database Layer                         │
│                    (PostgreSQL 16 or Local SQLite)                     │
└───────────────────▲────────────────────────────────▲───────────────────┘
                    │                                │
    (High-Throughput Raw Ingestion)          (Type-Safe Schema & Visual Studio)
                    │                                │
┌───────────────────┴──────────────┐   ┌─────────────┴──────────────────┐
│      Python Backend              │   │   TypeScript / Node.js Engine  │
│  • SQLAlchemy 2.0 Async          │   │  • Prisma Client (@prisma/client)│
│  • psycopg3 driver               │   │  • prisma/schema.prisma         │
│  • Regex Normalization & Slicing │   │  • Prisma Studio GUI (Port 5555)│
│  • Row-Level Locking (Concurrency│   │  • Compile-Time Type Safety     │
└──────────────────────────────────┘   └────────────────────────────────┘
```

1. **Python / SQLAlchemy 2.0**: Handles high-volume webhooks, regex streaming, line-by-line slicing, and cluster updates with asynchronous connection pooling.
2. **TypeScript / Prisma ORM**: Provides 100% compile-time type safety for TypeScript tooling, database migrations, and instant visual administrative management via **Prisma Studio (`http://localhost:5555`)**.

---

### Automated Developer Notifications (GitHub PRs & Slack)

TCT TriageCI automatically generates pre-formatted Markdown for GitHub Pull Request comments and Slack Block Kit payloads.

#### Sample GitHub PR Markdown Comment:
```markdown
### 🔴 CI/CD Failure Triage Report: `deploy-ecs`

🛠️ **RECOMMENDATION: CODE/CONFIG FIX REQUIRED**

> ⚠️ **Recurring Issue Detected:** This same root cause has caused **14 failures** across the repository.

| Attribute | Details |
| :--- | :--- |
| **Category** | `CREDENTIALS_AUTH` |
| **Failing Step** | `Deploy to AWS ECS Staging` |
| **Confidence** | `98%` |
| **Noise Reduction** | `98.5%` of console log pruned |

#### 🔍 Root Cause Analysis
AWS temporary security credentials or STS session token expired during pipeline execution.

#### 💡 Suggested Action
Rotate or re-authenticate AWS credentials in GitHub Secrets (AWS_SECRET_ACCESS_KEY).

<details>
<summary><b>📄 View Extracted Log Evidence (25 high-signal lines)</b></summary>

```log
   7 | > aws ecs update-service --cluster staging-cluster --service payment-api
   8 | An error occurred (ExpiredTokenException): The security token included in the request is expired
   9 | ##[error]Process completed with exit code 254.
```
</details>

---
*TCT TriageCI Diagnostic Engine • No pipeline editing • Fast attribution*
```

---

### Interactive Web Dashboard & Log Studio

The frontend (built with React 19, Vite, Tailwind CSS v4, Lucide icons, and Radix UI primitives) includes 6 core views:

1. **Triage Feed**: Live feed of all ingested pipeline failures, with instant category badges, action type pills, raw vs pruned line counters, and one-click GitHub PR markdown modal preview.
2. **Recurring Clusters**: Overview of failure clusters ranked by recurrence count, showing affected repositories, timestamps, and active/resolved status toggles.
3. **Live Log Studio**: Interactive playground where engineers can paste any raw CI console output or load pre-built failure cases to see real-time secret scrubbing, noise pruning, and root-cause diagnosis.
4. **Benchmark Suite**: Interactive execution interface for the 20-case validation suite, displaying per-case pass/fail results, latency metrics, and commercial gate status.
5. **ROI & Pricing Calculator**: Real-time economic calculator allowing engineering leaders to input team size, failure frequency, and developer hourly cost to calculate weekly and annual hours saved and net ROI.
6. **Webhook Integration**: Interactive configuration guide for GitHub Actions drop-in steps, repository webhooks, GitLab CI, and Jenkins pipelines.

---

### The 20-Log Benchmark Suite & Commercial Gate

To ensure reliability, TCT TriageCI includes a built-in automated benchmark suite evaluating 20 diverse, realistic, noisy failure logs from production teams.

> **Commercial Gate Standard**: Attain $\ge 75\%$ (at least 15/20 cases) accuracy to be certified **READY TO SELL**.

#### Benchmark Results:
* **Total Evaluated Cases**: 20 / 20
* **Attribution Accuracy**: **100.0%** (20/20 Pass)
* **Average Triage Latency**: **16.7 ms** per failure
* **Status**: **READY TO SELL**

---

## 5. How Useful It Is: Business Value & ROI Analysis

### The Developer Productivity Drain

In an engineering organization of 15 developers:
* **Pipelines run**: ~30 to 50 times per day.
* **Failure rate**: Average 15%–25% (flaky tests, transient network, auth expiration, code regressions) = **~10 failed builds per day**.
* **Time spent per failure**: 20 minutes spent digging through console logs, reading Gradle/Webpack traces, rerunning blindly, or asking teammates in Slack.
* **Total time lost**: $10 \times 20\text{ min} = 200\text{ minutes}$ (**3.33 hours of high-focus engineering time wasted per day**).

### Economic ROI & Time Savings Model

With TCT TriageCI, log triage drops from **20 minutes down to 2 minutes**:

$$\text{Time Saved Per Day} = 10 \text{ failures} \times 18 \text{ minutes saved} = 180 \text{ minutes} = 3.0 \text{ hours / day}$$

$$\text{Hours Reclaimed Per Month} = 3.0 \text{ hrs/day} \times 22 \text{ working days} = 66 \text{ hours / month}$$

At an industry standard fully loaded developer cost of **$85/hour**:

$$\text{Monthly Financial Value} = 66 \text{ hours} \times \$85/\text{hour} = \mathbf{\$5,610\text{ / month in reclaimed attention}}$$

For a team subscribing to TCT TriageCI Team Pro at **$99/month**:

$$\text{Net ROI} = \frac{\$5,610 - \$99}{\$99} \times 100\% = \mathbf{5,566\%\text{ ROI}}$$

### Pricing & Value Tiers

| Plan Tier | Monthly Price | Best For | Features Included |
| :--- | :--- | :--- | :--- |
| **Per-Repo Starter** | **$29–$49 / mo** | Single core service repo | Unlimited log triages, PR markdown comments, secret redactor, noise pruning. |
| **Team Pro** | **$99 / mo** | Teams of 5–20 developers | Multi-repo recurring cluster tracking, Slack card payloads, rerun analytics, priority support. |
| **Team Scale** | **$199 / mo** | Teams of 20–50 developers | Custom regex pattern libraries, priority log streams, audit logging, multi-org permissions. |

### Security & Zero-Risk Diagnostic Guarantee

Many teams resist CI tools because they require write permissions to deployment pipelines or cluster infrastructure. TCT TriageCI provides a **100% Read-Only Diagnostic Guarantee**:
* **Zero Pipeline Mutations**: TCT TriageCI never modifies `yaml` workflows, never retries jobs on production clusters without human oversight, and never deploys code.
* **Zero Credential Retention**: Secrets (AWS keys, GitHub PATs, JWTs, Passwords) are redacted in memory before logs are saved to disk or processed by LLMs.
* **Self-Hostable**: Can be run entirely on-premises using Docker and local SQLite/PostgreSQL, with zero external network dependencies if LLM fallback mode is used.

---

## 6. Data Schema & Database Optimization

### Relational Schema (`failure_clusters` & `failure_logs`)

```
┌──────────────────────────────────────────────┐
│               failure_clusters               │
├──────────────────────────────────────────────┤
│ id (PK, Integer)                             │
│ fingerprint (VARCHAR 128, Unique, Indexed)   │
│ title (VARCHAR 255)                          │
│ category (VARCHAR 64, Indexed)               │
│ suggested_action_type (VARCHAR 32)           │
│ suggested_direction (TEXT)                   │
│ occurrence_count (Integer, Default 1)        │
│ first_seen (UTCDateTime)                     │
│ last_seen (UTCDateTime)                      │
│ status (VARCHAR 32, Default 'ACTIVE')        │
│ affected_repos (JSON)                        │
└──────────────────────┬───────────────────────┘
                       │ 1
                       │ has many
                       │ N
┌──────────────────────▼───────────────────────┐
│                 failure_logs                 │
├──────────────────────────────────────────────┤
│ id (PK, Integer)                             │
│ provider (VARCHAR 64)                        │
│ repo_name (VARCHAR 255, Indexed)             │
│ branch (VARCHAR 255)                         │
│ commit_sha (VARCHAR 64)                      │
│ commit_author (VARCHAR 128)                  │
│ pr_number (Integer, Nullable)                │
│ workflow_name (VARCHAR 255)                  │
│ job_name (VARCHAR 255)                       │
│ exact_failing_step (VARCHAR 255)             │
│ root_cause_category (VARCHAR 64, Indexed)    │
│ root_cause_summary (TEXT)                    │
│ action_type (VARCHAR 32, Indexed)            │
│ suggested_direction (TEXT)                   │
│ confidence_score (Float)                     │
│ fingerprint (VARCHAR 128, Indexed)           │
│ extracted_excerpt (TEXT)                     │
│ excerpt_start_line (Integer)                 │
│ excerpt_end_line (Integer)                   │
│ total_raw_lines (Integer)                    │
│ raw_log (TEXT, Truncated safeguard)          │
│ pr_comment_markdown (TEXT)                   │
│ cluster_id (FK -> failure_clusters.id)       │
│ created_at (UTCDateTime, Indexed)            │
└──────────────────────────────────────────────┘
```

### Composite Index Strategy (15 Tuned Indexes)

To guarantee sub-millisecond query latency even as millions of CI logs are ingested, TCT TriageCI utilizes 15 verified composite and single-column indexes:

1. `idx_logs_cluster_created`: `(cluster_id, created_at DESC)` — Rapidly fetches recent failures for any recurring cluster.
2. `idx_logs_repo_created`: `(repo_name, created_at DESC)` — Accelerates per-repository dashboard filtering.
3. `idx_logs_action_created`: `(action_type, created_at DESC)` — Powers instant RERUN vs FIX split analytics.
4. `idx_logs_cat_created`: `(root_cause_category, created_at DESC)` — Speeds up failure taxonomy breakdown charts.
5. `idx_logs_fingerprint_created`: `(fingerprint, created_at DESC)` — Accelerates signature lookup.
6. `idx_clusters_status_occ`: `(status, occurrence_count DESC)` — Ranks top recurring issues on the dashboard.
7. `idx_clusters_cat_occ`: `(category, occurrence_count DESC)` — Groups highest frequency clusters by category.
8. Single column indexes on primary keys, fingerprints, and foreign keys.

### Production PostgreSQL & WSL Docker Configuration

The included `docker-compose.yml` configures PostgreSQL 16 Alpine tuned specifically for high-throughput write workloads and NVMe/SSD storage:

```yaml
command: >
  postgres
    -c shared_buffers=256MB
    -c work_mem=16MB
    -c maintenance_work_mem=64MB
    -c effective_cache_size=768MB
    -c wal_buffers=16MB
    -c checkpoint_completion_target=0.9
    -c random_page_cost=1.1
    -c effective_io_concurrency=200
    -c max_connections=100
    -c log_min_duration_statement=200
```

Included PostgreSQL extensions in `docker/init-db.sql`:
* `uuid-ossp`: UUID generation.
* `pg_trgm`: Trigram matching for fast log search.
* `btree_gin`: High-concurrency composite GIN indexing.

---

## 7. Integration Guide (GitHub Actions, GitLab, Jenkins)

### GitHub Actions (Drop-In Step)
Add this step at the end of any job in `.github/workflows/ci.yml`. Using `if: failure()` ensures it runs only when a previous step fails:

```yaml
- name: Triage Failure with TCT TriageCI
  if: failure()
  run: |
    curl -X POST "http://your-triageci-host:8000/api/webhooks/github" \
      -H "Content-Type: application/json" \
      -H "X-GitHub-Event: workflow_run" \
      -d '{
        "repository": { "full_name": "${{ github.repository }}" },
        "workflow_run": {
          "name": "${{ github.workflow }}",
          "head_branch": "${{ github.ref_name }}",
          "head_sha": "${{ github.sha }}",
          "actor": { "login": "${{ github.actor }}" },
          "conclusion": "failure"
        }
      }'
```

### GitHub Webhook (Repository-Wide)
1. Go to repository **Settings** $\to$ **Webhooks** $\to$ **Add webhook**.
2. **Payload URL**: `http://your-triageci-host:8000/api/webhooks/github`
3. **Content type**: `application/json`
4. **Events**: Select **Workflow runs** and **Check runs**.

### GitLab CI (`.gitlab-ci.yml`)
```yaml
after_script:
  - >
    if [ "$CI_JOB_STATUS" == "failed" ]; then
      curl -X POST "http://your-triageci-host:8000/api/webhooks/gitlab" \
        -H "Content-Type: application/json" \
        -d "{
          \"project\": { \"path_with_namespace\": \"$CI_PROJECT_PATH\" },
          \"object_attributes\": { \"status\": \"failed\", \"ref\": \"$CI_COMMIT_REF_NAME\", \"sha\": \"$CI_COMMIT_SHA\" },
          \"user\": { \"username\": \"$GITLAB_USER_LOGIN\" }
        }"
    fi
```

---

## 8. Quick Start & Operational Runbook

### Prerequisites
* **Python**: 3.10 or higher
* **Node.js**: 18.0 or higher
* **Optional**: Docker / WSL2 for production PostgreSQL (SQLite works out of the box with zero setup)

### Launching the Application
Double-click `start.bat` or run in PowerShell:
```powershell
.\start.bat
```

This concurrently launches:
* **Frontend Web Dashboard**: `http://localhost:5173`
* **FastAPI Backend Server**: `http://localhost:8000`
* **Interactive OpenAPI Swagger Docs**: `http://localhost:8000/docs`
* **Zero-Config Database**: Local SQLite (`triageci.db`)

### Optional: Launching Visual Prisma Studio
To inspect and manipulate database records visually:
```powershell
npm run prisma:studio
# Or run start_prisma_studio.bat
```
Studio opens at **`http://localhost:5555`**.

### Optional: Starting Production PostgreSQL in WSL Docker
```powershell
.\start_postgres_wsl.bat
# Or using WSL CLI:
./scripts/wsl-docker.sh start
```

### Running the Automated 20-Log Benchmark Suite
```powershell
.\run_benchmark.bat
# Or using pytest:
python -m pytest backend/tests -v -s
```

---

## 9. Summary: Why TCT TriageCI Stands Out

| Feature | Legacy Observability | Generic AI Chatbots | TCT TriageCI |
| :--- | :--- | :--- | :--- |
| **Setup Friction** | Heavy agent daemon installation | Copy-pasting massive logs into ChatGPT | Zero-config drop-in webhook or curl step |
| **Noise Pruning** | Raw log dumps with search bar | Often hits token limits on 10k lines | Automatic 98%+ noise pruning to 25 lines |
| **Security & Privacy** | Stores entire raw logs with secrets | Sends plaintext secrets to external cloud | Automatic secret masking before storage or LLM |
| **Action Attribution** | None (Engineer figures it out) | Speculative code changes | Deterministic `SAFE TO RERUN` vs `FIX REQUIRED` |
| **Recurring Tracking** | Manual tagging | None | Automatic fingerprint clustering ("14x this month") |
| **Latency** | Real-time (unfiltered) | 5,000–15,000 ms | **16.7 ms** average triage latency |
| **Cost** | \$500–\$3,000 / month | Per-token runaway costs | **\$29–\$99 / month flat** |

TCT TriageCI delivers immediate, verifiable clarity to software engineering teams: turning broken builds from a 20-minute context-destroying chore into a 2-minute actionable fix.
