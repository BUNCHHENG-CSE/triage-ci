from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.models.database import init_db, SessionLocal
from app.models.schema import FailureCluster, FailureLog
from app.api.triage import router as triage_router
from app.api.clusters import router as clusters_router
from app.api.benchmark import router as benchmark_router
from app.api.webhooks import router as webhooks_router
from app.api.stats import router as stats_router
from app.data.benchmark_data import BENCHMARK_CASES
from app.core.triage_engine import triage_engine
from app.models.schema import TriageRequest

def seed_initial_demo_data():
    """
    Seeds initial realistic recurring clusters and sample failures so the
    dashboard shows rich data immediately (including the 14-failure expired credential case!).
    """
    db = SessionLocal()
    try:
        # Check if demo data already seeded
        if db.query(FailureCluster).filter(FailureCluster.fingerprint == "cred_aws_sts:cred_aws_sts_expired:generic").first():
            return

        # Seed recurring failure cluster 1: "this same expired credential has caused 14 failures this month"
        cred_cluster = FailureCluster(
            fingerprint="cred_aws_sts:cred_aws_sts_expired:generic",
            title="AWS STS Session Token Expired",
            category="CREDENTIALS_AUTH",
            suggested_action_type="FIX",
            suggested_direction="Rotate or re-authenticate AWS credentials. In GitHub Actions, ensure 'aws-actions/configure-aws-credentials' uses a fresh role session.",
            occurrence_count=14,
            status="ACTIVE",
            affected_repos=["acme-corp/payment-service", "acme-corp/billing-worker", "acme-corp/user-api"]
        )
        db.add(cred_cluster)

        # Seed recurring cluster 2: Jest Async Timeout Flaky test
        flaky_cluster = FailureCluster(
            fingerprint="flk_jest_timeout:flk_jest_async_timeout:5000",
            title="Jest Asynchronous Callback Timeout (Flaky)",
            category="FLAKY_CONCURRENCY",
            suggested_action_type="RERUN",
            suggested_direction="Safe to rerun pipeline. Increase jest.setTimeout or mock external network dependencies.",
            occurrence_count=8,
            status="ACTIVE",
            affected_repos=["acme-corp/frontend-app"]
        )
        db.add(flaky_cluster)

        # Seed recurring cluster 3: NPM ERESOLVE React 19 Peer Dependency
        dep_cluster = FailureCluster(
            fingerprint="dep_npm_eresolve:dep_npm_eresolve:generic",
            title="NPM Peer Dependency Conflict (ERESOLVE)",
            category="DEPENDENCY",
            suggested_action_type="FIX",
            suggested_direction="Align peer dependency versions in package.json or use `npm install --legacy-peer-deps`.",
            occurrence_count=5,
            status="ACTIVE",
            affected_repos=["acme-corp/admin-portal", "acme-corp/checkout-ui"]
        )
        db.add(dep_cluster)

        # Seed recurring cluster 4: Out of Memory Exit 137
        oom_cluster = FailureCluster(
            fingerprint="res_oom_137:res_oom_exit_137:generic",
            title="Process Killed by Linux OOM Killer (Exit 137)",
            category="RESOURCE_LIMIT",
            suggested_action_type="FIX",
            suggested_direction="Increase runner memory allocation or set `--maxWorkers=2` in test runner.",
            occurrence_count=4,
            status="ACTIVE",
            affected_repos=["acme-corp/e2e-cypress"]
        )
        db.add(oom_cluster)

        db.commit()

        # Seed sample FailureLog records associated with these clusters
        log1 = FailureLog(
            provider="github_actions",
            repo_name="acme-corp/payment-service",
            branch="staging",
            commit_sha="c9f8a12",
            commit_author="sarah.chen@acme.com",
            pr_number=142,
            workflow_name="Deploy to Staging",
            job_name="deploy-ecs",
            exact_failing_step="Deploy to AWS ECS Staging",
            root_cause_category="CREDENTIALS_AUTH",
            root_cause_summary="AWS temporary security credentials or STS session token expired during pipeline execution.",
            action_type="FIX",
            suggested_direction="Rotate or re-authenticate AWS credentials in GitHub Secrets (AWS_SECRET_ACCESS_KEY).",
            confidence_score=0.98,
            fingerprint="cred_aws_sts:cred_aws_sts_expired:generic",
            extracted_excerpt="[  7] > aws ecs update-service --cluster staging-cluster --service payment-api\n[  8] An error occurred (ExpiredTokenException) when calling the UpdateService operation: The security token included in the request is expired\n[  9] ##[error]Process completed with exit code 254.",
            total_raw_lines=4200,
            pr_comment_markdown="### 🔴 CI/CD Failure Triage Report: `deploy-ecs`\n🛠️ **RECOMMENDATION: CODE/CONFIG FIX REQUIRED**\n> ⚠️ **Recurring Issue Detected:** This same root cause has caused **14 failures** across the repository.\n...",
            cluster_id=cred_cluster.id
        )
        db.add(log1)

        log2 = FailureLog(
            provider="github_actions",
            repo_name="acme-corp/frontend-app",
            branch="feat/checkout-redesign",
            commit_sha="8e104bc",
            commit_author="marcus.v@acme.com",
            pr_number=88,
            workflow_name="CI / Unit & Integration Tests",
            job_name="test-web",
            exact_failing_step="npm test",
            root_cause_category="FLAKY_CONCURRENCY",
            root_cause_summary="Test timed out waiting for an asynchronous callback in stripe-webhook.test.ts.",
            action_type="RERUN",
            suggested_direction="Safe to RERUN the pipeline. This is an asynchronous mock latency blip.",
            confidence_score=0.94,
            fingerprint="flk_jest_timeout:flk_jest_async_timeout:5000",
            extracted_excerpt="[ 42] FAIL src/payments/stripe-webhook.test.ts\n[ 43]   Timeout - Async callback was not invoked within the 5000 ms timeout specified by jest.setTimeout.\n[ 44] ##[error]Process completed with exit code 1.",
            total_raw_lines=2850,
            pr_comment_markdown="### 🔴 CI/CD Failure Triage Report: `test-web`\n🔄 **RECOMMENDATION: SAFE TO RERUN**\n...",
            cluster_id=flaky_cluster.id
        )
        db.add(log2)

        log3 = FailureLog(
            provider="github_actions",
            repo_name="acme-corp/admin-portal",
            branch="fix/grid-bump",
            commit_sha="1122ab3",
            commit_author="alex.t@acme.com",
            pr_number=310,
            workflow_name="Node CI",
            job_name="build",
            exact_failing_step="npm install",
            root_cause_category="DEPENDENCY",
            root_cause_summary="NPM package dependency conflict: conflicting peer dependency requirements for react@19.0.0.",
            action_type="FIX",
            suggested_direction="Align peer dependencies or install with --legacy-peer-deps.",
            confidence_score=0.98,
            fingerprint="dep_npm_eresolve:dep_npm_eresolve:generic",
            extracted_excerpt="[ 15] npm ERR! code ERESOLVE\n[ 16] npm ERR! ERESOLVE unable to resolve dependency tree\n[ 17] npm ERR! Could not resolve dependency: peer react@\"^18.0.0\"\n[ 18] ##[error]Process completed with exit code 1.",
            total_raw_lines=1840,
            pr_comment_markdown="### 🔴 CI/CD Failure Triage Report: `build`\n🛠️ **RECOMMENDATION: CODE/CONFIG FIX REQUIRED**\n...",
            cluster_id=dep_cluster.id
        )
        db.add(log3)

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error seeding demo data: {e}")
    finally:
        db.close()


init_db()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database and seed initial demo data
    init_db()
    seed_initial_demo_data()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Intelligent, lightweight CI/CD failure attribution and triage layer for engineering teams.",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(triage_router)
app.include_router(clusters_router)
app.include_router(benchmark_router)
app.include_router(webhooks_router)
app.include_router(stats_router)

@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
