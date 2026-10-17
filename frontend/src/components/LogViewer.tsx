import React, { useState } from 'react';
import { Copy, Check, Filter, Code2, AlertTriangle, ChevronRight } from 'lucide-react';
import type { ExcerptLine } from '../types';

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
  const [viewMode, setViewMode] = useState<'excerpt' | 'raw'>('excerpt');

  const handleCopy = () => {
    navigator.clipboard.writeText(extractedExcerptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      {/* Top Banner with Noise Reduction metric */}
      <div className="bg-gradient-to-r from-rose-950/40 via-purple-950/20 to-slate-900 px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
          <span className="text-xs font-semibold text-rose-300">
            Failing Step: <span className="text-white font-mono">{failingStep}</span>
          </span>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300">
            <Filter className="w-3.5 h-3.5 text-rose-400" />
            <span>
              Noise pruned: <strong className="text-emerald-400">{reductionPercentage}%</strong>
            </span>
            <span className="text-slate-500">
              ({totalRawLines.toLocaleString()} → {excerptLines.length} lines)
            </span>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Excerpt'}</span>
          </button>
        </div>
      </div>

      {/* Code window */}
      <div className="p-3 bg-slate-950 font-mono text-xs overflow-x-auto max-h-96 scrollbar-thin">
        {excerptLines.length > 0 ? (
          <table className="w-full border-collapse">
            <tbody>
              {excerptLines.map((line, idx) => {
                const isErrorLine = line.is_anchor || 
                  line.content.toLowerCase().includes('error') || 
                  line.content.toLowerCase().includes('fail') || 
                  line.content.toLowerCase().includes('expired') || 
                  line.content.toLowerCase().includes('killed');

                return (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      isErrorLine
                        ? 'bg-rose-500/15 border-l-2 border-rose-500 text-rose-200'
                        : 'hover:bg-slate-900/50 text-slate-300'
                    }`}
                  >
                    <td className="py-0.5 px-3 select-none text-right text-slate-600 font-mono text-[11px] w-12 border-r border-slate-800/60">
                      {line.line_number}
                    </td>
                    <td className="py-0.5 px-4 whitespace-pre font-mono leading-relaxed">
                      {line.content}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <pre className="text-slate-300 leading-relaxed whitespace-pre-wrap">
            {extractedExcerptText}
          </pre>
        )}
      </div>
    </div>
  );
};
