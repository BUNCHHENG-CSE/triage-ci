'use client';

import { useState, useEffect } from 'react';
import { 
  Send, 
  Check, 
  AlertCircle, 
  Download, 
  Share2, 
  Copy, 
  FileText, 
  Terminal,
  ExternalLink
} from 'lucide-react';
import type { TriageResult } from '../types';
import { dispatchSlackAlert, dispatchDiscordAlert } from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: TriageResult;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  result
}) => {
  const [platform, setPlatform] = useState<'slack' | 'discord'>('slack');
  const [webhookUrl, setWebhookUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('triageci-slack-webhook') || '';
    }
    return '';
  });
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const switchPlatform = (nextPlatform: 'slack' | 'discord') => {
    setPlatform(nextPlatform);
    if (typeof window !== 'undefined') {
      const key = nextPlatform === 'slack' ? 'triageci-slack-webhook' : 'triageci-discord-webhook';
      setWebhookUrl(localStorage.getItem(key) || '');
    }
  };

  if (!isOpen) return null;

  const handleUseDemoWebhook = () => {
    if (platform === 'slack') {
      setWebhookUrl('https://hooks.slack.com/services/DUMMY/DEMO/KEY');
    } else {
      setWebhookUrl('https://discord.com/api/webhooks/dummy/demo-key');
    }
  };

  const handleSend = async () => {
    if (!webhookUrl.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a webhook URL.' });
      return;
    }

    try {
      setSending(true);
      setStatusMessage(null);

      if (platform === 'slack') {
        localStorage.setItem('triageci-slack-webhook', webhookUrl);
        const res = await dispatchSlackAlert({
          webhook_url: webhookUrl,
          triage_id: result.id,
          repo_name: result.repo_name,
          job_name: result.job_name,
          failing_step: result.exact_failing_step,
          root_cause_summary: result.root_cause_summary,
          action_type: result.action_type,
          suggested_direction: result.suggested_direction,
          cluster_occurrences: result.cluster_occurrence_count
        });
        if (res.status === 'delivered' || res.status === 'simulated_success') {
          setStatusMessage({ type: 'success', text: res.message || 'Slack notification dispatched!' });
        } else {
          setStatusMessage({ type: 'error', text: res.error || 'Failed to deliver to Slack.' });
        }
      } else {
        localStorage.setItem('triageci-discord-webhook', webhookUrl);
        const res = await dispatchDiscordAlert({
          webhook_url: webhookUrl,
          repo_name: result.repo_name,
          job_name: result.job_name,
          failing_step: result.exact_failing_step,
          root_cause_summary: result.root_cause_summary,
          action_type: result.action_type,
          suggested_direction: result.suggested_direction,
          cluster_occurrences: result.cluster_occurrence_count
        });
        if (res.status === 'delivered' || res.status === 'simulated_success') {
          setStatusMessage({ type: 'success', text: res.message || 'Discord alert dispatched!' });
        } else {
          setStatusMessage({ type: 'error', text: res.error || 'Failed to deliver to Discord.' });
        }
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to send alert.' });
    } finally {
      setSending(false);
    }
  };

  const handleDownloadMarkdown = () => {
    const md = result.pr_comment_markdown || `# Triage Report: ${result.job_name}\n\n${result.root_cause_summary}`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `triage-report-${result.id || 'export'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(result, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `triage-report-${result.id || 'export'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div 
        className="bg-card border border-border w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Dispatch Alert & Export Postmortem
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                {result.repo_name} • {result.job_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-sm font-mono px-2 py-1"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Platform Tabs */}
          <div className="flex space-x-2 border-b border-border pb-3">
            <button
              onClick={() => switchPlatform('slack')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium font-mono transition-colors flex items-center space-x-1.5 ${
                platform === 'slack'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Slack Webhook</span>
            </button>
            <button
              onClick={() => switchPlatform('discord')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium font-mono transition-colors flex items-center space-x-1.5 ${
                platform === 'discord'
                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Discord Embed</span>
            </button>
          </div>

          {/* Webhook Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">
                {platform === 'slack' ? 'Slack Incoming Webhook URL:' : 'Discord Webhook URL:'}
              </label>
              <button
                type="button"
                onClick={handleUseDemoWebhook}
                className="text-[10px] font-mono text-primary hover:underline"
              >
                Use Test Webhook
              </button>
            </div>
            <Input
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              placeholder={
                platform === 'slack' 
                  ? 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
                  : 'https://discord.com/api/webhooks/YOUR/WEBHOOK/URL'
              }
              className="text-xs font-mono h-9"
            />
          </div>

          {/* Preview Card */}
          <div className="rounded-lg border border-border p-3 bg-muted/30 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
              <span>Card Payload Preview</span>
              <Badge variant={result.action_type === 'RERUN' ? 'default' : 'destructive'} className="text-[10px] py-0">
                {result.action_type}
              </Badge>
            </div>
            <div className="text-xs font-semibold text-foreground">
              CI Failure: {result.repo_name} / {result.job_name}
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Root Cause: </span>
              {result.root_cause_summary}
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Suggested Fix: </span>
              {result.suggested_direction}
            </div>
            {result.cluster_occurrence_count > 1 && (
              <div className="text-[11px] font-mono text-amber-600 dark:text-amber-400">
                ⚠️ Recurring issue: seen {result.cluster_occurrence_count} times
              </div>
            )}
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className={`p-3 rounded-lg text-xs font-mono flex items-center space-x-2 ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
            }`}>
              {statusMessage.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Dispatch Button */}
          <Button
            onClick={handleSend}
            disabled={sending}
            className="w-full text-xs font-mono h-9"
          >
            {sending ? 'Dispatching...' : `🚀 Send Real Alert to ${platform === 'slack' ? 'Slack' : 'Discord'}`}
          </Button>

          {/* Export Postmortem Files */}
          <div className="pt-2 border-t border-border flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Incident Postmortem Export:
            </span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadMarkdown}
                className="h-7 text-xs font-mono"
              >
                <Download className="w-3 h-3 mr-1" />
                Markdown (.md)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadJson}
                className="h-7 text-xs font-mono"
              >
                <Download className="w-3 h-3 mr-1" />
                JSON (.json)
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
