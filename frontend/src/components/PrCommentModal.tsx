import React, { useState } from 'react';
import { Copy, Check, X, MessageSquare, Terminal } from 'lucide-react';

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

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-rose-400" />
            <h3 className="text-base font-semibold text-white">
              GitHub PR / Issue Comment Preview
            </h3>
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
              {jobName}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500 hover:bg-rose-600 text-white transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Markdown'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Markdown Content */}
        <div className="p-6 overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed bg-slate-950">
          <pre className="whitespace-pre-wrap selection:bg-rose-500/30">
            {markdown}
          </pre>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/40 flex items-center justify-between text-xs text-slate-400">
          <span>Automatically posted by TriageCI GitHub App or Action on failed runs</span>
          <span className="text-slate-500">Pure diagnostic report • No pipeline modifications</span>
        </div>
      </div>
    </div>
  );
};
