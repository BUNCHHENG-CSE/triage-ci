'use client';

import { useState, useMemo } from 'react';
import { 
  RefreshCw, 
  Wrench, 
  GitBranch, 
  GitPullRequest, 
  User, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  MessageSquare, 
  ShieldAlert, 
  Zap, 
  Copy, 
  Check, 
  Terminal, 
  FolderGit2, 
  KeyRound, 
  Package, 
  HardDrive, 
  Wifi, 
  FileCode2, 
  CheckCircle2, 
  Sparkles,
  Share2,
  Trash2,
  X
} from 'lucide-react';
import type { TriageResult } from '../types';
import { LogViewer } from './LogViewer';
import { PrCommentModal } from './PrCommentModal';
import { RemediationPlaybook } from './RemediationPlaybook';
import { NotificationModal } from './NotificationModal';
import { deleteTriageLog } from '../api';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TriageFeedProps {
  triageList: TriageResult[];
  loading: boolean;
  onRefresh: () => void;
  onSelectCluster?: (clusterId: number) => void;
}

const CATEGORY_META: Record<string, { label: string; icon: any; color: string }> = {
  CREDENTIALS_AUTH: { label: 'Auth & Secrets', icon: KeyRound, color: 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' },
  DEPENDENCY: { label: 'Dependencies', icon: Package, color: 'text-sky-700 dark:text-sky-400 bg-sky-500/10 border-sky-500/20' },
  RESOURCE_LIMIT: { label: 'Resource / OOM', icon: HardDrive, color: 'text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/20' },
  TRANSIENT_NETWORK: { label: 'Network Blip', icon: Wifi, color: 'text-cyan-700 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  FLAKY_CONCURRENCY: { label: 'Flaky / Timeout', icon: Sparkles, color: 'text-purple-700 dark:text-purple-400 bg-purple-500/10 border-purple-500/20' },
  COMPILATION_LINT: { label: 'Compile & Lint', icon: FileCode2, color: 'text-orange-700 dark:text-orange-400 bg-orange-500/10 border-orange-500/20' },
  TEST_ASSERTION: { label: 'Test Assertions', icon: CheckCircle2, color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  INFRA_ENVIRONMENT: { label: 'Infra & Runner', icon: Terminal, color: 'text-indigo-700 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
};

export const TriageFeed: React.FC<TriageFeedProps> = ({
  triageList,
  loading,
  onRefresh,
  onSelectCluster
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [selectedProvider, setSelectedProvider] = useState<string>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [copiedActionId, setCopiedActionId] = useState<number | null>(null);
  const [copiedSlackId, setCopiedSlackId] = useState<number | null>(null);
  const [activeNotificationItem, setActiveNotificationItem] = useState<TriageResult | null>(null);

  const [activePrComment, setActivePrComment] = useState<{ isOpen: boolean; markdown: string; jobName: string }>({
    isOpen: false,
    markdown: '',
    jobName: ''
  });

  // Calculate counts for filters
  const counts = useMemo(() => {
    const total = triageList.length;
    const rerun = triageList.filter(i => i.action_type === 'RERUN').length;
    const fix = triageList.filter(i => i.action_type === 'FIX').length;
    
    const catCounts: Record<string, number> = {};
    triageList.forEach(item => {
      catCounts[item.root_cause_category] = (catCounts[item.root_cause_category] || 0) + 1;
    });

    return { total, rerun, fix, catCounts };
  }, [triageList]);

  // Filter items
  const filteredList = useMemo(() => {
    return triageList.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        item.repo_name.toLowerCase().includes(q) ||
        item.branch.toLowerCase().includes(q) ||
        item.exact_failing_step.toLowerCase().includes(q) ||
        item.root_cause_summary.toLowerCase().includes(q) ||
        (item.pr_number && item.pr_number.toString().includes(q)) ||
        item.commit_author.toLowerCase().includes(q);

      const matchesCategory = selectedCategory === 'ALL' || item.root_cause_category === selectedCategory;
      const matchesAction = selectedAction === 'ALL' || item.action_type === selectedAction;
      const matchesProvider = selectedProvider === 'ALL' || item.provider === selectedProvider;

      return matchesSearch && matchesCategory && matchesAction && matchesProvider;
    });
  }, [triageList, searchQuery, selectedCategory, selectedAction, selectedProvider]);

  const categories = [
    'ALL',
    'CREDENTIALS_AUTH',
    'DEPENDENCY',
    'RESOURCE_LIMIT',
    'TRANSIENT_NETWORK',
    'FLAKY_CONCURRENCY',
    'COMPILATION_LINT',
    'TEST_ASSERTION',
    'INFRA_ENVIRONMENT'
  ];

  const handleCopyAction = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedActionId(id);
    setTimeout(() => setCopiedActionId(null), 2000);
  };

  const handleCopySlackSummary = (item: TriageResult) => {
    const slackText = `🚨 *[TCT TriageCI] ${item.repo_name}* (${item.branch})
• *Verdict:* ${item.action_type === 'RERUN' ? '🟢 SAFE TO RERUN (Infra/Transient)' : '🔴 CODE FIX REQUIRED'}
• *Failing Step:* \`${item.exact_failing_step}\`
• *Root Cause:* ${item.root_cause_summary}
• *Next Step:* ${item.suggested_direction}`;

    navigator.clipboard.writeText(slackText);
    setCopiedSlackId(item.id || 0);
    setTimeout(() => setCopiedSlackId(null), 2000);
  };

  const handleDeleteLog = async (id?: number) => {
    if (!id) return;
    if (window.confirm('Delete this failure log from history?')) {
      try {
        await deleteTriageLog(id);
        onRefresh();
      } catch (err) {
        console.error('Failed to delete log:', err);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Action Filters Card */}
      <Card className="p-3.5 space-y-3 border-border/80 bg-card/80 shadow-2xs">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
          {/* Search input */}
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search repo, branch, commit, or error..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-7 text-xs font-mono h-8"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto justify-between md:justify-end">
            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              className="h-8 w-8"
              title="Refresh triage feed"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>

            {/* Action Filter Segmented Buttons */}
            <div className="flex items-center space-x-1 bg-muted/60 p-0.5 rounded-md border border-border">
              <Button
                variant={selectedAction === 'ALL' ? 'secondary' : 'ghost'}
                size="xs"
                onClick={() => setSelectedAction('ALL')}
                className="h-7 text-xs font-mono"
              >
                All ({counts.total})
              </Button>
              <Button
                variant={selectedAction === 'RERUN' ? 'default' : 'ghost'}
                size="xs"
                onClick={() => setSelectedAction('RERUN')}
                className={`h-7 text-xs font-mono gap-1 ${
                  selectedAction === 'RERUN' 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500' 
                    : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300'
                }`}
              >
                <RefreshCw className="w-3 h-3" />
                <span>Safe to Rerun ({counts.rerun})</span>
              </Button>
              <Button
                variant={selectedAction === 'FIX' ? 'default' : 'ghost'}
                size="xs"
                onClick={() => setSelectedAction('FIX')}
                className={`h-7 text-xs font-mono gap-1 ${
                  selectedAction === 'FIX' 
                    ? 'bg-rose-600 text-white hover:bg-rose-500' 
                    : 'text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300'
                }`}
              >
                <Wrench className="w-3 h-3" />
                <span>Fix Required ({counts.fix})</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pt-1 pb-0.5 scrollbar-none border-t border-border/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 mr-1 font-mono">
            Category:
          </span>
          {categories.map((cat) => {
            const isAll = cat === 'ALL';
            const meta = CATEGORY_META[cat];
            const Icon = meta ? meta.icon : Terminal;
            const label = isAll ? 'All' : (meta ? meta.label : cat);
            const count = isAll ? counts.total : (counts.catCounts[cat] || 0);
            const isSelected = selectedCategory === cat;

            return (
              <Button
                key={cat}
                variant={isSelected ? 'default' : 'outline'}
                size="xs"
                onClick={() => setSelectedCategory(cat)}
                className={`h-6 text-[11px] gap-1 px-2 font-mono whitespace-nowrap ${
                  isSelected
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {!isAll && <Icon className="w-2.5 h-2.5" />}
                <span>{label}</span>
                <Badge variant="secondary" className="h-3.5 px-1 text-[9px] font-mono ml-0.5">
                  {count}
                </Badge>
              </Button>
            );
          })}
        </div>

        {/* CI Provider Filter Chips */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pt-1 pb-0.5 scrollbar-none border-t border-border/40">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 mr-1 font-mono">
            Provider:
          </span>
          {['ALL', 'github_actions', 'gitlab_ci', 'jenkins'].map((prov) => {
            const isSelected = selectedProvider === prov;
            const label = prov === 'ALL' ? 'All CI Providers' : prov === 'github_actions' ? 'GitHub Actions' : prov === 'gitlab_ci' ? 'GitLab CI' : 'Jenkins';
            return (
              <Button
                key={prov}
                variant={isSelected ? 'default' : 'ghost'}
                size="xs"
                onClick={() => setSelectedProvider(prov)}
                className={`h-5 text-[10px] px-2 font-mono ${
                  isSelected
                    ? 'bg-secondary text-secondary-foreground font-semibold border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </Button>
            );
          })}
        </div>
      </Card>

      {/* Triage Cards Feed */}
      {loading ? (
        <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-7 h-7 animate-spin text-rose-500" />
          <p className="text-xs font-medium font-mono">Analyzing pipeline execution logs & attribution models...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <Card className="p-12 text-center border border-border/80">
          <ShieldAlert className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground font-mono">No matching CI failure records</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 leading-relaxed">
            Adjust your search or filter options. You can also paste or upload raw build logs in the{' '}
            <strong className="text-rose-600 dark:text-rose-400 font-mono">Triage Studio</strong> tab to analyze any custom failure.
          </p>
        </Card>
      ) : (
        <div className="space-y-3.5">
          {filteredList.map((item) => {
            const isExpanded = expandedLogId === item.id;
            const isRerun = item.action_type === 'RERUN';
            const isRecurring = item.cluster_occurrence_count > 1;
            const catMeta = CATEGORY_META[item.root_cause_category] || {
              label: item.root_cause_category,
              icon: Terminal,
              color: 'text-muted-foreground bg-muted border-border'
            };
            const CatIcon = catMeta.icon;

            return (
              <Card
                key={item.id}
                className={`overflow-hidden border transition-all duration-200 shadow-2xs ${
                  isRerun 
                    ? 'hover:border-emerald-500/50 bg-card/90' 
                    : 'hover:border-rose-500/50 bg-card/90'
                }`}
              >
                {/* 1. Header Bar: Repo, Branch, Commit & Clear Primary Verdict Badge */}
                <CardHeader className="px-4 py-2.5 bg-muted/30 border-b border-border/60 flex flex-wrap items-center justify-between gap-2.5">
                  {/* Left: Metadata Group */}
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    {/* Repo Badge */}
                    <Badge variant="outline" className="font-bold text-foreground bg-secondary/50 border-border gap-1 py-0.5">
                      <FolderGit2 className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                      <span>{item.repo_name}</span>
                    </Badge>

                    {/* Branch Chip */}
                    <Badge variant="outline" className="text-muted-foreground border-border/80 gap-1 font-normal py-0.5">
                      <GitBranch className="w-2.5 h-2.5 text-muted-foreground" />
                      <span>{item.branch}</span>
                    </Badge>

                    {/* PR Link (if applicable) */}
                    {item.pr_number && (
                      <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 gap-1 font-normal py-0.5">
                        <GitPullRequest className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400" />
                        <span>PR #{item.pr_number}</span>
                      </Badge>
                    )}

                    {/* Author & Commit SHA */}
                    <div className="flex items-center space-x-1.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center space-x-1">
                        <User className="w-2.5 h-2.5 text-muted-foreground" />
                        <span>{item.commit_author}</span>
                      </span>
                      <span>•</span>
                      <span className="text-muted-foreground/80 font-mono">
                        {item.commit_sha.substring(0, 7)}
                      </span>
                    </div>
                  </div>

                  {/* Right: Decision Verdict Badges */}
                  <div className="flex items-center space-x-2">
                    {/* Recurring Loop Warning */}
                    {isRecurring && (
                      <button 
                        onClick={() => onSelectCluster && item.cluster_id && onSelectCluster(item.cluster_id)}
                        className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] font-bold font-mono hover:bg-amber-500/25 transition-colors cursor-pointer"
                        title="Click to inspect this cluster group"
                      >
                        <Layers className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                        <span>Recurring ({item.cluster_occurrence_count}x)</span>
                      </button>
                    )}

                    {/* Primary Verdict Banner */}
                    {isRerun ? (
                      <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-mono font-bold text-[10px] gap-1 px-2 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 inline-block animate-pulse" />
                        <RefreshCw className="w-2.5 h-2.5" />
                        <span>SAFE TO RERUN</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-400 font-mono font-bold text-[10px] gap-1 px-2 py-0.5">
                        <Wrench className="w-2.5 h-2.5" />
                        <span>FIX REQUIRED</span>
                      </Badge>
                    )}

                    {/* Confidence Score */}
                    <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground border-border/80 py-0.5">
                      {Math.round(item.confidence_score * 100)}% conf
                    </Badge>
                  </div>
                </CardHeader>

                {/* 2. Main Content Body: Partitioned Root Cause & Action Direction */}
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                    {/* Left: Root Cause Attribution Panel (7 cols) */}
                    <div className="lg:col-span-7 bg-muted/20 border border-border/80 rounded-lg p-3 space-y-2">
                      {/* Failing step header badge */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border/60 pb-1.5">
                        <div className="flex items-center space-x-1.5 text-xs font-mono">
                          <span className="text-muted-foreground uppercase text-[10px] font-bold">Failing Step:</span>
                          <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-mono text-[10px] py-0 px-1.5">
                            {item.exact_failing_step}
                          </Badge>
                        </div>

                        {/* Category tag */}
                        <div className={`flex items-center space-x-1 text-[10px] px-1.5 py-0.5 rounded border font-mono ${catMeta.color}`}>
                          <CatIcon className="w-2.5 h-2.5" />
                          <span>{catMeta.label}</span>
                        </div>
                      </div>

                      {/* Summary explanation */}
                      <div className="space-y-0.5">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold block font-mono">
                          Root Cause Diagnostic:
                        </span>
                        <p className="text-xs text-foreground font-medium leading-relaxed font-sans">
                          {item.root_cause_summary}
                        </p>
                      </div>
                    </div>

                    {/* Right: Actionable Resolution Directive (5 cols) */}
                    <div className="lg:col-span-5 bg-gradient-to-br from-amber-500/10 via-card to-background border border-amber-500/30 rounded-lg p-3 flex flex-col justify-between space-y-2">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400 font-bold flex items-center space-x-1 font-mono">
                            <Zap className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span>Recommended Next Step:</span>
                          </span>

                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => handleCopyAction(item.id || 0, item.suggested_direction)}
                            className="h-5 text-[10px] font-mono gap-1 px-1.5"
                          >
                            {copiedActionId === item.id ? (
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
                          {item.suggested_direction}
                        </p>
                      </div>

                      <div className="text-[10px] text-muted-foreground font-mono flex items-center justify-between pt-1">
                        <span>Workflow: <code className="text-foreground">{item.workflow_name || 'CI'}</code></span>
                        <span>Job: <code className="text-foreground">{item.job_name || 'build'}</code></span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Expandable High-Signal Log Viewer & One-Click Fix Playbook */}
                  {isExpanded && (
                    <div className="pt-2 space-y-3 animate-fade-in">
                      {/* One-Click Remediation Playbook (CLI Commands & Config Patch) */}
                      <RemediationPlaybook
                        commands={item.remediation_commands}
                        patchDiff={item.remediation_patch}
                        actionType={item.action_type}
                        failingStep={item.exact_failing_step}
                        defaultOpen={true}
                      />

                      <LogViewer
                        excerptLines={item.excerpt_lines}
                        extractedExcerptText={item.extracted_excerpt}
                        totalRawLines={item.total_raw_lines}
                        reductionPercentage={item.reduction_percentage}
                        failingStep={item.exact_failing_step}
                      />
                    </div>
                  )}
                </CardContent>

                {/* 4. Bottom Action Bar */}
                <CardFooter className="px-4 py-2 bg-muted/20 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
                  {/* Noise Pruning & Toggle Button */}
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setExpandedLogId(isExpanded ? null : item.id || 0)}
                    className="gap-1.5 text-xs font-mono h-6"
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3 text-rose-600 dark:text-rose-400" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                    <span>{isExpanded ? 'Collapse Evidence' : 'Inspect Evidence'}</span>
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[9px] h-3.5 px-1 font-mono">
                      {item.reduction_percentage}% noise pruned
                    </Badge>
                  </Button>

                  {/* Quick PR, Alert & Slack Share Buttons */}
                  <div className="flex items-center space-x-1.5">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => setActiveNotificationItem(item)}
                      className="gap-1 text-xs font-mono h-6 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                      title="Dispatch Slack card or Discord alert"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>Dispatch Alert</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => handleCopySlackSummary(item)}
                      className="gap-1 text-xs font-mono h-6"
                      title="Copy condensed summary to paste in Slack or Teams"
                    >
                      {copiedSlackId === item.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <span>Copy Brief</span>
                        </>
                      )}
                    </Button>

                    <Button
                      size="xs"
                      onClick={() => setActivePrComment({
                        isOpen: true,
                        markdown: item.pr_comment_markdown,
                        jobName: item.job_name
                      })}
                      className="bg-rose-500 hover:bg-rose-600 text-white gap-1 text-xs font-mono h-6"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>PR Comment</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleDeleteLog(item.id)}
                      className="h-6 w-6 text-muted-foreground hover:text-rose-600"
                      title="Delete failure log from database"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* PR Comment Markdown Modal */}
      <PrCommentModal
        isOpen={activePrComment.isOpen}
        onClose={() => setActivePrComment({ isOpen: false, markdown: '', jobName: '' })}
        markdown={activePrComment.markdown}
        jobName={activePrComment.jobName}
      />

      {/* Dispatch Alert & Postmortem Modal */}
      {activeNotificationItem && (
        <NotificationModal
          isOpen={Boolean(activeNotificationItem)}
          onClose={() => setActiveNotificationItem(null)}
          result={activeNotificationItem}
        />
      )}
    </div>
  );
};

