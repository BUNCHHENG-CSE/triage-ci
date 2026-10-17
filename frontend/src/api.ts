import type {
  TriageResult,
  ClusterSummary,
  BenchmarkCasePreview,
  BenchmarkRunSummary,
  DashboardStats
} from './types';

const API_BASE = '/api';

export async function fetchStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  return res.json();
}

export async function fetchTriageHistory(limit = 50): Promise<TriageResult[]> {
  const res = await fetch(`${API_BASE}/triage/history?limit=${limit}`);
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
