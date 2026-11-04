import type {
  TriageResult,
  ClusterSummary,
  BenchmarkCasePreview,
  BenchmarkRunSummary,
  DashboardStats,
  SystemHealth
} from './types';

const API_BASE = '/api';

export async function fetchStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  return res.json();
}

export async function fetchTriageHistory(params?: {
  limit?: number;
  offset?: number;
  search?: string;
  category?: string;
  action_type?: string;
  provider?: string;
  repo_name?: string;
}): Promise<TriageResult[]> {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));
  if (params?.search) query.set('search', params.search);
  if (params?.category && params.category !== 'ALL') query.set('category', params.category);
  if (params?.action_type && params.action_type !== 'ALL') query.set('action_type', params.action_type);
  if (params?.provider && params.provider !== 'ALL') query.set('provider', params.provider);
  if (params?.repo_name) query.set('repo_name', params.repo_name);

  const res = await fetch(`${API_BASE}/triage/history?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch triage history');
  return res.json();
}

export async function submitTriageLog(payload: {
  raw_log: string;
  provider?: string;
  repo_name?: string;
  branch?: string;
  commit_sha?: string;
  workflow_name?: string;
  job_name?: string;
}): Promise<TriageResult> {
  const res = await fetch(`${API_BASE}/triage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to analyze log');
  }
  return res.json();
}

export async function deleteTriageLog(id: number): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/triage/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete triage report');
  return res.json();
}

export async function clearAllTriageLogs(): Promise<{ status: string; records_removed: number }> {
  const res = await fetch(`${API_BASE}/triage/clear-all`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to clear triage logs');
  return res.json();
}

export async function fetchClusters(): Promise<ClusterSummary[]> {
  const res = await fetch(`${API_BASE}/clusters`);
  if (!res.ok) throw new Error('Failed to fetch failure clusters');
  return res.json();
}

export async function toggleResolveCluster(clusterId: number): Promise<{ status: string; new_status: string }> {
  const res = await fetch(`${API_BASE}/clusters/${clusterId}/resolve`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to toggle cluster resolution');
  return res.json();
}

export async function fetchBenchmarkCases(): Promise<BenchmarkCasePreview[]> {
  const res = await fetch(`${API_BASE}/benchmark/cases`);
  if (!res.ok) throw new Error('Failed to fetch benchmark cases');
  return res.json();
}

export async function runBenchmarkSuite(): Promise<BenchmarkRunSummary> {
  const res = await fetch(`${API_BASE}/benchmark/run`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to execute benchmark suite');
  return res.json();
}

export async function fetchSystemHealth(): Promise<SystemHealth> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Failed to fetch system health');
  return res.json();
}

export async function simulateWebhook(scenario: string, provider: string): Promise<any> {
  const res = await fetch(`${API_BASE}/webhooks/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario, provider })
  });
  if (!res.ok) throw new Error('Failed to simulate webhook');
  return res.json();
}

export async function dispatchSlackAlert(payload: {
  webhook_url: string;
  triage_id?: number;
  repo_name: string;
  job_name: string;
  failing_step: string;
  root_cause_summary: string;
  action_type: string;
  suggested_direction: string;
  cluster_occurrences: number;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/notifications/slack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to dispatch Slack alert');
  return res.json();
}

export async function dispatchDiscordAlert(payload: {
  webhook_url: string;
  repo_name: string;
  job_name: string;
  failing_step: string;
  root_cause_summary: string;
  action_type: string;
  suggested_direction: string;
  cluster_occurrences: number;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/notifications/discord`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to dispatch Discord alert');
  return res.json();
}
