import React, { useState } from 'react';
import { 
  Play, 
  Terminal, 
  UploadCloud, 
  FileText, 
  Sparkles, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw,
  Copy,
  Layers,
  Wrench,
  Zap
} from 'lucide-react';
import { submitTriageLog } from '../api';
import type { TriageResult } from '../types';
import { LogViewer } from './LogViewer';
import { PrCommentModal } from './PrCommentModal';

const PRESET_SAMPLES = [
  {
    name: 'AWS STS Session Expired',
    category: 'CREDENTIALS_AUTH',
    repo: 'acme-corp/billing-service',
    step: 'Deploy to ECS',
    log: `2026-10-17T08:01:05.123Z ##[group]Run aws-actions/configure-aws-credentials@v4
2026-10-17T08:01:09.111Z Assuming role arn:aws:iam::123456789012:role/DeployRole
2026-10-17T08:01:10.222Z ##[endgroup]
2026-10-17T08:01:11.333Z ##[group]Run Deploy to AWS ECS Staging
2026-10-17T08:01:12.444Z > aws ecs update-service --cluster staging --service billing-api --force-new-deployment
2026-10-17T08:01:15.555Z An error occurred (ExpiredTokenException) when calling the UpdateService operation: The security token included in the request is expired
2026-10-17T08:01:16.666Z ##[error]Process completed with exit code 254.`
  },
  {
    name: 'NPM ERESOLVE Conflict',
    category: 'DEPENDENCY',
    repo: 'acme-corp/frontend-app',
    step: 'npm install',
    log: `2026-10-17T09:12:00.100Z ##[group]Run npm install
2026-10-17T09:12:05.500Z npm ERR! code ERESOLVE
2026-10-17T09:12:05.501Z npm ERR! ERESOLVE unable to resolve dependency tree
2026-10-17T09:12:05.502Z npm ERR! While resolving: frontend-dashboard@1.0.0
2026-10-17T09:12:05.504Z npm ERR! Found: react@19.0.0
2026-10-17T09:12:05.508Z npm ERR! Could not resolve dependency:
2026-10-17T09:12:05.509Z npm ERR! peer react@"^18.0.0" from @legacy/table-grid@2.4.1
2026-10-17T09:12:06.600Z ##[error]Process completed with exit code 1.`
  },
  {
    name: 'Jest Flaky Timeout',
    category: 'FLAKY_CONCURRENCY',
    repo: 'acme-corp/api-gateway',
    step: 'npm test',
    log: `2026-10-17T11:00:01.000Z ##[group]Run npm test
2026-10-17T11:00:05.000Z PASS src/auth.test.ts
2026-10-17T11:00:12.000Z FAIL src/payments/stripe-webhook.test.ts
2026-10-17T11:00:12.100Z   ● Stripe Webhook › should process async invoice payload
2026-10-17T11:00:12.200Z     Timeout - Async callback was not invoked within the 5000 ms timeout specified by jest.setTimeout.
2026-10-17T11:00:15.000Z ##[error]Process completed with exit code 1.`
  },
  {
    name: 'Gradle JVM OOM',
    category: 'RESOURCE_LIMIT',
    repo: 'acme-corp/search-indexer',
    step: './gradlew test',
    log: `2026-10-17T10:00:00.000Z ##[group]Run ./gradlew test
2026-10-17T10:00:45.000Z > Task :test
2026-10-17T10:01:20.000Z java.lang.OutOfMemoryError: Java heap space
2026-10-17T10:01:21.000Z 	at java.base/java.util.Arrays.copyOf(Arrays.java:3512)
2026-10-17T10:01:23.000Z > Task :test FAILED
2026-10-17T10:01:27.000Z ##[error]Process completed with exit code 1.`
  }
];

interface LogStudioProps {
  onTriageCreated?: (result: TriageResult) => void;
}

