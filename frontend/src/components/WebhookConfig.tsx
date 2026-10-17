import React, { useState } from 'react';
import { Webhook, Copy, Check, Send, CheckCircle2, ShieldCheck, Terminal, GitBranch } from 'lucide-react';

export const WebhookConfig: React.FC = () => {
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedYaml, setCopiedYaml] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testResponse, setTestResponse] = useState<any>(null);

  const webhookUrl = `${window.location.origin}/api/webhooks/github`;

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

      # 🔴 TriageCI Ingestion on Failure
      - name: Triage Failure with TriageCI
        if: failure()
        run: |
          curl -X POST "${webhookUrl}" \\
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

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleCopyYaml = () => {
    navigator.clipboard.writeText(githubActionsYaml);
    setCopiedYaml(true);
    setTimeout(() => setCopiedYaml(false), 2000);
  };

  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    setTestResponse(null);
    try {
      const res = await fetch('/api/webhooks/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repository: { full_name: 'acme-corp/test-webhook-repo' },
          workflow_run: {
            name: 'Production Deploy',
            head_branch: 'staging',
            head_sha: 'd41d8cd98f00b204e9800998ecf8427e',
            actor: { login: 'alex.dev' },
            conclusion: 'failure'
          }
        })
      });
      const data = await res.json();
      setTestResponse(data);
    } catch (err: any) {
      setTestResponse({ error: err.message || 'Webhook failed' });
    } finally {
      setTestingWebhook(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center space-x-2 text-rose-400 font-bold text-xs uppercase tracking-wider mb-1">
          <Webhook className="w-4 h-4" />
          <span>CI Provider Integration</span>
        </div>
        <h2 className="text-xl font-bold text-white">
          Connect GitHub Actions, GitLab CI, or Jenkins
        </h2>
        <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
          TriageCI operates strictly as a <strong>read-only diagnostic layer</strong>. It does not touch deployment state, execute builds, or modify CI definitions. Whenever a pipeline fails, the webhook triggers immediate noise pruning and root cause attribution.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Webhook URL & Test */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <span>Webhook Endpoint</span>
          </h3>

          <div className="space-y-2">
            <label className="text-xs text-slate-400">Target Webhook URL</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 select-all"
              />
              <button
                onClick={handleCopyWebhook}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 flex items-center space-x-1"
              >
                {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedWebhook ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-300">
            <span className="font-bold text-white block">GitHub Webhook Setup:</span>
            <ol className="list-decimal list-inside space-y-1 text-slate-400">
              <li>In your GitHub repo, go to <strong>Settings → Webhooks → Add webhook</strong>.</li>
              <li>Paste the Payload URL above.</li>
              <li>Select content type: <code>application/json</code>.</li>
              <li>Select individual events: <strong>Workflow runs</strong> and <strong>Check runs</strong>.</li>
            </ol>
          </div>

          <div className="pt-2">
            <button
              onClick={handleTestWebhook}
              disabled={testingWebhook}
              className="flex items-center space-x-2 bg-rose-500 hover:bg-rose-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {testingWebhook ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending Test Webhook Event...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Test Webhook Event</span>
                </>
              )}
            </button>
          </div>

          {testResponse && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono space-y-2 animate-fade-in">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Webhook Ingestion & Attribution Verified:</span>
              </div>
              <pre className="text-slate-300 overflow-x-auto text-[11px] leading-relaxed">
                {JSON.stringify(testResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Right: Drop-in GitHub Actions YAML */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-rose-400" />
              <span>Or Drop-in GitHub Actions Step</span>
            </h3>
            <button
              onClick={handleCopyYaml}
              className="flex items-center space-x-1 text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              {copiedYaml ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedYaml ? 'Copied YAML' : 'Copy YAML'}</span>
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Add this step with <code>if: failure()</code> to your existing workflow. It triggers only when a prior step in the pipeline fails.
          </p>

          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 overflow-x-auto max-h-96 font-mono text-xs text-slate-300 leading-relaxed scrollbar-thin">
            <pre>{githubActionsYaml}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};
