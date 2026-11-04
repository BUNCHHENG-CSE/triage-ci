'use client';

import { useState } from 'react';
import { DollarSign, Clock, Users, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const RoiCalculator: React.FC = () => {
  // Configurable sliders
  const [teamSize, setTeamSize] = useState(15); // 5 to 50 engineers
  const [failedBuildsPerDay, setFailedBuildsPerDay] = useState(10); // 2 to 40
  const [minsPerInvestigation, setMinsPerInvestigation] = useState(20); // 10 to 45 mins
  const [hourlyRate, setHourlyRate] = useState(85); // $50 to $150

  // Calculations
  const workingDaysPerMonth = 22;
  const totalFailuresPerMonth = failedBuildsPerDay * workingDaysPerMonth;
  
  // TriageCI cuts investigation time from 20 mins down to 2 mins (~90% time saved)
  const minsSavedPerFailure = Math.max(5, minsPerInvestigation - 2);
  const totalMinsSavedMonthly = totalFailuresPerMonth * minsSavedPerFailure;
  const hoursSavedPerMonth = Math.round((totalMinsSavedMonthly / 60) * 10) / 10;
  const hoursSavedPerWeek = Math.round((hoursSavedPerMonth / 4.33) * 10) / 10;
  
  const dollarsSavedMonthly = Math.round(hoursSavedPerMonth * hourlyRate);

  // Selected Plan: Team Pro ($99/mo) or Team Scale ($199/mo) or Starter ($29/mo)
  const recommendedPlanCost = teamSize <= 8 ? 49 : teamSize <= 25 ? 99 : 199;
  const netMonthlyRoi = dollarsSavedMonthly > 0 
    ? Math.round(((dollarsSavedMonthly - recommendedPlanCost) / recommendedPlanCost) * 100) 
    : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4 space-y-2 border-border/80 bg-card/80 shadow-2xs">
        <div className="flex items-center space-x-1.5 font-mono">
          <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono text-[10px] gap-1 py-0.5">
            <DollarSign className="w-3 h-3" />
            <span>Value & Pricing Model</span>
          </Badge>
        </div>
        <h2 className="text-base font-bold text-foreground tracking-tight font-mono">
          Engineering Hours Saved & ROI Calculator
        </h2>
        <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
          Anchored to engineering attention saved per week. Instead of 5–50 developers sifting through thousands of lines of Gradle dependency trees, ECS JSON dumps, or flaky timeouts, TCT TriageCI delivers the exact root-cause attribution instantly.
        </p>
      </Card>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Sliders Input Panel (7 cols) */}
        <Card className="lg:col-span-7 p-4 space-y-4 border-border/80 bg-card/80 shadow-2xs">
          <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">
              Team Parameters (5–50 Person Teams)
            </h3>
            <span className="text-[10px] text-muted-foreground font-mono">Real-time dynamic ROI</span>
          </div>

          {/* Slider 1: Team Size */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-foreground font-medium flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Engineering Team Size</span>
              </span>
              <Badge variant="outline" className="font-mono font-bold text-foreground text-xs">
                {teamSize} developers
              </Badge>
            </div>
            <input
              type="range"
              min={5}
              max={50}
              step={1}
              value={teamSize}
              onChange={(e) => setTeamSize(Number(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer h-1.5 bg-secondary rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>5 devs (Starter)</span>
              <span>25 devs (Team Pro)</span>
              <span>50 devs (Team Scale)</span>
            </div>
          </div>

          {/* Slider 2: Failed Pipelines per day */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-foreground font-medium flex items-center space-x-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Failed Pipeline Runs per Day</span>
              </span>
              <Badge variant="outline" className="font-mono font-bold text-foreground text-xs">
                {failedBuildsPerDay} failed runs/day
              </Badge>
            </div>
            <input
              type="range"
              min={2}
              max={40}
              step={1}
              value={failedBuildsPerDay}
              onChange={(e) => setFailedBuildsPerDay(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-secondary rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>2 / day</span>
              <span>20 / day</span>
              <span>40 / day</span>
            </div>
          </div>

          {/* Slider 3: Minutes spent investigating */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-foreground font-medium flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Avg. Manual Triage Time per Failure</span>
              </span>
              <Badge variant="outline" className="font-mono font-bold text-foreground text-xs">
                {minsPerInvestigation} minutes
              </Badge>
            </div>
            <input
              type="range"
              min={10}
              max={45}
              step={5}
              value={minsPerInvestigation}
              onChange={(e) => setMinsPerInvestigation(Number(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer h-1.5 bg-secondary rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>10 mins (Light)</span>
              <span>25 mins (Avg)</span>
              <span>45 mins (Complex)</span>
            </div>
          </div>

          {/* Slider 4: Hourly Rate */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-foreground font-medium flex items-center space-x-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Avg. Engineering Hourly Cost</span>
              </span>
              <Badge variant="outline" className="font-mono font-bold text-foreground text-xs">
                ${hourlyRate} / hour
              </Badge>
            </div>
            <input
              type="range"
              min={50}
              max={150}
              step={5}
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-secondary rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>$50/hr</span>
              <span>$100/hr</span>
              <span>$150/hr</span>
            </div>
          </div>

          {/* Before vs After comparison pill */}
          <div className="p-3 rounded-lg bg-muted/20 border border-border/80 space-y-1.5 text-xs">
            <div className="font-semibold text-foreground text-xs font-mono">Triage Velocity Impact:</div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2 rounded-md bg-rose-500/5 border border-rose-500/20 text-rose-700 dark:text-rose-300">
                <span className="block font-bold mb-0.5">WITHOUT TCT TRIAGECI:</span>
                <span>~{minsPerInvestigation} min wading through 1,500+ line logs</span>
              </div>
              <div className="p-2 rounded-md bg-emerald-500/5 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                <span className="block font-bold mb-0.5">WITH TCT TRIAGECI:</span>
                <span>~2 mins: instant attribution & safe rerun verdict</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Right Output Panel: Calculations & Plan Anchor (5 cols) */}
        <div className="lg:col-span-5 space-y-3.5">
          {/* Savings Metric Card */}
          <Card className="p-4 space-y-3.5 border-border/80 bg-card/90 shadow-2xs relative overflow-hidden">
            <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider font-mono">
              Net Value Reclaimed Monthly
            </div>

            <div className="space-y-1">
              <div className="text-3xl font-extrabold text-foreground font-mono tracking-tight">
                ${dollarsSavedMonthly.toLocaleString()}
                <span className="text-xs font-normal text-muted-foreground font-sans"> / month</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Reclaimed engineering focus and prevented developer context-switching loops.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-border/70">
              <div className="bg-muted/30 p-2.5 rounded-lg border border-border/70">
                <span className="text-[10px] text-muted-foreground block font-mono">Hours / Week</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {hoursSavedPerWeek} hrs
                </span>
              </div>
              <div className="bg-muted/30 p-2.5 rounded-lg border border-border/70">
                <span className="text-[10px] text-muted-foreground block font-mono">Hours / Month</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {hoursSavedPerMonth} hrs
                </span>
              </div>
            </div>

            <div className="pt-0.5">
              <div className="flex items-center justify-between text-xs bg-rose-500/10 border border-rose-500/25 rounded-lg p-2.5 text-rose-800 dark:text-rose-300">
                <span>Estimated Return (ROI):</span>
                <strong className="text-base text-foreground dark:text-white font-mono font-extrabold">+{netMonthlyRoi.toLocaleString()}%</strong>
              </div>
            </div>
          </Card>

          {/* Pricing Tiers Card with Dynamic Highlight */}
          <Card className="p-4 space-y-2.5 border-border/80 bg-card/80 shadow-2xs">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">
              Transparent Commercial Plans
            </h4>

            <div className="space-y-2 text-xs">
              {/* Starter Tier */}
              <div className={`p-2.5 rounded-lg border transition-all ${
                teamSize <= 8 
                  ? 'bg-rose-500/10 border-rose-500/50 shadow-xs' 
                  : 'bg-muted/30 border-border/80 opacity-80'
              }`}>
                <div className="flex justify-between items-center font-bold text-foreground">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono text-xs">Per-Repo Starter</span>
                    {teamSize <= 8 && (
                      <Badge variant="default" className="text-[9px] px-1.5 py-0 bg-rose-500 text-white font-mono uppercase h-4">
                        Recommended
                      </Badge>
                    )}
                  </div>
                  <span className="font-mono text-rose-600 dark:text-rose-400 text-xs">$29–$49 / mo</span>
                </div>
                <p className="text-[10.5px] text-muted-foreground mt-0.5">
                  Single core repository, unlimited failure logs, sub-second noise pruning.
                </p>
              </div>

              {/* Team Pro Tier */}
              <div className={`p-2.5 rounded-lg border transition-all ${
                teamSize > 8 && teamSize <= 25 
                  ? 'bg-rose-500/10 border-rose-500/50 shadow-xs' 
                  : 'bg-muted/30 border-border/80 opacity-80'
              }`}>
                <div className="flex justify-between items-center font-bold text-foreground">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono text-xs">Team Pro (Most Popular)</span>
                    {teamSize > 8 && teamSize <= 25 && (
                      <Badge variant="default" className="text-[9px] px-1.5 py-0 bg-rose-500 text-white font-mono uppercase h-4">
                        Recommended
                      </Badge>
                    )}
                  </div>
                  <span className="font-mono text-rose-600 dark:text-rose-400 text-xs">$99 / mo</span>
                </div>
                <p className="text-[10.5px] text-muted-foreground mt-0.5">
                  Teams of 5–25 engineers, multi-repo cluster intelligence, automated PR comment bot.
                </p>
              </div>

              {/* Team Scale Tier */}
              <div className={`p-2.5 rounded-lg border transition-all ${
                teamSize > 25 
                  ? 'bg-rose-500/10 border-rose-500/50 shadow-xs' 
                  : 'bg-muted/30 border-border/80 opacity-80'
              }`}>
                <div className="flex justify-between items-center font-bold text-foreground">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono text-xs">Team Scale</span>
                    {teamSize > 25 && (
                      <Badge variant="default" className="text-[9px] px-1.5 py-0 bg-rose-500 text-white font-mono uppercase h-4">
                        Recommended
                      </Badge>
                    )}
                  </div>
                  <span className="font-mono text-rose-600 dark:text-rose-400 text-xs">$199 / mo</span>
                </div>
                <p className="text-[10.5px] text-muted-foreground mt-0.5">
                  Teams of 25–50 engineers, custom pattern catalogs, priority log ingestion webhooks.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

