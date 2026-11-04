'use client';

import { useState, useMemo } from 'react';
import { Copy, Check, Terminal, Search, AlertCircle, Sparkles } from 'lucide-react';
import type { ExcerptLine } from '../types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface LogViewerProps {
  excerptLines: ExcerptLine[];
  extractedExcerptText: string;
  totalRawLines: number;
  reductionPercentage: number;
  failingStep: string;
}

export const LogViewer: React.FC<LogViewerProps> = ({
  excerptLines,
  extractedExcerptText,
  totalRawLines,
  reductionPercentage,
  failingStep
}) => {
  const [copied, setCopied] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const handleCopy = () => {
    navigator.clipboard.writeText(extractedExcerptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredLines = useMemo(() => {
    if (!searchFilter.trim()) return excerptLines;
    const q = searchFilter.toLowerCase();
    return excerptLines.filter(line => 
      line.content.toLowerCase().includes(q) || 
      line.line_number.toString().includes(q)
    );
  }, [excerptLines, searchFilter]);

  const errorLineCount = excerptLines.filter(l => 
    l.is_anchor || 
    l.content.toLowerCase().includes('error') || 
    l.content.toLowerCase().includes('fail') || 
    l.content.toLowerCase().includes('exit code')
  ).length;

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden shadow-xs transition-all">
      {/* Terminal Window Header Bar */}
      <div className="bg-muted/40 px-3.5 py-2 border-b border-border/70 flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Window Dots & Step Context */}
        <div className="flex items-center space-x-2.5">
          <div className="flex space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <div className="h-3.5 w-px bg-border" />
          <div className="flex items-center space-x-1.5 font-mono text-xs">
            <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground font-medium">
              Evidence: <span className="text-rose-600 dark:text-rose-400 font-semibold">{failingStep || 'CI Step'}</span>
            </span>
          </div>
        </div>

        {/* Right: Pruning Ratio & Search & Copy */}
        <div className="flex items-center space-x-2">
          {/* Signal / Noise Pruning Metric */}
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono text-[10px] gap-1 py-0.5">
            <Sparkles className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
            <span><strong>{reductionPercentage}%</strong> pruned</span>
            <span className="text-muted-foreground hidden sm:inline">
              ({totalRawLines.toLocaleString()} → {excerptLines.length})
            </span>
          </Badge>

          {/* Quick search input */}
          <div className="relative hidden md:block">
            <Search className="w-3 h-3 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              placeholder="Filter..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-6 pr-2 py-0 h-6 text-[11px] font-mono w-28 focus:w-36 transition-all"
            />
          </div>

          {/* Copy Button */}
          <Button
            variant="outline"
            size="xs"
            onClick={handleCopy}
            className="gap-1 font-mono text-[11px] h-6"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-muted-foreground" />
                <span>Copy</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Terminal Code Viewer Body */}
      <div className="p-2 font-mono text-xs overflow-x-auto max-h-[360px] scrollbar-thin bg-background/95">
        {filteredLines.length > 0 ? (
          <table className="w-full border-collapse">
            <tbody>
              {filteredLines.map((line, idx) => {
                const isErrorLine = line.is_anchor || 
                  line.content.toLowerCase().includes('error') || 
                  line.content.toLowerCase().includes('fail') || 
                  line.content.toLowerCase().includes('expired') || 
                  line.content.toLowerCase().includes('exit code') ||
                  line.content.toLowerCase().includes('killed');

                const isWarningLine = !isErrorLine && (
                  line.content.toLowerCase().includes('warn') ||
                  line.content.toLowerCase().includes('deprecat')
                );

                return (
                  <tr
                    key={idx}
                    className={`transition-colors group ${
                      isErrorLine
                        ? 'bg-rose-500/10 border-l-2 border-rose-500 text-rose-800 dark:text-rose-300 font-medium'
                        : isWarningLine
                        ? 'bg-amber-500/10 border-l-2 border-amber-500/70 text-amber-800 dark:text-amber-300'
                        : 'hover:bg-muted/40 text-foreground/80 dark:text-muted-foreground hover:text-foreground border-l-2 border-transparent'
                    }`}
                  >
                    {/* Line number gutter */}
                    <td className="py-0.5 px-2.5 select-none text-right text-muted-foreground/70 font-mono text-[11px] w-12 border-r border-border/50 group-hover:text-muted-foreground">
                      {line.line_number}
                    </td>

                    {/* Line content */}
                    <td className="py-0.5 px-3 whitespace-pre font-mono text-[11px] leading-relaxed">
                      {isErrorLine && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 mr-1.5 shrink-0 animate-pulse" />
                      )}
                      <span>{line.content}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="py-8 text-center text-muted-foreground font-mono text-xs">
            {searchFilter ? `No log lines matching "${searchFilter}"` : extractedExcerptText || 'No log content available'}
          </div>
        )}
      </div>

      {/* Terminal Footer Indicator */}
      <div className="bg-muted/30 px-3.5 py-1.5 border-t border-border/70 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
        <span className="flex items-center space-x-1.5">
          <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
          <span>{errorLineCount} failure anchor signature{errorLineCount === 1 ? '' : 's'} highlighted</span>
        </span>
        <span>
          ANSI formatting stripped • Secrets redacted
        </span>
      </div>
    </div>
  );
};

