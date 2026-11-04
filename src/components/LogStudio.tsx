'use client';

import { useState } from 'react';
import { 
  Play, 
  Terminal, 
  UploadCloud, 
  FileText, 
  AlertCircle, 
  RefreshCw,
  Copy,
  Wrench,
  Zap,
  FolderGit2,
  FileCode,
  ShieldCheck,
  ClipboardPaste,
  Trash2,
  Check,
  Share2
} from 'lucide-react';
import { submitTriageLog } from '../api';
import type { TriageResult } from '../types';
import { LogViewer } from './LogViewer';
import { PrCommentModal } from './PrCommentModal';
import { RemediationPlaybook } from './RemediationPlaybook';
import { NotificationModal } from './NotificationModal';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const PRESET_SAMPLES = [
  {
    name: 'AWS STS Session Expired',
    tag: 'Auth & Secrets',
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
    tag: 'Dependencies',
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
    name: 'Jest Flaky Concurrency',
    tag: 'Flaky & Timeout',
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
    name: 'Gradle JVM OutOfMemory',
    tag: 'Resource / OOM',
    category: 'RESOURCE_LIMIT',
    repo: 'acme-corp/search-indexer',
    step: './gradlew test',
    log: `2026-10-17T10:00:00.000Z ##[group]Run ./gradlew test
2026-10-17T10:00:45.000Z > Task :test
2026-10-17T10:01:20.000Z java.lang.OutOfMemoryError: Java heap space
2026-10-17T10:01:21.000Z 	at java.base/java.util.Arrays.copyOf(Arrays.java:3512)
2026-10-17T10:01:23.000Z > Task :test FAILED
2026-10-17T10:01:27.000Z ##[error]Process completed with exit code 1.`
  },
  {
    name: 'Docker Context Missing File',
    tag: 'Infra & Runner',
    category: 'INFRA_ENVIRONMENT',
    repo: 'acme-corp/worker-service',
    step: 'docker build',
    log: `2026-10-17T13:20:00.000Z Step 1/8 : FROM node:20-alpine
2026-10-17T13:20:05.000Z Step 2/8 : WORKDIR /app
2026-10-17T13:20:10.000Z Step 3/8 : COPY package*.json ./
2026-10-17T13:20:12.000Z Step 4/8 : COPY dist/index.js ./dist/
2026-10-17T13:20:12.500Z COPY failed: file not found in build context or excluded by .dockerignore: stat dist/index.js: file does not exist
2026-10-17T13:20:13.000Z ##[error]Process completed with exit code 1.`
  },
  {
    name: 'Go Data Race Condition',
    tag: 'Concurrency Race',
    category: 'FLAKY_CONCURRENCY',
    repo: 'acme-corp/payment-router',
    step: 'go test -race',
    log: `=== RUN   TestConcurrentBalanceUpdate
==================
WARNING: DATA RACE
Write at 0x00c00010c040 by goroutine 8:
  acme/router.(*Account).Deposit()
      /home/runner/work/router/account.go:42 +0x64
Previous read at 0x00c00010c040 by goroutine 7:
  acme/router.(*Account).Balance()
      /home/runner/work/router/account.go:50 +0x38
==================
--- FAIL: TestConcurrentBalanceUpdate (0.12s)
FAIL
exit status 66`
  },
  {
    name: 'Rust Borrow Checker (E0382)',
    tag: 'Compilation',
    category: 'COMPILATION_LINT',
    repo: 'acme-corp/crypto-engine',
    step: 'cargo test',
    log: `$ cargo test
error[E0382]: use of moved value: \`db_conn\`
  --> src/main.rs:24:12
   |
22 |     let db_conn = init_pool()?;
   |         ------- move occurs because \`db_conn\` has type \`DbPool\`, which does not implement the \`Copy\` trait
23 |     let worker = Worker::new(db_conn);
   |                              ------- value moved here
24 |     db_conn.ping();
   |     ^^^^^^^ value used here after move
error: could not compile \`crypto-engine\` due to previous error
Command failed with exit code 101`
  },
  {
    name: 'Python Pip Resolution Impossible',
    tag: 'Pip Dependencies',
    category: 'DEPENDENCY',
    repo: 'acme-corp/analytics-api',
    step: 'pip install -r requirements.txt',
    log: `2026-10-17T15:00:00.000Z ##[group]Run pip install -r requirements.txt
Collecting urllib3<2.0,>=1.26
  Downloading urllib3-1.26.18-py2.py3-none-any.whl (143 kB)
INFO: pip is looking at multiple versions of botocore to determine which version is compatible with other requirements.
ERROR: Cannot install -r requirements.txt because these package versions have conflicting dependencies.
pip._vendor.resolvelib.resolvers.ResolutionImpossible: for package urllib3:
    botocore 1.34.0 depends on urllib3<1.27,>=1.25.4
    elastic-transport 8.12.0 depends on urllib3<3,>=1.26.2
    requests 2.31.0 depends on urllib3<3,>=1.21.1
##[error]Process completed with exit code 1.`
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
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [copiedAction, setCopiedAction] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileDetails, setFileDetails] = useState<{ name: string; sizeKb: number; lines: number } | null>(null);

  const handleSelectSample = (sample: typeof PRESET_SAMPLES[0], idx: number) => {
    setSelectedPresetIndex(idx);
    setRawLog(sample.log);
    setRepoName(sample.repo);
    setJobName(sample.step);
    setResult(null);
    setError(null);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawLog(content);
        setResult(null);
        setSelectedPresetIndex(-1);
        setFileDetails({
          name: file.name,
          sizeKb: Math.round(file.size / 1024),
          lines: content.split('\n').length
        });
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRawLog(text);
        setResult(null);
        setSelectedPresetIndex(-1);
      }
    } catch {
      // Fallback
    }
  };

  const handleClearLog = () => {
    setRawLog('');
    setResult(null);
    setSelectedPresetIndex(-1);
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

  const handleCopySuggestedAction = () => {
    if (!result?.suggested_direction) return;
    navigator.clipboard.writeText(result.suggested_direction);
    setCopiedAction(true);
    setTimeout(() => setCopiedAction(false), 2000);
  };

  const lineCount = rawLog ? rawLog.split('\n').length : 0;

  return (
    <div className="space-y-5">
      {/* Studio Header Card */}
      <Card className="p-4 space-y-3.5 border-border/80 bg-card/80 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-md bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <Terminal className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-sm font-bold text-foreground font-mono">
                Interactive Triage Studio
              </h2>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono">
                Instant Attribution
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Paste console output from any failed CI run, pick a quick real-world scenario, or upload raw logs.
              TCT TriageCI scrubs ANSI formatting, masks tokens, extracts the high-signal failure window, and delivers actionable attribution.
            </p>
          </div>

          <div className="flex items-center space-x-1.5 text-xs font-mono text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 inline" />
            <span>Automatic Secret Redaction Active</span>
          </div>
        </div>

        {/* Quick Sample Presets */}
        <div className="pt-3 border-t border-border/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2 font-mono">
            Load Real-World Failure Scenario:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {PRESET_SAMPLES.map((sample, i) => {
              const isSelected = selectedPresetIndex === i;
              return (
                <div
                  key={i}
                  onClick={() => handleSelectSample(sample, i)}
                  className={`flex flex-col text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary/10 border-primary text-foreground shadow-xs'
                      : 'bg-muted/30 border-border/70 hover:border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <Badge variant="outline" className="text-[9px] font-mono py-0 px-1 border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10">
                      {sample.tag}
                    </Badge>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />}
                  </div>
                  <span className="text-xs font-semibold truncate text-foreground">{sample.name}</span>
                  <span className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">{sample.repo}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Main Studio Console Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Terminal Console Editor (8 cols) */}
        <div className="lg:col-span-8 space-y-2.5">
          <Card className="overflow-hidden border-border/80 bg-card/90 shadow-xs">
            {/* Terminal Top Control Bar */}
            <div className="bg-muted/40 px-3.5 py-2 border-b border-border/70 flex flex-wrap items-center justify-between gap-2.5">
              {/* Window Controls & File Tab */}
              <div className="flex items-center space-x-2.5">
                <div className="flex space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <div className="h-3.5 w-px bg-border" />
                <span className="text-xs font-mono font-medium text-foreground flex items-center space-x-1.5">
                  <FileCode className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>ci-runner-console.log</span>
                </span>
                <Badge variant="outline" className="text-[10px] font-mono h-4 px-1.5 text-muted-foreground">
                  {lineCount.toLocaleString()} lines
                </Badge>
              </div>

              {/* Editor Actions */}
              <div className="flex items-center space-x-1.5">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={handlePasteClipboard}
                  className="gap-1 font-mono text-[11px] h-6"
                  title="Paste from clipboard"
                >
                  <ClipboardPaste className="w-3 h-3" />
                  <span>Paste</span>
                </Button>

                <Button
                  variant="outline"
                  size="xs"
                  className="gap-1 font-mono text-[11px] h-6 cursor-pointer relative"
                  title="Upload log file"
                >
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <UploadCloud className="w-3 h-3" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept=".log,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </Button>

                {rawLog && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={handleClearLog}
                    className="h-6 w-6 text-muted-foreground hover:text-rose-500"
                    title="Clear editor"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Editor Textarea with Drag-and-Drop */}
            <div 
              className={`p-3 bg-background/90 relative transition-colors ${
                isDragging ? 'bg-primary/10 border-2 border-dashed border-primary' : ''
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDropFile}
            >
              {isDragging && (
                <div className="absolute inset-0 bg-background/90 backdrop-blur-xs flex flex-col items-center justify-center space-y-2 z-10 pointer-events-none">
                  <UploadCloud className="w-8 h-8 text-primary animate-bounce" />
                  <span className="text-sm font-semibold font-mono text-foreground">
                    Drop CI Log file (.log, .txt) here to analyze
                  </span>
                </div>
              )}

              {fileDetails && (
                <div className="mb-2 flex items-center justify-between bg-muted/40 px-2.5 py-1 rounded text-[11px] font-mono text-muted-foreground border border-border">
                  <span className="flex items-center space-x-1.5">
                    <FileText className="w-3 h-3 text-primary" />
                    <span className="font-medium text-foreground">{fileDetails.name}</span>
                    <span>({fileDetails.sizeKb} KB • {fileDetails.lines.toLocaleString()} lines)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setFileDetails(null)}
                    className="hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>
              )}

              <Textarea
                value={rawLog}
                onChange={(e) => {
                  setRawLog(e.target.value);
                  setSelectedPresetIndex(-1);
                }}
                placeholder="Paste raw CI console logs or drag & drop .log file here (can be thousands of lines)..."
                rows={16}
                className="w-full bg-transparent border-0 font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-0 shadow-none leading-relaxed resize-y selection:bg-rose-500/25 min-h-[320px] p-0"
              />
            </div>

            {/* Terminal Status Footer */}
            <div className="bg-muted/30 px-3.5 py-1.5 border-t border-border/70 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 inline-block" />
                <span>Ready to ingest GitHub Actions, GitLab CI, or Jenkins console</span>
              </span>
              <span>Tokens, IAM ARNs & API Keys automatically masked</span>
            </div>
          </Card>
        </div>

        {/* Right: Metadata & Action Trigger (4 cols) */}
        <div className="lg:col-span-4 space-y-3.5">
          <Card className="p-4 space-y-3.5 border-border/80 bg-card/80 shadow-2xs">
            <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center space-x-1.5 font-mono">
                <FolderGit2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Pipeline Context</span>
              </h3>
              <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono h-4 px-1.5">
                Optional
              </Badge>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-muted-foreground text-[11px] font-medium mb-1 block font-mono">Repository Name</label>
                <Input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="org/repository-name"
                  className="font-mono text-xs h-8"
                />
              </div>

              <div>
                <label className="text-muted-foreground text-[11px] font-medium mb-1 block font-mono">Branch</label>
                <Input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main or staging"
                  className="font-mono text-xs h-8"
                />
              </div>

              <div>
                <label className="text-muted-foreground text-[11px] font-medium mb-1 block font-mono">Failing Step / Job</label>
                <Input
                  type="text"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  placeholder="e.g. Deploy to ECS or npm test"
                  className="font-mono text-xs h-8"
                />
              </div>
            </div>

            <div className="pt-1.5">
              <Button
                onClick={handleRunTriage}
                disabled={analyzing}
                className="w-full h-8.5 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider font-mono gap-2 shadow-xs cursor-pointer"
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Log & Fingerprint...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Analyze & Triage Failure</span>
                  </>
                )}
              </Button>
            </div>

            <div className="bg-muted/30 p-2.5 rounded-md border border-border/70 space-y-1 text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground block font-mono">How Triage Works:</span>
              <p className="leading-relaxed">
                Logs are normalized, exit codes and stacktrace anchors detected, high-noise lines pruned, and mapped against verified attribution patterns.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center space-x-2 font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Diagnostic Dossier Result Output */}
      {result && (
        <Card className="p-5 space-y-4 animate-fade-in shadow-xl border-border/80 bg-card/90">
          {/* Header Banner: Verdict & Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border/70 pb-3.5">
            <div className="flex items-center space-x-2.5 flex-wrap gap-y-1.5">
              {result.action_type === 'RERUN' ? (
                <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-mono font-bold text-xs gap-1.5 px-2.5 py-1">
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>RECOMMENDATION: SAFE TO RERUN</span>
                </Badge>
              ) : (
                <Badge variant="outline" className="border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-400 font-mono font-bold text-xs gap-1.5 px-2.5 py-1">
                  <Wrench className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>RECOMMENDATION: CODE FIX REQUIRED</span>
                </Badge>
              )}

              <Badge variant="outline" className="text-xs font-mono font-medium text-foreground py-0.5">
                {result.root_cause_category}
              </Badge>

              <Badge variant="outline" className="text-xs font-mono text-muted-foreground py-0.5">
                {Math.round(result.confidence_score * 100)}% confidence
              </Badge>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="xs"
                onClick={() => setIsNotificationModalOpen(true)}
                className="gap-1.5 text-xs font-mono h-7 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Dispatch Alert (Slack/Discord)</span>
              </Button>

              <Button
                variant="outline"
                size="xs"
                onClick={() => setIsPrModalOpen(true)}
                className="gap-1.5 text-xs font-mono h-7 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View PR Comment Markdown</span>
              </Button>
            </div>
          </div>

          {/* Root cause and Suggested next step (Side by side partitioned) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            {/* Root cause */}
            <div className="md:col-span-7 bg-muted/20 p-3 rounded-lg border border-border/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
                  Root Cause Diagnostic
                </span>
                <Badge variant="outline" className="text-[10px] font-mono text-rose-700 dark:text-rose-300 border-rose-500/20 bg-rose-500/10 py-0 px-1.5">
                  Step: {result.exact_failing_step}
                </Badge>
              </div>
              <p className="text-xs text-foreground font-medium leading-relaxed font-sans">
                {result.root_cause_summary}
              </p>
            </div>

            {/* Next step direction */}
            <div className="md:col-span-5 bg-gradient-to-br from-amber-500/10 via-card to-background p-3 rounded-lg border border-amber-500/30 flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center space-x-1 font-mono">
                  <Zap className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>Action Plan Directive</span>
                </span>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={handleCopySuggestedAction}
                  className="h-5 text-[10px] font-mono gap-1 px-1.5"
                >
                  {copiedAction ? (
                    <>
                      <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-2.5 h-2.5" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-amber-950 dark:text-amber-200/90 font-mono leading-relaxed bg-background/85 p-2 rounded border border-amber-500/25">
                {result.suggested_direction}
              </p>
            </div>
          </div>

          {/* One-Click Remediation Playbook (Exact CLI commands & diffs) */}
          <RemediationPlaybook
            commands={result.remediation_commands}
            patchDiff={result.remediation_patch}
            actionType={result.action_type}
            failingStep={result.exact_failing_step}
            defaultOpen={true}
          />

          {/* High Signal Window with LogViewer */}
          <div className="space-y-1.5">
            <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider font-mono">
              Extracted Evidence Window ({result.reduction_percentage}% Noise Pruned)
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

          <NotificationModal
            isOpen={isNotificationModalOpen}
            onClose={() => setIsNotificationModalOpen(false)}
            result={result}
          />
        </Card>
      )}
    </div>
  );
};

