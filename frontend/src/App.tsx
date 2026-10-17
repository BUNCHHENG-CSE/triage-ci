import React, { useState, useEffect } from 'react';
import { 
  fetchStats, 
  fetchTriageHistory, 
  fetchClusters 
} from './api';
import type { 
  TriageResult, 
  ClusterSummary, 
  DashboardStats 
} from './types';
import { Header } from './components/Header';
import { TriageFeed } from './components/TriageFeed';
import { ClusterView } from './components/ClusterView';
import { LogStudio } from './components/LogStudio';
import { BenchmarkSuite } from './components/BenchmarkSuite';
import { RoiCalculator } from './components/RoiCalculator';
import { WebhookConfig } from './components/WebhookConfig';
import { 
  Activity, 
  Layers, 
  RefreshCw, 
  Clock, 
  Wrench, 
  AlertOctagon, 
  CheckCircle2,
  DollarSign
} from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('feed');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [triageList, setTriageList] = useState<TriageResult[]>([]);
  const [clusters, setClusters] = useState<ClusterSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, historyRes, clustersRes] = await Promise.all([
        fetchStats().catch(() => null),
        fetchTriageHistory().catch(() => []),
        fetchClusters().catch(() => [])
      ]);
      if (statsRes) setStats(statsRes);
      setTriageList(historyRes);
      setClusters(clustersRes);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTriageCreated = (newResult: TriageResult) => {
    setTriageList(prev => [newResult, ...prev]);
    loadData(); // refresh stats and clusters
    setActiveTab('feed');
  };

  const topClusterOccurrences = stats?.top_cluster?.occurrences || 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500/30">
      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalTriaged={stats?.total_triaged || triageList.length}
        topClusterOccurrences={topClusterOccurrences}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Highlight Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Triaged */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-semibold uppercase tracking-wider">Pipelines Triaged</span>
              <Activity className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {stats?.total_triaged || triageList.length}
            </div>
            <div className="text-xs text-slate-400">
              Noise pruned: ~98.5% avg
            </div>
          </div>

          {/* Card 2: Recurring Clusters */}
          <div 
            onClick={() => setActiveTab('clusters')}
            className="bg-slate-900/80 border border-slate-800/80 hover:border-amber-500/40 rounded-2xl p-4 sm:p-5 space-y-1 shadow-sm transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-semibold uppercase tracking-wider">Recurring Clusters</span>
              <Layers className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-300 font-mono">
                {stats?.total_clusters || clusters.length}
              </span>
              {topClusterOccurrences > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Top: {topClusterOccurrences}x
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 truncate">
              {stats?.top_cluster?.title || 'Shared signature detected'}
            </div>
          </div>

          {/* Card 3: Rerun vs Fix Action ratio */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-semibold uppercase tracking-wider">Action Attribution</span>
              <Wrench className="w-4 h-4 text-rose-400" />
            </div>
            <div className="flex items-center space-x-3 text-lg font-bold font-mono">
              <span className="text-emerald-400 flex items-center space-x-1">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{stats?.rerun_count ?? 1} Rerun</span>
              </span>
              <span className="text-slate-600">/</span>
              <span className="text-rose-400 flex items-center space-x-1">
                <Wrench className="w-3.5 h-3.5" />
                <span>{stats?.fix_count ?? 2} Fix</span>
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Clear rerun vs fix direction
            </div>
          </div>

          {/* Card 4: Engineering Hours Reclaimed */}
          <div 
            onClick={() => setActiveTab('roi')}
            className="bg-slate-900/80 border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl p-4 sm:p-5 space-y-1 shadow-sm transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-semibold uppercase tracking-wider">Focus Reclaimed</span>
              <Clock className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
              {stats?.hours_saved_total ?? 18.5} hrs
            </div>
            <div className="text-xs text-slate-400">
              ~${stats?.dollars_saved_total?.toLocaleString() ?? '1,480'} engineering value saved
            </div>
          </div>
        </div>

        {/* Tab View Content */}
        {activeTab === 'feed' && (
          <TriageFeed
            triageList={triageList}
            loading={loading}
            onRefresh={loadData}
            onSelectCluster={() => setActiveTab('clusters')}
          />
        )}

        {activeTab === 'clusters' && (
          <ClusterView
            clusters={clusters}
            loading={loading}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'studio' && (
          <LogStudio
            onTriageCreated={handleTriageCreated}
          />
        )}

        {activeTab === 'benchmark' && (
          <BenchmarkSuite />
        )}

        {activeTab === 'roi' && (
          <RoiCalculator />
        )}

        {activeTab === 'webhook' && (
          <WebhookConfig />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>TriageCI</strong> • Diagnostic Attribution Layer for GitHub Actions, GitLab CI & Jenkins
          </span>
          <span className="text-slate-400">
            Diagnosis Only • No pipeline editing • $29-$49/repo or $99-$199/team
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
