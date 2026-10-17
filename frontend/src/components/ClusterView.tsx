import React, { useState } from 'react';
import { 
  Layers, 
  Flame, 
  RefreshCw, 
  Wrench, 
  Clock, 
  GitFork, 
  CheckCircle, 
  AlertTriangle,
  FolderGit2
} from 'lucide-react';
import type { ClusterSummary } from '../types';
import { toggleResolveCluster } from '../api';

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

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="bg-gradient-to-r from-rose-950/40 via-amber-950/20 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start space-x-4">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Recurring Failure Clusters
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              TriageCI computes fingerprint hashes across builds to aggregate recurring root causes.
              Instead of 14 engineers independently investigating the same expired credential or flaky mock timeout, teams immediately see the common source.
            </p>
          </div>
        </div>
      </div>

      {/* Clusters List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-rose-400" />
          <p className="text-sm">Loading recurring failure clusters...</p>
        </div>
      ) : clusters.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p>No failure clusters identified yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {clusters.map((cluster) => {
            const isResolved = cluster.status === 'RESOLVED';
            const isRerun = cluster.suggested_action_type === 'RERUN';

            return (
              <div
                key={cluster.id}
                className={`bg-slate-900 border rounded-2xl p-6 transition-all shadow-md ${
                  isResolved
                    ? 'border-slate-800/60 opacity-60'
                    : cluster.occurrence_count >= 10
                    ? 'border-amber-500/40 bg-gradient-to-b from-slate-900 to-amber-950/10'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Title and occurrence counter */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        cluster.occurrence_count >= 10
                          ? 'bg-amber-400 text-slate-950 animate-pulse'
                          : 'bg-slate-800 text-slate-200'
                      }`}>
                        {cluster.occurrence_count} builds failed
                      </span>

                      <span className="text-xs font-mono font-medium text-slate-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
                        {cluster.category}
                      </span>

                      {isRerun ? (
                        <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <RefreshCw className="w-3 h-3" />
                          <span>Rerun</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <Wrench className="w-3 h-3" />
                          <span>Fix Required</span>
                        </span>
                      )}

                      {isResolved && (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-400">
                          Resolved
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white">
                      {cluster.title}
                    </h3>
                  </div>

                  {/* Resolve / Action button */}
                  <div>
                    <button
                      onClick={() => handleToggleResolve(cluster.id)}
                      disabled={resolvingId === cluster.id}
                      className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        isResolved
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{isResolved ? 'Re-open Cluster' : 'Mark Resolved'}</span>
                    </button>
                  </div>
                </div>

                {/* Suggested Action & Direction */}
                <div className="mt-4 bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-300 font-mono">
                  <span className="text-rose-400 font-bold">Fix Direction: </span>
                  {cluster.suggested_direction}
                </div>

                {/* Affected Repositories & Timeline */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                  <div className="flex items-center space-x-2">
                    <FolderGit2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Affected Repositories:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {cluster.affected_repos && cluster.affected_repos.length > 0 ? (
                        cluster.affected_repos.map((repo, i) => (
                          <span
                            key={i}
                            className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[11px] font-mono"
                          >
                            {repo}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500 font-mono">unknown-org/repo</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-slate-500 text-[11px]">
                    <Clock className="w-3 h-3" />
                    <span>Fingerprint: <code className="text-slate-400">{cluster.fingerprint.substring(0, 24)}...</code></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
