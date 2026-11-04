'use client';

import { useState } from 'react';
import { Copy, Check, X, MessageSquare, Eye, Code, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PrCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  markdown: string;
  jobName: string;
}

export const PrCommentModal: React.FC<PrCommentModalProps> = ({
  isOpen,
  onClose,
  markdown,
  jobName,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeView, setActiveView] = useState<'preview' | 'raw'>('preview');

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
      <div className="bg-card border border-border rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Modal Header */}
        <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-muted/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-md bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xs font-semibold text-foreground font-mono">
                  GitHub PR / Issue Comment Preview
                </h3>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {jobName || 'CI Failure Report'}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Posted automatically by TCT TriageCI GitHub App on pipeline failure
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* View Switcher: Rendered vs Raw */}
            <div className="flex bg-muted rounded-md p-0.5 text-xs">
              <Button
                variant={activeView === 'preview' ? 'secondary' : 'ghost'}
                size="xs"
                onClick={() => setActiveView('preview')}
                className="gap-1 cursor-pointer"
              >
                <Eye className="w-3 h-3" />
                <span>PR Preview</span>
              </Button>
              <Button
                variant={activeView === 'raw' ? 'secondary' : 'ghost'}
                size="xs"
                onClick={() => setActiveView('raw')}
                className="gap-1 cursor-pointer"
              >
                <Code className="w-3 h-3" />
                <span>Raw Markdown</span>
              </Button>
            </div>

            <Button
              size="xs"
              onClick={handleCopy}
              className="bg-rose-500 hover:bg-rose-600 text-white gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </Button>

            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Content View */}
        <div className="p-5 overflow-y-auto flex-1 bg-background/50">
          {activeView === 'preview' ? (
            /* Rendered GitHub PR Comment Style Box */
            <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
              {/* GitHub Comment Header */}
              <div className="px-3.5 py-2 bg-muted/50 border-b border-border flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-secondary border border-border flex items-center justify-center text-foreground">
                    <Bot className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400" />
                  </div>
                  <span className="font-semibold text-foreground font-mono text-xs">tct-triage-ci[bot]</span>
                  <span className="text-muted-foreground text-[11px]">commented just now</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono h-4 px-1.5">
                  bot
                </Badge>
              </div>

              {/* Rendered Body */}
              <div className="p-4 space-y-3 text-xs text-foreground leading-relaxed font-sans">
                <div className="pb-2.5 border-b border-border">
                  <h4 className="text-xs font-semibold text-foreground flex items-center space-x-1.5 font-mono">
                    <span className="text-rose-600 dark:text-rose-400">⚡</span>
                    <span>TCT TriageCI — Failure Attribution Report</span>
                  </h4>
                  <p className="text-muted-foreground text-[10px] mt-0.5 font-mono">
                    Noise pruned by ~98.5% • Read-only diagnostic analysis
                  </p>
                </div>

                <div className="space-y-2 font-mono text-[11px]">
                  <pre className="p-3 rounded-md bg-secondary/40 border border-border text-foreground whitespace-pre-wrap leading-relaxed overflow-x-auto">
                    {markdown}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            /* Raw Markdown View */
            <div className="p-3.5 rounded-md bg-secondary/30 border border-border font-mono text-xs text-foreground leading-relaxed">
              <pre className="whitespace-pre-wrap selection:bg-rose-500/30">
                {markdown}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-2.5 border-t border-border bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Direct integration: GitHub Actions, GitLab CI Webhooks, Jenkins</span>
          <span className="font-mono">Zero mutation: read-only webhook ingestion</span>
        </div>
      </div>
    </div>
  );
};