export const LogStudio: React.FC<LogStudioProps> = ({ onTriageCreated }) => {
  const [rawLog, setRawLog] = useState(PRESET_SAMPLES[0].log);
  const [repoName, setRepoName] = useState('acme-corp/billing-service');
  const [branch, setBranch] = useState('main');
  const [jobName, setJobName] = useState('Deploy to ECS');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPrModalOpen, setIsPrModalOpen] = useState(false);

  const handleSelectSample = (sample: typeof PRESET_SAMPLES[0]) => {
    setRawLog(sample.log);
    setRepoName(sample.repo);
    setJobName(sample.step);
    setResult(null);
    setError(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawLog(content);
        setResult(null);
      }
    };
    reader.readAsText(file);
  };

  const handleRunTriage = async () => {
    if (!rawLog.trim()) {
      setError('Please paste or upload a CI failure log.');
      return;
    }
    setAnalyzing(true);
    setError(null);
    try {
      const triageRes = await submitTriageLog({
        raw_log: rawLog,
        repo_name: repoName,
        branch: branch,
        job_name: jobName,
        provider: 'github_actions'
      });
      setResult(triageRes);
      if (onTriageCreated) onTriageCreated(triageRes);
    } catch (err: any) {
      setError(err.message || 'Failed to triage log');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <Terminal className="w-5 h-5 text-rose-400" />
          <span>Interactive Triage Studio</span>
        </h2>
        <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
          Paste console output from any failed CI run, pick a quick real-world preset, or upload a log file.
          TriageCI will scrub ANSI formatting, redact secrets, extract the 15-30 line failure window, and output attribution.
        </p>

        {/* Quick Sample Presets */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold mr-1">Try preset:</span>
          {PRESET_SAMPLES.map((sample, i) => (
            <button
              key={i}
              onClick={() => handleSelectSample(sample)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center space-x-1.5"
            >
              <Sparkles className="w-3 h-3 text-rose-400" />
              <span>{sample.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Editor & Parameters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Log input (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Raw CI Console Output (GitHub Actions, GitLab, Jenkins)
              </label>

              {/* Upload file button */}
              <label className="flex items-center space-x-1.5 text-xs text-rose-400 hover:text-rose-300 cursor-pointer bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-500/20">
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload .log / .txt</span>
                <input
                  type="file"
                  accept=".log,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <textarea
              value={rawLog}
              onChange={(e) => setRawLog(e.target.value)}
              placeholder="Paste raw console logs here (can be thousands of lines)..."
              rows={14}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-rose-500 scrollbar-thin leading-relaxed"
            />

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Lines in log: {rawLog.split('\n').length.toLocaleString()}</span>
              <span>Automatic secret redaction applied</span>
            </div>
          </div>
        </div>

        {/* Right Column: Parameters and Trigger button (1 col) */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Pipeline Metadata (Optional)
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 mb-1 block">Repository Name</label>
                <input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Branch</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Failing Job / Step</label>
                <input
                  type="text"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <button
              onClick={handleRunTriage}
              disabled={analyzing}
              className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-rose-500/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {analyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Attributing Root Cause...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Analyze & Triage Failure</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 animate-fade-in shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              {result.action_type === 'RERUN' ? (
                <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>RECOMMENDATION: SAFE TO RERUN</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  <Wrench className="w-3.5 h-3.5" />
                  <span>RECOMMENDATION: FIX REQUIRED</span>
                </span>
              )}

              <span className="text-xs font-mono font-medium text-slate-300 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                {result.root_cause_category}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsPrModalOpen(true)}
                className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/25 hover:bg-rose-500/25 transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>PR Comment Markdown</span>
              </button>
            </div>
          </div>

          {/* Root cause and Suggested next step */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Root Cause Attribution
              </span>
              <p className="text-sm text-slate-200 font-medium leading-relaxed">
                {result.root_cause_summary}
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1">
                <Zap className="w-3.5 h-3.5" />
                <span>Suggested Fix Direction</span>
              </span>
              <p className="text-sm text-amber-200/90 font-mono">
                {result.suggested_direction}
              </p>
            </div>
          </div>

          {/* High Signal Window */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              High-Signal Log Excerpt (Noise Pruned by {result.reduction_percentage}%)
            </h4>
            <LogViewer
              excerptLines={result.excerpt_lines}
              extractedExcerptText={result.extracted_excerpt}
              totalRawLines={result.total_raw_lines}
              reductionPercentage={result.reduction_percentage}
              failingStep={result.exact_failing_step}
            />
          </div>

          <PrCommentModal
            isOpen={isPrModalOpen}
            onClose={() => setIsPrModalOpen(false)}
            markdown={result.pr_comment_markdown}
            jobName={result.job_name}
          />
        </div>
      )}
    </div>
  );
};
