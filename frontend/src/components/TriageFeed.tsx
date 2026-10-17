import React, { useState } from 'react';
import { 
  AlertCircle, 
  RefreshCw, 
  Wrench, 
  GitBranch, 
  GitPullRequest, 
  User, 
  Clock, 
  ExternalLink, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  MessageSquare,
  ShieldAlert,
  Zap
} from 'lucide-react';
import type { TriageResult } from '../types';
import { LogViewer } from './LogViewer';
import { PrCommentModal } from './PrCommentModal';

interface TriageFeedProps {
  triageList: TriageResult[];
  loading: boolean;
  onRefresh: () => void;
  onSelectCluster?: (clusterId: number) => void;
}

export const TriageFeed: React.FC<TriageFeedProps> = ({
  triageList,
  loading,
  onRefresh,
  onSelectCluster
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [activePrComment, setActivePrComment] = useState<{ isOpen: boolean; markdown: string; jobName: string }>({
    isOpen: false,
    markdown: '',
    jobName: ''
  });

  // Filter items
  const filteredList = triageList.filter((item) => {
    const matchesSearch = 
      item.repo_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.branch.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.exact_failing_step.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.root_cause_summary.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'ALL' || item.root_cause_category === selectedCategory;
    const matchesAction = selectedAction === 'ALL' || item.action_type === selectedAction;

    return matchesSearch && matchesCategory && matchesAction;
  });

  const categories = ['ALL', 'CREDENTIALS_AUTH', 'DEPENDENCY', 'RESOURCE_LIMIT', 'TRANSIENT_NETWORK', 'FLAKY_CONCURRENCY', 'COMPILATION_LINT', 'TEST_ASSERTION', 'INFRA_ENVIRONMENT'];

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search repo, branch, or error keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
          />
        </div>

        {/* Action Type filter */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <button
            onClick={() => setSelectedAction('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              selectedAction === 'ALL' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Actions
          </button>
          <button
            onClick={() => setSelectedAction('RERUN')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              selectedAction === 'RERUN' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Safe to Rerun</span>
          </button>
          <button
            onClick={() => setSelectedAction('FIX')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              selectedAction === 'FIX' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-400 hover:text-rose-400'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Fix Required</span>
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer font-medium ${
              selectedCategory === cat
                ? 'bg-rose-500 text-white font-semibold shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            {cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Triage Cards Feed */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-rose-400" />
          <p className="text-sm">Analyzing incoming pipeline logs...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <ShieldAlert className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No matching pipeline failures found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            Try adjusting your search query, or use the Triage Studio tab to analyze a raw CI failure log.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredList.map((item) => {
            const isExpanded = expandedLogId === item.id;
            const isRerun = item.action_type === 'RERUN';
            const isRecurring = item.cluster_occurrence_count > 1;

            return (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl overflow-hidden transition-all shadow-md"
              >
                {/* Main Card Content */}
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Top Bar: Action badge, Category, and Recurring cluster notice */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center space-x-2.5">
                      {isRerun ? (
                        <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>SAFE TO RERUN</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          <Wrench className="w-3.5 h-3.5" />
                          <span>FIX REQUIRED</span>
                        </span>
                      )}

                      <span className="text-xs font-mono font-medium text-slate-400 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                        {item.root_cause_category}
                      </span>

                      <span className="text-xs text-slate-500">
                        {Math.round(item.confidence_score * 100)}% confidence
                      </span>
                    </div>

                    {/* Recurring Cluster Badge */}
                    {isRecurring && (
                      <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Recurring: {item.cluster_occurrence_count} builds failed with this signature</span>
                      </div>
                    )}
                  </div>

                  {/* Metadata Row: Repo, Branch, Commit, PR, Step */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
                    <div className="flex items-center space-x-1 font-mono text-slate-200 font-semibold">
                      <span>{item.repo_name}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-mono text-slate-300">{item.branch}</span>
                    </div>
                    {item.pr_number && (
                      <div className="flex items-center space-x-1 text-slate-400">
                        <GitPullRequest className="w-3.5 h-3.5 text-rose-400" />
                        <span>PR #{item.pr_number}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>{item.commit_author}</span>
                    </div>
                    <div className="flex items-center space-x-1 font-mono text-slate-500">
                      <span>sha: {item.commit_sha.substring(0, 7)}</span>
                    </div>
                  </div>

                  {/* Root Cause Hypothesis and Failing Step */}
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-start space-x-2.5">
                      <AlertCircle className={`w-4 h-4 mt-0.5 shrink-0 ${isRerun ? 'text-amber-400' : 'text-rose-400'}`} />
                      <div>
                        <div className="text-xs font-mono text-slate-400 mb-0.5">
                          Failing Step: <span className="text-rose-300 font-bold">{item.exact_failing_step}</span>
                        </div>
                        <p className="text-sm text-slate-200 font-medium leading-relaxed">
                          {item.root_cause_summary}
                        </p>
                      </div>
                    </div>

                    {/* Suggested Action */}
                    <div className="flex items-start space-x-2.5 pt-2 border-t border-slate-800/60">
                      <Zap className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold text-slate-400 mb-0.5 uppercase tracking-wider">
                          Recommended Next Step:
                        </div>
                        <p className="text-sm text-amber-200/90 font-mono">
                          {item.suggested_direction}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Log Viewer */}
                  {isExpanded && (
                    <div className="pt-2">
                      <LogViewer
                        excerptLines={item.excerpt_lines}
                        extractedExcerptText={item.extracted_excerpt}
                        totalRawLines={item.total_raw_lines}
                        reductionPercentage={item.reduction_percentage}
                        failingStep={item.exact_failing_step}
                      />
                    </div>
                  )}

                  {/* Actions footer */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setExpandedLogId(isExpanded ? null : item.id || 0)}
                      className="flex items-center space-x-1.5 text-xs font-medium text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      <span>{isExpanded ? 'Hide Extracted Log' : 'Inspect Extracted Evidence'}</span>
                    </button>

                    <button
                      onClick={() => setActivePrComment({
                        isOpen: true,
                        markdown: item.pr_comment_markdown,
                        jobName: item.job_name
                      })}
                      className="flex items-center space-x-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>View PR Comment Markdown</span>
                    </button>
                  </div>
                </div>
              </div>
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
    </div>
  );
};
