import { useState, useEffect } from 'react';
import { 
  Terminal, 
  Layers, 
  CheckCircle2, 
  DollarSign, 
  Webhook, 
  Activity,
  Flame,
  Zap,
  Sun,
  Moon,
  TrendingUp
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('triageci-theme');
      if (saved === 'light' || saved === 'dark') {
        return saved === 'dark';
      }
      return document.documentElement.classList.contains('dark');
    }
    return true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('triageci-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('triageci-theme', 'light');
    }
  }, [isDark]);

  const navItems = [
    { 
      id: 'feed', 
      label: 'Triage Feed', 
      icon: Activity, 
      badge: totalTriaged > 0 ? totalTriaged : null 
    },
    { 
      id: 'clusters', 
      label: 'Recurring Clusters', 
      icon: Layers, 
      badge: topClusterOccurrences > 0 ? `${topClusterOccurrences}x` : null, 
      alert: true 
    },
    { 
      id: 'studio', 
      label: 'Triage Studio', 
      icon: Terminal,
      pill: 'Interactive'
    },
    {
      id: 'analytics',
      label: 'CI Health & Flakiness',
      icon: TrendingUp,
      pill: 'Telemetry'
    },
    { 
      id: 'benchmark', 
      label: '20-Log Benchmark', 
      icon: CheckCircle2, 
      pill: 'Ready to Sell' 
    },
    { 
      id: 'roi', 
      label: 'ROI & Pricing', 
      icon: DollarSign 
    },
    { 
      id: 'webhook', 
      label: 'CI Webhooks', 
      icon: Webhook 
    }
  ];

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border shadow-xs dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Navbar Row */}
        <div className="flex items-center justify-between h-14">
          {/* Logo & Identity */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group select-none"
            onClick={() => setActiveTab('feed')}
          >
            <div className="relative">
              <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-rose-500 to-amber-500 opacity-60 blur-xs group-hover:opacity-100 transition duration-300"></div>
              <div className="relative w-8 h-8 rounded-lg bg-card flex items-center justify-center ring-1 ring-border text-foreground shadow-xs">
                <Flame className="w-4 h-4 text-rose-600 dark:text-rose-500" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold tracking-tight text-foreground font-mono flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[11px] font-extrabold tracking-widest leading-none">
                    TCT
                  </span>
                  <span>
                    Triage<span className="text-rose-600 dark:text-rose-500">CI</span>
                  </span>
                </span>
                <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider h-4.5 px-1.5 border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10 dark:bg-rose-500/5">
                  Diagnosis Only
                </Badge>
                <span className="text-[10px] font-mono text-muted-foreground hidden md:inline-block">
                  v1.4
                </span>
              </div>
              <p className="text-[10.5px] text-muted-foreground hidden sm:block font-mono">
                Sub-second failure attribution & noise pruning for engineering teams
              </p>
            </div>
          </div>

          {/* System status beacon, Quick Triage & Theme Toggle */}
          <div className="flex items-center space-x-2">
            <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded-md bg-muted/60 border border-border text-xs font-mono">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span className="text-foreground/80 text-[11px]">Attribution Engine</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">ACTIVE</span>
              <span className="text-border">|</span>
              <span className="text-muted-foreground text-[10px]">GitHub & GitLab CI Ready</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('studio')}
              className="font-mono text-xs border-border hover:bg-muted text-foreground cursor-pointer h-7"
            >
              <Zap className="w-3.5 h-3.5 text-rose-600 dark:text-rose-500" />
              <span className="hidden sm:inline">Quick Triage Log</span>
              <span className="sm:hidden">Triage</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDark(!isDark)}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="font-mono text-xs border-border hover:bg-muted text-foreground cursor-pointer h-7 px-2 gap-1.5"
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden md:inline text-[11px]">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-700" />
                  <span className="hidden md:inline text-[11px]">Dark</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Tab navigation pills */}
        <div className="flex space-x-1 overflow-x-auto py-1.5 scrollbar-none border-t border-border/60">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`group flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium font-mono transition-all duration-150 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-secondary text-foreground ring-1 ring-border shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 transition-colors ${
                  isActive ? 'text-rose-600 dark:text-rose-500' : 'text-muted-foreground group-hover:text-foreground'
                }`} />
                <span>{item.label}</span>
                {item.badge && (
                  <Badge 
                    variant={item.alert ? "destructive" : "secondary"}
                    className={`text-[9px] px-1 py-0 h-4 font-mono ${
                      item.alert ? 'bg-amber-500 text-slate-950 font-bold' : ''
                    }`}
                  >
                    {item.badge}
                  </Badge>
                )}
                {item.pill && (
                  <Badge 
                    variant="outline" 
                    className="text-[8px] uppercase tracking-wider px-1 py-0 h-4 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
                  >
                    {item.pill}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};


