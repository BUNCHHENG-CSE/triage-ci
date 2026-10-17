import React from 'react';
import { 
  Terminal, 
  Layers, 
  Cpu, 
  CheckCircle2, 
  DollarSign, 
  Webhook, 
  Activity,
  Flame
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  totalTriaged: number;
  topClusterOccurrences: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  totalTriaged,
  topClusterOccurrences
}) => {
  const navItems = [
    { id: 'feed', label: 'Triage Feed', icon: Activity, badge: totalTriaged > 0 ? totalTriaged : null },
    { id: 'clusters', label: 'Recurring Clusters', icon: Layers, badge: topClusterOccurrences > 0 ? `${topClusterOccurrences}x` : null, alert: true },
    { id: 'studio', label: 'Triage Studio', icon: Terminal },
    { id: 'benchmark', label: '20-Log Benchmark', icon: CheckCircle2, pill: 'Ready to Sell' },
    { id: 'roi', label: 'ROI & Pricing', icon: DollarSign },
    { id: 'webhook', label: 'CI Webhooks', icon: Webhook }
  ];

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Branding */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('feed')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 via-orange-500 to-amber-400 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-white font-mono">Triage<span className="text-rose-400">CI</span></span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  Diagnosis Only
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Noise-pruned failure attribution for 5–50 dev teams
              </p>
            </div>
          </div>

          {/* System status pill */}
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Attribution Engine Live</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300">GitHub Actions Webhook Ready</span>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className={`text-xs px-1.5 py-0.2 rounded-full ${
                    item.alert 
                      ? 'bg-amber-400 text-slate-950 font-bold' 
                      : isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
                {item.pill && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {item.pill}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
