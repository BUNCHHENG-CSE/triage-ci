'use client';

import { useState, useMemo } from 'react';
import { 
  Layers, 
  Flame, 
  RefreshCw, 
  Wrench, 
  Clock, 
  CheckCircle2, 
  FolderGit2,
  Copy,
  Check,
  Search,
  Sparkles
} from 'lucide-react';
import type { ClusterSummary } from '../types';
import { toggleResolveCluster } from '../api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ClusterViewProps {
  clusters: ClusterSummary[];
  loading: boolean;
  onRefresh: () => void;
}

export const ClusterView: React.FC<ClusterViewProps> = ({
  clusters,
  loading,
  onRefresh
}) => {
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedFingerprintId, setCopiedFingerprintId] = useState<number | null>(null);

  const handleToggleResolve = async (id: number) => {
    try {
      setResolvingId(id);
      await toggleResolveCluster(id);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setResolvingId(null);
    }
  };

  const handleCopyFingerprint = (id: number, fp: string) => {
    navigator.clipboard.writeText(fp);
    setCopiedFingerprintId(id);
    setTimeout(() => setCopiedFingerprintId(null), 2000);
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = clusters.length;
    const active = clusters.filter(c => c.status !== 'RESOLVED').length;
    const resolved = clusters.filter(c => c.status === 'RESOLVED').length;
    const totalFailedBuilds = clusters.reduce((acc, c) => acc + (c.occurrence_count || 1), 0);
    // Each duplicate failure in a cluster saves ~15 mins of duplicate triage
    const duplicateTriagesPrevented = Math.max(0, totalFailedBuilds - total);
    const hoursSaved = Math.round((duplicateTriagesPrevented * 18 / 60) * 10) / 10;

    return { total, active, resolved, totalFailedBuilds, hoursSaved };
  }, [clusters]);

  const filteredClusters = useMemo(() => {
    return clusters.filter(c => {
      const matchesStatus = 
        statusFilter === 'ALL' || 
        (statusFilter === 'ACTIVE' && c.status !== 'RESOLVED') ||
        (statusFilter === 'RESOLVED' && c.status === 'RESOLVED');

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        c.title.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.suggested_direction.toLowerCase().includes(q) ||
        (c.affected_repos && c.affected_repos.some(r => r.toLowerCase().includes(q)));

      return matchesStatus && matchesSearch;
    });
  }, [clusters, statusFilter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Intro Header & Intelligence Metrics */}
      <Card className="p-4 space-y-3.5 border-border/80 bg-card/80 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Flame className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-sm font-bold text-foreground font-mono">
                Recurring Failure Clusters & Loops
              </h2>
              <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-mono">
                De-duplication Engine
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              TCT TriageCI computes fingerprint hashes across builds to aggregate recurring root causes.
              Instead of 14 engineers independently investigating the same expired credential or flaky mock timeout, teams immediately see the common source.
            </p>
          </div>

          <Button
            variant="outline"
            size="xs"
            onClick={onRefresh}
            className="gap-1 font-mono text-xs h-7 self-start md:self-auto cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Sync Clusters</span>
          </Button>
        </div>

        {/* Intelligence Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-3 border-t border-border/60">
          <div className="bg-muted/30 p-2.5 rounded-lg border border-border/70">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block font-mono">Active Loops</span>
            <span className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono">{metrics.active}</span>
            <span className="text-[10px] text-muted-foreground block font-mono mt-0.5">Recurring groups</span>
          </div>

          <div className="bg-muted/30 p-2.5 rounded-lg border border-border/70">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block font-mono">Resolved Loops</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">{metrics.resolved}</span>
            <span className="text-[10px] text-muted-foreground block font-mono mt-0.5">Mitigated</span>
          </div>

          <div className="bg-muted/30 p-2.5 rounded-lg border border-border/70">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block font-mono">Builds Impacted</span>
            <span className="text-lg font-bold text-foreground font-mono">{metrics.totalFailedBuilds}</span>
            <span className="text-[10px] text-muted-foreground block font-mono mt-0.5">Across all repos</span>
          </div>

          <div className="bg-muted/30 p-2.5 rounded-lg border border-border/70">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block font-mono">Attention Saved</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">{metrics.hoursSaved} hrs</span>
            <span className="text-[10px] text-muted-foreground block font-mono mt-0.5">Avoided duplicate triage</span>
          </div>
        </div>
      </Card>

      {/* Filter and Search Bar */}
      <Card className="p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 border-border/80 bg-card/80 shadow-2xs">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            type="text"
            placeholder="Filter clusters by title or repo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 text-xs font-mono h-7"
          />
        </div>

        {/* Status segment */}
        <div className="flex items-center space-x-1 w-full sm:w-auto bg-muted/60 p-0.5 rounded-md border border-border">
          <Button
            variant={statusFilter === 'ALL' ? 'secondary' : 'ghost'}
            size="xs"
            onClick={() => setStatusFilter('ALL')}
            className="h-6 text-xs font-mono"
          >
            All ({metrics.total})
          </Button>
          <Button
            variant={statusFilter === 'ACTIVE' ? 'default' : 'ghost'}
            size="xs"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`h-6 text-xs font-mono ${
              statusFilter === 'ACTIVE'
                ? 'bg-amber-600 text-white hover:bg-amber-500'
                : 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300'
            }`}
          >
            Active ({metrics.active})
          </Button>
          <Button
            variant={statusFilter === 'RESOLVED' ? 'default' : 'ghost'}
            size="xs"
            onClick={() => setStatusFilter('RESOLVED')}
            className={`h-6 text-xs font-mono ${
              statusFilter === 'RESOLVED'
                ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300'
            }`}
          >
            Resolved ({metrics.resolved})
          </Button>
        </div>
      </Card>

      {/* Clusters List */}
      {loading ? (
        <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-7 h-7 animate-spin text-amber-600 dark:text-amber-400" />
          <p className="text-xs font-mono">Loading recurring failure cluster registry...</p>
        </div>
      ) : filteredClusters.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground border border-border/80">
          <Layers className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground font-mono">No failure clusters matching criteria</h3>
          <p className="text-xs text-muted-foreground mt-1">Clusters automatically form when multiple failures share the exact same root signature.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredClusters.map((cluster) => {
            const isResolved = cluster.status === 'RESOLVED';
            const isRerun = cluster.suggested_action_type === 'RERUN';
            const isHighOccurrence = cluster.occurrence_count >= 5;

            return (
              <Card
                key={cluster.id}
                className={`p-4 transition-all border space-y-3 shadow-2xs ${
                  isResolved
                    ? 'border-border/60 opacity-60 bg-card/60'
                    : isHighOccurrence
                    ? 'border-amber-500/40 bg-card/90 shadow-xs'
                    : 'border-border/80 hover:border-border bg-card/85'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  {/* Left: Occurrence & Category Badges & Title */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Occurrence Counter */}
                      <Badge variant="outline" className={`text-xs font-bold font-mono gap-1 py-0.5 px-2 ${
                        cluster.occurrence_count >= 10
                          ? 'border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-300 animate-pulse'
                          : isHighOccurrence
                          ? 'border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          : 'border-border text-foreground bg-secondary/50'
                      }`}>
                        <Flame className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        <span>{cluster.occurrence_count} builds failed</span>
                      </Badge>

                      {/* Category */}
                      <Badge variant="outline" className="text-[10px] font-mono font-medium text-muted-foreground py-0.5">
                        {cluster.category}
                      </Badge>

                      {/* Suggested Action */}
                      {isRerun ? (
                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 gap-1 font-mono text-[10px] py-0.5">
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>Safe to Rerun</span>
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 gap-1 font-mono text-[10px] py-0.5">
                          <Wrench className="w-2.5 h-2.5" />
                          <span>Fix Required</span>
                        </Badge>
                      )}

                      {isResolved && (
                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] py-0.5">
                          Resolved
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-sm font-semibold text-foreground tracking-tight font-mono">
                      {cluster.title}
                    </h3>
                  </div>

                  {/* Right: Resolve / Re-open Action Button */}
                  <div className="shrink-0">
                    <Button
                      variant={isResolved ? "outline" : "default"}
                      size="xs"
                      onClick={() => handleToggleResolve(cluster.id)}
                      disabled={resolvingId === cluster.id}
                      className={`gap-1.5 font-mono text-xs h-7 cursor-pointer ${
                        !isResolved && 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {resolvingId === cluster.id ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      <span>{isResolved ? 'Re-open Cluster' : 'Mark Resolved'}</span>
                    </Button>
                  </div>
                </div>

                {/* Suggested Fix Direction Callout */}
                <div className="bg-muted/20 border border-amber-500/25 rounded-md p-2.5 text-xs text-foreground font-mono space-y-1">
                  <div className="flex items-center space-x-1.5 text-amber-700 dark:text-amber-400 font-bold text-[10px] uppercase tracking-wider">
                    <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    <span>Single Resolution Fix:</span>
                  </div>
                  <p className="text-amber-950 dark:text-amber-200/90 leading-relaxed text-[11.5px] bg-background/80 p-2 rounded border border-amber-500/20">
                    {cluster.suggested_direction}
                  </p>
                </div>

                {/* Affected Repositories & Fingerprint */}
                <div className="pt-2.5 border-t border-border/60 flex flex-wrap items-center justify-between gap-2.5 text-xs text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <FolderGit2 className="w-3 h-3 text-muted-foreground" />
                    <span className="font-medium text-muted-foreground font-mono text-[11px]">Impacted:</span>
                    <div className="flex flex-wrap gap-1">
                      {cluster.affected_repos && cluster.affected_repos.length > 0 ? (
                        cluster.affected_repos.map((repo, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="font-mono text-[10px] h-4 px-1.5"
                          >
                            {repo}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground font-mono text-[10px]">unknown-org/repo</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-[10.5px] font-mono">
                    <div className="flex items-center space-x-1 text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>First seen: {new Date(cluster.first_seen).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center space-x-1 text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded border border-border/80">
                      <span>hash: <code className="text-foreground">{cluster.fingerprint.substring(0, 14)}...</code></span>
                      <button
                        onClick={() => handleCopyFingerprint(cluster.id, cluster.fingerprint)}
                        className="text-muted-foreground hover:text-foreground ml-1 cursor-pointer"
                        title="Copy fingerprint hash"
                      >
                        {copiedFingerprintId === cluster.id ? (
                          <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="w-2.5 h-2.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

