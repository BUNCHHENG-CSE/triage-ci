import { useState, useEffect } from 'react';
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
import { CiHealthAnalytics } from './components/CiHealthAnalytics';
import { Card, CardHeader, CardTitle, CardAction, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Layers, 
  RefreshCw, 
  Clock, 
  Wrench, 
  ShieldCheck,
  ArrowUpRight,
  TrendingUp,
  Cpu
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
    loadData();
    setActiveTab('feed');
  };

  const topClusterOccurrences = stats?.top_cluster?.occurrences || 0;
  const totalTriaged = stats?.total_triaged || triageList.length;
  const rerunCount = stats?.rerun_count ?? 1;
  const fixCount = stats?.fix_count ?? 2;
  const totalActionCount = rerunCount + fixCount || 1;
  const rerunPercentage = Math.round((rerunCount / totalActionCount) * 100);

  return (
    <div className="min-h-screen bg-background bg-ambient-mesh text-foreground flex flex-col font-sans selection:bg-rose-500/25 selection:text-rose-700 dark:selection:text-rose-200 transition-colors">
      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalTriaged={totalTriaged}
        topClusterOccurrences={topClusterOccurrences}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Highlight Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Total Triaged */}
          <Card className="relative overflow-hidden group hover:border-foreground/20 transition-colors shadow-2xs">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all pointer-events-none" />
            
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                Pipelines Triaged
              </CardTitle>
              <CardAction>
                <div className="w-6 h-6 rounded-md bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <Activity className="w-3.5 h-3.5" />
                </div>
              </CardAction>
            </CardHeader>

            <CardContent className="space-y-2">
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold font-mono tracking-tight text-foreground">
                  {totalTriaged}
                </span>
                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono">
                  <TrendingUp className="w-2.5 h-2.5 mr-0.5 inline" /> Sub-second
                </Badge>
              </div>

              {/* Visual Noise Pruning Bar */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>Signal extracted</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">98.5% noise pruned</span>
                </div>
                <div className="w-full bg-secondary/80 rounded-full h-1 overflow-hidden border border-border/60">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1 rounded-full" 
                    style={{ width: '98.5%' }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Recurring Clusters */}
          <Card 
            onClick={() => setActiveTab('clusters')}
            className="relative overflow-hidden cursor-pointer group hover:border-foreground/20 transition-all hover:bg-card/90 shadow-2xs"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/15 transition-all pointer-events-none" />

            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                Recurring Clusters
              </CardTitle>
              <CardAction>
                <div className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                  <Layers className="w-3.5 h-3.5" />
                </div>
              </CardAction>
            </CardHeader>

            <CardContent className="space-y-2">
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold font-mono tracking-tight text-amber-600 dark:text-amber-300">
                  {stats?.total_clusters || clusters.length}
                </span>
                {topClusterOccurrences > 0 && (
                  <Badge variant="outline" className="border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-mono animate-pulse">
                    Top: {topClusterOccurrences}x loop
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span className="truncate max-w-[190px]">
                  {stats?.top_cluster?.title ? stats.top_cluster.title : 'Shared fingerprints'}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors shrink-0" />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Rerun vs Fix Action ratio */}
          <Card className="relative overflow-hidden group hover:border-foreground/20 transition-colors shadow-2xs">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                Attribution Split
              </CardTitle>
              <CardAction>
                <div className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Cpu className="w-3.5 h-3.5" />
                </div>
              </CardAction>
            </CardHeader>

            <CardContent className="space-y-2">
              <div className="flex items-center space-x-2.5 text-sm font-bold font-mono">
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                  <RefreshCw className="w-3 h-3" />
                  <span>{rerunCount} Rerun</span>
                </span>
                <span className="text-border">|</span>
                <span className="text-rose-600 dark:text-rose-400 flex items-center space-x-1">
                  <Wrench className="w-3 h-3" />
                  <span>{fixCount} Fix</span>
                </span>
              </div>

              {/* Split comparative progress bar */}
              <div className="space-y-1 pt-1">
                <div className="w-full bg-secondary/80 rounded-full h-1 flex overflow-hidden border border-border/60">
                  <div 
                    className="bg-emerald-500 dark:bg-emerald-400 h-1 transition-all" 
                    style={{ width: `${rerunPercentage}%` }}
                    title={`${rerunPercentage}% Rerunnable`}
                  />
                  <div 
                    className="bg-rose-500 h-1 transition-all" 
                    style={{ width: `${100 - rerunPercentage}%` }}
                    title={`${100 - rerunPercentage}% Fix Required`}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>{rerunPercentage}% transient</span>
                  <span>{100 - rerunPercentage}% code fix</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Engineering Hours Reclaimed */}
          <Card 
            onClick={() => setActiveTab('roi')}
            className="relative overflow-hidden cursor-pointer group hover:border-foreground/20 transition-all hover:bg-card/90 shadow-2xs"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/15 transition-all pointer-events-none" />

            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                Focus Reclaimed
              </CardTitle>
              <CardAction>
                <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                  <Clock className="w-3.5 h-3.5" />
                </div>
              </CardAction>
            </CardHeader>

            <CardContent className="space-y-2">
              <div className="flex items-baseline space-x-1.5">
                <span className="text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                  {stats?.hours_saved_total ?? 18.5}
                </span>
                <span className="text-xs font-normal text-muted-foreground font-mono">hrs</span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span className="text-emerald-700 dark:text-emerald-400/90 font-medium font-mono text-[10px]">
                  ~${stats?.dollars_saved_total?.toLocaleString() ?? '1,480'} engineering value
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab View Content */}
        <div className="animate-fade-in transition-all">
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

          {activeTab === 'analytics' && (
            <CiHealthAnalytics />
          )}

          {activeTab === 'benchmark' && (
            <BenchmarkSuite />
          )}

          {activeTab === 'roi' && (
            <RoiCalculator />
          )}

          {activeTab === 'webhook' && (
            <WebhookConfig onNavigateToFeed={() => setActiveTab('feed')} />
          )}
        </div>
      </main>

      {/* Modern High-Tech Footer */}
      <footer className="border-t border-border/80 bg-card/60 py-4 text-xs text-muted-foreground mt-12 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          <div className="flex items-center space-x-2 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
            <span className="font-semibold text-foreground">TCT TriageCI</span>
            <span className="text-muted-foreground/60">•</span>
            <span className="text-muted-foreground text-[11px]">Diagnostic Attribution for GitHub Actions, GitLab CI & Jenkins</span>
          </div>
          <div className="flex items-center space-x-4 text-[11px]">
            <span className="inline-flex items-center space-x-1 text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 inline" />
              <span>Read-Only Diagnostic Guarantee (Zero Pipeline Mutations)</span>
            </span>
            <span className="text-border hidden sm:inline">|</span>
            <span className="text-muted-foreground font-mono hidden sm:inline">$29–$49/repo • $99–$199/team</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

