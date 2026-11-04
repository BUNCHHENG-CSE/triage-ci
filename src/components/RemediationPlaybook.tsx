'use client';

import { useState } from 'react';
import { 
  Terminal, 
  Copy, 
  Check, 
  Download, 
  Wrench, 
  FileCode2, 
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface RemediationPlaybookProps {
  commands?: string[];
  patchDiff?: string | null;
  actionType: 'RERUN' | 'FIX' | string;
  failingStep: string;
  defaultOpen?: boolean;
}

export const RemediationPlaybook: React.FC<RemediationPlaybookProps> = ({
  commands = [],
  patchDiff,
  actionType,
  failingStep,
  defaultOpen = false
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedPatch, setCopiedPatch] = useState(false);

  const hasCommands = commands && commands.length > 0;
  const hasPatch = Boolean(patchDiff && patchDiff.trim());

  if (!hasCommands && !hasPatch) {
    return null;
  }

  const handleCopyCommands = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cmdText = commands.join('\n');
    navigator.clipboard.writeText(cmdText);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleCopyPatch = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (patchDiff) {
      navigator.clipboard.writeText(patchDiff);
      setCopiedPatch(true);
      setTimeout(() => setCopiedPatch(false), 2000);
    }
  };

  const handleDownloadScript = (e: React.MouseEvent) => {
    e.stopPropagation();
    const scriptHeader = `#!/usr/bin/env bash\n# ========================================================\n# TCT TriageCI Auto-Remediation Script\n# Target Step: ${failingStep}\n# Action Recommendation: ${actionType}\n# ========================================================\nset -e\n\necho "🔧 Executing TCT TriageCI remediation steps..."\n`;
    const scriptBody = commands.map(cmd => `echo ">> ${cmd}"\n${cmd}`).join('\n\n');
    const fullScript = `${scriptHeader}\n${scriptBody}\n\necho "✅ Remediation sequence completed!"\n`;

    const blob = new Blob([fullScript], { type: 'text/x-shellscript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tct-triageci-fix-${failingStep.toLowerCase().replace(/[^a-z0-9]/g, '-')}.sh`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-3 rounded-lg border border-border/80 bg-background/80 overflow-hidden shadow-2xs transition-all">
      {/* Header bar / toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Wrench className="w-3 h-3" />
          </div>
          <span className="text-xs font-semibold text-foreground tracking-tight">
            One-Click Fix Playbook
          </span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-muted-foreground border-border">
            {actionType === 'RERUN' ? 'Rerun Command' : 'Fix Command & Patch'}
          </Badge>
        </div>

        <div className="flex items-center space-x-2 text-muted-foreground">
          <span className="text-[11px] font-mono hidden sm:inline">
            {isOpen ? 'Collapse' : 'View CLI commands & diff'}
          </span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* Expandable Content */}
      {isOpen && (
        <div className="p-3.5 space-y-3 border-t border-border/60 bg-card/40">
          {/* CLI Commands Section */}
          {hasCommands && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-foreground flex items-center space-x-1.5">
                  <Terminal className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Terminal Reproduction & Fix Command:</span>
                </span>
                <div className="flex items-center space-x-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDownloadScript}
                    className="h-6 px-2 text-[10px] font-mono text-muted-foreground hover:text-foreground"
                    title="Download bash script"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    .sh Script
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyCommands}
                    className="h-6 px-2 text-[10px] font-mono border-border"
                  >
                    {copiedCmd ? (
                      <>
                        <Check className="w-3 h-3 mr-1 text-emerald-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1" />
                        Copy Command
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-zinc-950 dark:bg-black rounded-md p-2.5 font-mono text-xs text-emerald-400 dark:text-emerald-300 border border-border/80 overflow-x-auto selection:bg-emerald-900/50">
                {commands.map((cmd, idx) => (
                  <div key={idx} className="flex items-start space-x-2">
                    <span className="text-zinc-500 select-none">$</span>
                    <span className="whitespace-pre-wrap">{cmd}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Configuration Patch Diff Section */}
          {hasPatch && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-foreground flex items-center space-x-1.5">
                  <FileCode2 className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                  <span>CI Workflow / Configuration Patch Diff:</span>
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyPatch}
                  className="h-6 px-2 text-[10px] font-mono border-border"
                >
                  {copiedPatch ? (
                    <>
                      <Check className="w-3 h-3 mr-1 text-emerald-500" />
                      Copied Patch!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 mr-1" />
                      Copy Diff
                    </>
                  )}
                </Button>
              </div>

              <pre className="bg-zinc-950 dark:bg-black rounded-md p-2.5 font-mono text-[11px] leading-relaxed border border-border/80 overflow-x-auto">
                {patchDiff?.split('\n').map((line, idx) => {
                  let lineClass = 'text-zinc-300';
                  if (line.startsWith('+')) lineClass = 'text-emerald-400 bg-emerald-950/30 -mx-2.5 px-2.5 block';
                  else if (line.startsWith('-')) lineClass = 'text-rose-400 bg-rose-950/30 -mx-2.5 px-2.5 block';
                  else if (line.startsWith('#') || line.startsWith('//')) lineClass = 'text-zinc-500 italic';
                  return (
                    <span key={idx} className={lineClass}>
                      {line}
                      {'\n'}
                    </span>
                  );
                })}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
