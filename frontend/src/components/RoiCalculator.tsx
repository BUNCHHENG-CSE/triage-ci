import React, { useState } from 'react';
import { DollarSign, Clock, Users, TrendingUp, Sparkles, Check, ArrowRight } from 'lucide-react';

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

  // Selected Plan: Team Pro ($99/mo) or Team Scale ($199/mo)
  const recommendedPlanCost = teamSize <= 20 ? 99 : 199;
  const netMonthlyRoi = dollarsSavedMonthly > 0 
    ? Math.round(((dollarsSavedMonthly - recommendedPlanCost) / recommendedPlanCost) * 100) 
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center space-x-2 text-rose-400 font-bold text-xs uppercase tracking-wider mb-1">
          <DollarSign className="w-4 h-4" />
          <span>Value & Pricing Model</span>
        </div>
        <h2 className="text-xl font-bold text-white">
          Engineering Hours Saved & ROI Calculator
        </h2>
        <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
          Anchored to engineering attention saved per week. Instead of 5–50 developers sifting through thousands of lines of Gradle dependency trees, ECS JSON dumps, or flaky timeouts, TriageCI delivers the exact root-cause attribution instantly.
        </p>
      </div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sliders Input Panel (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3">
            Team Parameters (5–50 Person Teams)
          </h3>

          {/* Slider 1: Team Size */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium flex items-center space-x-1.5">
                <Users className="w-4 h-4 text-rose-400" />
                <span>Engineering Team Size</span>
              </span>
              <span className="font-mono font-bold text-white bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                {teamSize} engineers
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={50}
              step={1}
              value={teamSize}
              onChange={(e) => setTeamSize(Number(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>5 engineers</span>
              <span>25 engineers</span>
              <span>50 engineers</span>
            </div>
          </div>

          {/* Slider 2: Failed Pipelines per day */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium flex items-center space-x-1.5">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <span>Failed Pipeline Runs per Day</span>
              </span>
              <span className="font-mono font-bold text-white bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                {failedBuildsPerDay} failed runs/day
              </span>
            </div>
            <input
              type="range"
              min={2}
              max={40}
              step={1}
              value={failedBuildsPerDay}
              onChange={(e) => setFailedBuildsPerDay(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>2/day</span>
              <span>20/day</span>
              <span>40/day</span>
            </div>
          </div>

          {/* Slider 3: Minutes spent investigating */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-rose-400" />
                <span>Avg. Manual Triage Time per Failure</span>
              </span>
              <span className="font-mono font-bold text-white bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                {minsPerInvestigation} minutes
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={45}
              step={5}
              value={minsPerInvestigation}
              onChange={(e) => setMinsPerInvestigation(Number(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>10 mins</span>
              <span>25 mins</span>
              <span>45 mins</span>
            </div>
          </div>

          {/* Slider 4: Hourly Rate */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium flex items-center space-x-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Avg. Engineering Hourly Cost</span>
              </span>
              <span className="font-mono font-bold text-white bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                ${hourlyRate}/hour
              </span>
            </div>
            <input
              type="range"
              min={50}
              max={150}
              step={5}
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>$50/hr</span>
              <span>$100/hr</span>
              <span>$150/hr</span>
            </div>
          </div>
        </div>

        {/* Right Output Panel: Calculations & Plan Anchor (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Savings Metric Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/30 border border-rose-500/30 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="text-xs font-bold text-rose-400 uppercase tracking-wider">
              Calculated Value Saved
            </div>

            <div className="space-y-1">
              <div className="text-4xl font-extrabold text-white font-mono">
                ${dollarsSavedMonthly.toLocaleString()}
                <span className="text-sm font-normal text-slate-400"> / month</span>
              </div>
              <p className="text-xs text-slate-300">
                Net value of reclaimed engineering focus and avoided context switching.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                <span className="text-[11px] text-slate-400 block">Hours Saved / Week</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  {hoursSavedPerWeek} hrs
                </span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                <span className="text-[11px] text-slate-400 block">Hours Saved / Month</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  {hoursSavedPerMonth} hrs
                </span>
              </div>
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-rose-300">
                <span>Estimated Monthly ROI:</span>
                <strong className="text-base text-white font-mono">+{netMonthlyRoi.toLocaleString()}%</strong>
              </div>
            </div>
          </div>

          {/* Pricing Tiers Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Anchored Pricing Tiers
            </h4>

            <div className="space-y-2 text-xs">
              <div className={`p-3 rounded-xl border transition-all ${
                teamSize <= 10 ? 'bg-slate-950 border-rose-500/40 shadow-sm' : 'border-slate-800'
              }`}>
                <div className="flex justify-between items-center font-semibold text-white">
                  <span>Per-Repo Starter</span>
                  <span className="font-mono text-rose-400">$29–49 / mo</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Single core repository, unlimited failures triaged.
                </p>
              </div>

              <div className={`p-3 rounded-xl border transition-all ${
                teamSize > 10 && teamSize <= 25 ? 'bg-slate-950 border-rose-500/40 shadow-sm' : 'border-slate-800'
              }`}>
                <div className="flex justify-between items-center font-semibold text-white">
                  <span>Team Pro (Most Popular)</span>
                  <span className="font-mono text-rose-400">$99 / mo</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Teams of 5–25 engineers, multi-repo clustering, Slack & PR alerts.
                </p>
              </div>

              <div className={`p-3 rounded-xl border transition-all ${
                teamSize > 25 ? 'bg-slate-950 border-rose-500/40 shadow-sm' : 'border-slate-800'
              }`}>
                <div className="flex justify-between items-center font-semibold text-white">
                  <span>Team Scale</span>
                  <span className="font-mono text-rose-400">$199 / mo</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Teams of 25–50 engineers, custom pattern catalogs, priority ingestion.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
