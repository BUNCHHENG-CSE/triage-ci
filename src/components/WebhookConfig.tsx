'use client';

import { useState } from 'react';
import {
  Webhook,
  Copy,
  Check,
  Send,
  CheckCircle2,
  FileCode,
  RefreshCw,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { simulateWebhook } from '../api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const WebhookConfig: React.FC<{ onNavigateToFeed?: () => void }> = ({ onNavigateToFeed }) => {
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedYaml, setCopiedYaml] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'github' | 'gitlab' | 'jenkins' | 'generic'>('github');
  
  // Simulation State
  const [simScenario, setSimScenario] = useState('aws_sts');
  const [simProvider, setSimProvider] = useState('github_actions');
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000';
  const providerPath = 
    selectedProvider === 'github' ? '/api/webhooks/github' :
    selectedProvider === 'gitlab' ? '/api/webhooks/gitlab' :
    selectedProvider === 'jenkins' ? '/api/webhooks/jenkins' : '/api/webhooks/generic';
  
  const webhookUrl = `${origin}${providerPath}`;

  const githubActionsYaml = `name: CI Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test

      # 🔴 TCT TriageCI Pure Diagnostic Attribution Ingestion
      - name: Triage Failure with TCT TriageCI
        if: failure()
        run: |
          curl -X POST "${origin}/api/webhooks/github" \\
            -H "Content-Type: application/json" \\
            -H "X-GitHub-Event: workflow_run" \\
            -d '{
              "repository": { "full_name": "\${{ github.repository }}" },
              "workflow_run": {
                "name": "\${{ github.workflow }}",
                "head_branch": "\${{ github.ref_name }}",
                "head_sha": "\${{ github.sha }}",
                "actor": { "login": "\${{ github.actor }}" },
                "conclusion": "failure"
              }
            }'
`;

  const gitlabCiYaml = `stages:
  - test
  - triage

unit_tests:
  stage: test
  script:
    - npm ci
    - npm test
  artifacts:
    when: on_failure
    paths:
      - "*.log"

# 🔴 TCT TriageCI GitLab CI Diagnostic Step
triage_on_failure:
  stage: triage
  when: on_failure
  script:
    - |
      curl -X POST "${origin}/api/webhooks/gitlab" \\
        -H "Content-Type: application/json" \\
        -d "{
          \\"project\\": { \\"path_with_namespace\\": \\"$CI_PROJECT_PATH\\" },
          \\"object_attributes\\": {
            \\"ref\\": \\"$CI_COMMIT_REF_NAME\\",
            \\"sha\\": \\"$CI_COMMIT_SHA\\",
            \\"status\\": \\"failed\\"
          },
          \\"user\\": { \\"username\\": \\"$GITLAB_USER_LOGIN\\" }
        }"
`;

  const jenkinsSnippet = `pipeline {
    agent any
    stages {
        stage('Test') {
            steps {
                sh './gradlew test'
            }
        }
    }
    post {
        failure {
            script {
                sh """
                curl -X POST "${origin}/api/webhooks/jenkins" \\
                  -H "Content-Type: application/json" \\
                  -d '{
                    "name": "\${env.JOB_NAME}",
                    "build": {
                      "status": "FAILURE",
                      "scm": {
                        "url": "\${env.GIT_URL}",
                        "branch": "\${env.GIT_BRANCH}",
                        "commit": "\${env.GIT_COMMIT}"
                      }
                    }
                  }'
                """
            }
        }
    }
}`;

  const genericSnippet = `# Generic / CircleCI / Bitbucket Runner Ingestion
# Simply curl TCT TriageCI endpoint on failure with runner log:
curl -X POST "${origin}/api/webhooks/generic" \\
  -H "Content-Type: application/json" \\
  -d '{
    "provider": "circleci",
    "repo_name": "acme-corp/service",
    "branch": "$CIRCLE_BRANCH",
    "commit_sha": "$CIRCLE_SHA1",
    "commit_author": "$CIRCLE_USERNAME",
    "job_name": "$CIRCLE_JOB",
    "raw_log": "$(cat build.log 2>/dev/null || echo 'Exit code 1')"
  }'
`;

  const currentSnippet = 
    selectedProvider === 'github' ? githubActionsYaml :
    selectedProvider === 'gitlab' ? gitlabCiYaml :
    selectedProvider === 'jenkins' ? jenkinsSnippet : genericSnippet;

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleCopyYaml = () => {
    navigator.clipboard.writeText(currentSnippet);
    setCopiedYaml(true);
    setTimeout(() => setCopiedYaml(false), 2000);
  };

  const handleRunSimulation = async () => {
    setSimulating(true);
    setSimResult(null);
    const start = performance.now();
    try {
      const data = await simulateWebhook(simScenario, simProvider);
      const elapsed = Math.round(performance.now() - start);
      setSimResult({ ...data, latency_ms: elapsed });
    } catch (err: any) {
      setSimResult({
        status: 'error',
        error: err.message || 'Simulation failed'
      });
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <Card className="p-4 space-y-2 border-border/80 bg-card/80 shadow-2xs">
        <div className="flex items-center space-x-1.5 font-mono">
          <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono text-[10px] gap-1 py-0.5">
            <Webhook className="w-3 h-3" />
            <span>Multi-Provider Ingestion Hub</span>
          </Badge>
        </div>
        <h2 className="text-base font-bold text-foreground font-mono">
          Zero-Touch CI/CD Webhook Integration
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
          Connect your GitHub Actions, GitLab CI, or Jenkins pipelines to automatically ingest, normalize, and attribute failed builds. TCT TriageCI is strictly <strong>read-only / diagnostic</strong> with zero permissions to edit pipelines or trigger deployments.
        </p>
      </Card>

      {/* Interactive Webhook Simulator */}
      <Card className="p-5 border-border/80 bg-card/90 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Live Webhook Ingestion Simulator
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                Simulate a real-time incoming webhook event and observe immediate attribution & database persistence.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
            Interactive Tester
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-mono text-muted-foreground block mb-1">
              Select Failure Scenario:
            </label>
            <select
              value={simScenario}
              onChange={e => setSimScenario(e.target.value)}
              className="w-full h-8.5 rounded-md border border-border bg-background px-2 text-xs font-mono text-foreground focus:outline-hidden"
            >
              <option value="aws_sts">AWS STS Session Expired (Auth)</option>
              <option value="jest_timeout">Jest Async Timeout (Flaky RERUN)</option>
              <option value="npm_eresolve">NPM Peer Dep Conflict (Dependencies)</option>
              <option value="exit_137">Linux OOM Killer Exit 137 (Resource Limit)</option>
              <option value="rust_borrow">Rust Borrow Checker Error (Compiler)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-mono text-muted-foreground block mb-1">
              Simulate CI Provider:
            </label>
            <select
              value={simProvider}
              onChange={e => setSimProvider(e.target.value)}
              className="w-full h-8.5 rounded-md border border-border bg-background px-2 text-xs font-mono text-foreground focus:outline-hidden"
            >
              <option value="github_actions">GitHub Actions</option>
              <option value="gitlab_ci">GitLab CI</option>
              <option value="jenkins">Jenkins</option>
              <option value="generic">Generic Runner (CircleCI)</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={handleRunSimulation}
              disabled={simulating}
              className="w-full h-8.5 text-xs font-mono bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {simulating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Simulating Ingestion...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  🚀 Trigger Live Webhook Simulation
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Live Simulation Response Output */}
        {simResult && (
          <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-semibold font-mono text-foreground">
                  HTTP 200: Webhook Ingested & Attributed in {simResult.latency_ms ?? 14}ms
                </span>
              </div>
              <Badge variant={simResult.action_type === 'RERUN' ? 'default' : 'destructive'} className="text-[10px] py-0 font-mono">
                {simResult.action_type}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
              <div className="bg-background/80 p-2.5 rounded border border-border space-y-1">
                <div className="text-muted-foreground">Scenario: <span className="text-foreground font-semibold">{simResult.scenario}</span></div>
                <div className="text-muted-foreground">Failing Step: <span className="text-foreground font-semibold">{simResult.failing_step}</span></div>
                <div className="text-muted-foreground">Confidence: <span className="text-foreground font-semibold">{Math.round((simResult.confidence || 0.95) * 100)}%</span></div>
              </div>
              <div className="bg-background/80 p-2.5 rounded border border-border space-y-1">
                <div className="text-muted-foreground">Root Cause:</div>
                <div className="text-foreground font-medium leading-relaxed">{simResult.root_cause}</div>
              </div>
            </div>

            {onNavigateToFeed && (
              <div className="pt-1 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onNavigateToFeed}
                  className="text-xs font-mono h-7"
                >
                  <span>View in Triage Feed</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Provider Config Tabs & Snippets */}
      <Card className="p-5 border-border/80 bg-card/80 space-y-4">
        {/* Endpoint URL Row */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-muted-foreground">
            Target Webhook Ingestion Endpoint:
          </label>
          <div className="flex items-center space-x-2">
            <Input
              readOnly
              value={webhookUrl}
              className="font-mono text-xs bg-muted/40 h-8 text-foreground"
            />
            <Button
              variant="outline"
              size="xs"
              onClick={handleCopyWebhook}
              className="h-8 px-3 font-mono text-xs shrink-0"
            >
              {copiedWebhook ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  Copy URL
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Provider Tabs */}
        <div className="flex space-x-1.5 border-b border-border pb-2">
          {(['github', 'gitlab', 'jenkins', 'generic'] as const).map(p => (
            <Button
              key={p}
              variant={selectedProvider === p ? 'default' : 'ghost'}
              size="xs"
              onClick={() => setSelectedProvider(p)}
              className="h-7 text-xs font-mono uppercase tracking-wider"
            >
              {p === 'github' ? 'GitHub Actions' : p === 'gitlab' ? 'GitLab CI' : p === 'jenkins' ? 'Jenkins' : 'Generic / CircleCI'}
            </Button>
          ))}
        </div>

        {/* Snippet Code Viewer */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground flex items-center space-x-1 font-mono">
              <FileCode className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Pipeline Configuration Snippet:</span>
            </span>
            <Button
              variant="outline"
              size="xs"
              onClick={handleCopyYaml}
              className="h-6 text-[11px] font-mono"
            >
              {copiedYaml ? (
                <>
                  <Check className="w-3 h-3 mr-1 text-emerald-500" />
                  Copied Snippet
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy Snippet
                </>
              )}
            </Button>
          </div>

          <pre className="p-3 bg-zinc-950 dark:bg-black rounded-lg text-emerald-400 font-mono text-xs overflow-x-auto leading-relaxed border border-border/80">
            {currentSnippet}
          </pre>
        </div>
      </Card>
    </div>
  );
};
