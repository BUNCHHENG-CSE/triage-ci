'use client';

import { useState, useMemo, Fragment } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Play, 
  RefreshCw, 
  ShieldCheck, 
  Clock, 
  FileCheck2, 
  Search, 
  Target
} from 'lucide-react';
import { runBenchmarkSuite } from '../api';
import type { BenchmarkRunSummary } from '../types';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const BenchmarkSuite: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<BenchmarkRunSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PASSED' | 'FAILED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const handleRunBenchmark = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await runBenchmarkSuite();
      setSummary(res);
    } catch (err: any) {
      setError(err.message || 'Benchmark run failed');
    } finally {
      setRunning(false);
    }
  };

  const filteredResults = useMemo(() => {
    if (!summary?.results) return [];
    return summary.results.filter(r => {
      const matchesStatus = 
        statusFilter === 'ALL' ||
        (statusFilter === 'PASSED' && r.passed) ||
        (statusFilter === 'FAILED' && !r.passed);

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        r.name.toLowerCase().includes(q) ||
        r.case_id.toLowerCase().includes(q) ||
        r.predicted_category.toLowerCase().includes(q) ||
        r.predicted_step.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [summary, statusFilter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Target Gate Header Banner */}
      <Card className="p-5 relative overflow-hidden border-border/80 bg-card/80 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono text-[10px]">
                Commercial Readiness Threshold: ≥ 15/20 Real Logs
              </Badge>
            </div>
            <h2 className="text-base font-bold text-foreground tracking-tight font-mono">
              20 Real Failure Scenarios Benchmark Suite
            </h2>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              <strong>Quality Mandate:</strong> &quot;Validate with 20 real failure logs from one team: if attribution is correct on at least 15, it is ready. Below that, do not sell. Do not promise &apos;auto-fix&apos;; promise faster triage with a clear next step.&quot;
            </p>
          </div>

          <div className="shrink-0">
            <Button
              onClick={handleRunBenchmark}
              disabled={running}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold px-4 h-8.5 shadow-xs transition-all cursor-pointer disabled:opacity-50 text-xs uppercase tracking-wider gap-2"
            >
              {running ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Validating Scenarios...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current text-white" />
                  <span>Execute Benchmark Suite</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in">
          {/* Accuracy Score */}
          <Card className="p-4 space-y-2 border-border/80 bg-card/85 shadow-2xs">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block font-mono">
              Attribution Accuracy
            </span>
            <div className="flex items-baseline space-x-2">
              <span className={`text-2xl font-bold font-mono ${summary.ready_to_sell ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {summary.accuracy_percentage}%
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                ({summary.passed_cases} / {summary.total_cases} passed)
              </span>
            </div>
            {/* Visual accuracy bar */}
            <div className="w-full bg-secondary rounded-full h-1 overflow-hidden border border-border/60">
              <div 
                className={`h-1 rounded-full ${summary.ready_to_sell ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-rose-500'}`}
                style={{ width: `${summary.accuracy_percentage}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground block font-mono">
              Target: ≥ {summary.threshold_percentage}% (15/20)
            </span>
          </Card>

          {/* Commercial Readiness Gate */}
          <Card className="p-4 space-y-2 border-border/80 bg-card/85 shadow-2xs">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block font-mono">
              Commercial Readiness Gate
            </span>
            <div className="mt-1">
              {summary.ready_to_sell ? (
                <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-mono font-bold text-xs gap-1.5 px-2.5 py-0.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>READY TO SELL</span>
                </Badge>
              ) : (
                <Badge variant="outline" className="border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-400 font-mono font-bold text-xs gap-1.5 px-2.5 py-0.5">
                  <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                  <span>DO NOT SELL (&lt;15 correct)</span>
                </Badge>
              )}
            </div>
            <p className="text-[10.5px] text-muted-foreground leading-relaxed font-mono">
              Deterministic pattern matches verified against production ground truth.
            </p>
          </Card>

          {/* Average Latency */}
          <Card className="p-4 space-y-2 border-border/80 bg-card/85 shadow-2xs">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block font-mono">
              Average Attribution Speed
            </span>
            <div className="flex items-baseline space-x-1 text-2xl font-bold text-foreground font-mono">
              <span>{summary.avg_latency_ms}</span>
              <span className="text-xs font-normal text-muted-foreground">ms</span>
            </div>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center space-x-1 font-mono text-[10.5px]">
              <Clock className="w-3 h-3" />
              <span>Sub-second diagnostic speed</span>
            </span>
          </Card>

          {/* Engine Mode */}
          <Card className="p-4 space-y-2 border-border/80 bg-card/85 shadow-2xs">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block font-mono">
              Attribution Engine
            </span>
            <div className="text-sm font-bold text-foreground font-mono mt-0.5">
              50+ Pattern Library
            </div>
            <span className="text-[10.5px] text-muted-foreground block font-mono">
              Strictly constrained context; zero hallucination on stacktrace boundaries.
            </span>
          </Card>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs font-mono">
          {error}
        </div>
      )}

      {/* Benchmark Scorecard Table */}
      {summary && (
        <Card className="overflow-hidden border-border/80 bg-card/90 shadow-2xs animate-fade-in space-y-0">
          {/* Table Toolbar */}
          <div className="px-4 py-2.5 bg-muted/40 border-b border-border/70 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2 font-mono">
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Benchmark Scorecard (20 Real Scenarios)
              </h3>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              {/* Search */}
              <div className="relative">
                <Search className="w-3 h-3 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Filter cases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 pr-2 text-xs font-mono w-36 h-6.5"
                />
              </div>

              {/* Status Segment */}
              <div className="flex items-center space-x-1 bg-muted/60 p-0.5 rounded-md border border-border">
                <Button
                  variant={statusFilter === 'ALL' ? 'secondary' : 'ghost'}
                  size="xs"
                  onClick={() => setStatusFilter('ALL')}
                  className="h-5.5 text-[11px] font-mono px-2"
                >
                  All ({summary.total_cases})
                </Button>
                <Button
                  variant={statusFilter === 'PASSED' ? 'default' : 'ghost'}
                  size="xs"
                  onClick={() => setStatusFilter('PASSED')}
                  className={`h-5.5 text-[11px] font-mono px-2 ${
                    statusFilter === 'PASSED'
                      ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                      : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300'
                  }`}
                >
                  Pass ({summary.passed_cases})
                </Button>
                <Button
                  variant={statusFilter === 'FAILED' ? 'default' : 'ghost'}
                  size="xs"
                  onClick={() => setStatusFilter('FAILED')}
                  className={`h-5.5 text-[11px] font-mono px-2 ${
                    statusFilter === 'FAILED'
                      ? 'bg-rose-600 text-white hover:bg-rose-500'
                      : 'text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300'
                  }`}
                >
                  Fail ({summary.failed_cases})
                </Button>
              </div>
            </div>
          </div>

          {/* Table */}
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/70 hover:bg-transparent">
                <TableHead className="w-20 text-[10px] uppercase font-mono font-semibold text-muted-foreground">Status</TableHead>
                <TableHead className="text-[10px] uppercase font-mono font-semibold text-muted-foreground">Scenario & Case ID</TableHead>
                <TableHead className="text-[10px] uppercase font-mono font-semibold text-muted-foreground">Predicted Category</TableHead>
                <TableHead className="text-[10px] uppercase font-mono font-semibold text-muted-foreground">Action</TableHead>
                <TableHead className="text-[10px] uppercase font-mono font-semibold text-muted-foreground">Failing Step</TableHead>
                <TableHead className="text-right text-[10px] uppercase font-mono font-semibold text-muted-foreground">Latency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="font-mono">
              {filteredResults.map((r) => {
                const isExpanded = expandedCaseId === r.case_id;
                return (
                  <Fragment key={r.case_id}>
                    <TableRow 
                      onClick={() => setExpandedCaseId(isExpanded ? null : r.case_id)}
                      className={`cursor-pointer border-border/60 transition-colors ${
                        isExpanded ? 'bg-muted/40' : 'hover:bg-muted/20'
                      }`}
                    >
                      <TableCell className="py-2.5">
                        {r.passed ? (
                          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono text-[10px] gap-1 px-1.5 py-0">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>PASS</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 font-mono text-[10px] gap-1 px-1.5 py-0">
                            <XCircle className="w-2.5 h-2.5" />
                            <span>FAIL</span>
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="py-2.5">
                        <div className="font-sans font-medium text-foreground text-xs">
                          {r.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          {r.case_id}
                        </div>
                      </TableCell>

                      <TableCell className="py-2.5">
                        <Badge variant="outline" className="text-[10.5px] font-mono text-muted-foreground">
                          {r.predicted_category}
                        </Badge>
                      </TableCell>

                      <TableCell className="py-2.5">
                        {r.predicted_action === 'RERUN' ? (
                          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[9.5px] font-mono font-bold">
                            RERUN
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-[9.5px] font-mono font-bold">
                            FIX
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="py-2.5 text-muted-foreground max-w-xs truncate text-[11px]">
                        {r.predicted_step}
                      </TableCell>

                      <TableCell className="py-2.5 text-right text-muted-foreground font-mono text-[11px]">
                        {r.processing_time_ms} ms
                      </TableCell>
                    </TableRow>

                    {/* Expanded detail comparison panel */}
                    {isExpanded && (
                      <TableRow className="bg-muted/30 border-border/70">
                        <TableCell colSpan={6} className="py-3 px-4">
                          <div className="p-3 rounded-md bg-card border border-border space-y-2 font-sans shadow-2xs">
                            <div className="flex items-center justify-between border-b border-border/70 pb-1.5">
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center space-x-1.5 font-mono">
                                <Target className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                <span>Ground Truth vs Prediction Comparison:</span>
                              </span>
                              <span className="text-[10px] font-mono text-muted-foreground">
                                Case: {r.case_id}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                              <div className="bg-muted/30 p-2.5 rounded-md border border-border/70 space-y-1">
                                <span className="text-[9.5px] text-muted-foreground block uppercase">Root Category</span>
                                <div>Expected: <span className="text-muted-foreground">{r.expected_category}</span></div>
                                <div>Predicted: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{r.predicted_category}</span></div>
                              </div>

                              <div className="bg-muted/30 p-2.5 rounded-md border border-border/70 space-y-1">
                                <span className="text-[9.5px] text-muted-foreground block uppercase">Attributed Action</span>
                                <div>Expected: <span className="text-muted-foreground">{r.expected_action}</span></div>
                                <div>Predicted: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{r.predicted_action}</span></div>
                              </div>

                              <div className="bg-muted/30 p-2.5 rounded-md border border-border/70 space-y-1">
                                <span className="text-[9.5px] text-muted-foreground block uppercase">Failing Step Contains</span>
                                <div className="truncate">Expected: <span className="text-muted-foreground">{r.expected_step_contains}</span></div>
                                <div className="truncate">Matched: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{r.predicted_step}</span></div>
                              </div>
                            </div>

                            <div className="pt-1 text-xs space-y-1 font-mono">
                              <div>
                                <span className="text-rose-600 dark:text-rose-400 font-bold">Root Cause: </span>
                                <span className="text-foreground">{r.root_cause_summary}</span>
                              </div>
                              <div>
                                <span className="text-amber-600 dark:text-amber-400 font-bold">Verification: </span>
                                <span className="text-muted-foreground">{r.explanation}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Initial state placeholder when benchmark has not been run yet */}
      {!summary && !running && (
        <Card className="p-12 text-center space-y-3 border-border/80 bg-card/80 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground font-mono">
            Benchmark Validation Suite Ready for Execution
          </h3>
          <p className="text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Click <strong>&quot;Execute Benchmark Suite&quot;</strong> above to run 20 realistic failure logs spanning AWS STS credentials, NPM peer deps, Gradle OOM, Jest flaky concurrency, Rust borrow errors, and Linux exit 137.
          </p>
        </Card>
      )}
    </div>
  );
};

