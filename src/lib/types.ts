export interface ExcerptLine {
  line_number: number;
  content: string;
  is_anchor: boolean;
}

export interface TriageResult {
  id: number;
  provider: string;
  repo_name: string;
  branch: string;
  commit_sha: string;
  commit_author: string;
  pr_number?: number | null;
  workflow_name: string;
  job_name: string;
  exact_failing_step: string;
  root_cause_category: string;
  root_cause_summary: string;
  action_type: 'RERUN' | 'FIX' | string;
  suggested_direction: string;
  confidence_score: number;
  fingerprint: string;
  extracted_excerpt: string;
  excerpt_lines: ExcerptLine[];
  total_raw_lines: number;
  reduction_percentage: number;
  pr_comment_markdown: string;
  remediation_commands: string[];
  remediation_patch?: string | null;
  cluster_id?: number | null;
  cluster_occurrence_count: number;
  created_at: string;
}

export interface ClusterSummary {
  id: number;
  fingerprint: string;
  title: string;
  category: string;
  suggested_action_type: 'RERUN' | 'FIX' | string;
  suggested_direction: string;
  occurrence_count: number;
  first_seen: string;
  last_seen: string;
  status: 'ACTIVE' | 'RESOLVED' | 'IGNORED' | string;
  affected_repos: string[];
}

export interface TopClusterInfo {
  id: number;
  title: string;
  category: string;
  occurrences: number;
}

export interface TopCulprit {
  id: number;
  title: string;
  category: string;
  occurrences: number;
  action_type: string;
  status: string;
  affected_repos: string[];
}

export interface DashboardStats {
  total_triaged: number;
  total_clusters: number;
  rerun_count: number;
  fix_count: number;
  flakiness_index: number;
  runner_hours_saved: number;
  runner_cloud_spend_saved: number;
  top_cluster: TopClusterInfo | null;
  top_culprits: TopCulprit[];
  category_breakdown: Record<string, number>;
  provider_breakdown: Record<string, number>;
  hours_saved_total: number;
  dollars_saved_total: number;
  roi_pricing_model: {
    starter_repo_price_monthly: number;
    pro_team_price_monthly: number;
    scale_team_price_monthly: number;
  };
}

export interface BenchmarkCasePreview {
  id: string;
  name: string;
  provider: string;
  expected_category: string;
  expected_action_type: string;
  expected_step_contains: string;
  log_preview: string;
}

export interface BenchmarkResultItem {
  case_id: string;
  name: string;
  passed: boolean;
  predicted_category: string;
  expected_category: string;
  predicted_action: string;
  expected_action: string;
  predicted_step: string;
  expected_step_contains: string;
  root_cause_summary: string;
  confidence_score: number;
  processing_time_ms: number;
  explanation: string;
}

export interface BenchmarkRunSummary {
  total_cases: number;
  passed_cases: number;
  failed_cases: number;
  accuracy_percentage: number;
  ready_to_sell: boolean;
  threshold_percentage: number;
  avg_latency_ms: number;
  results: BenchmarkResultItem[];
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'error';
  service: string;
  version: string;
  environment: string;
  uptime_seconds: number;
  database: {
    type: string;
    status: string;
    latency_ms: number;
    error?: string | null;
  };
  engine: {
    pattern_library_size: number;
    taxonomies_supported: number;
    llm_engine_status: string;
    total_triaged_logs: number;
    active_recurring_clusters: number;
  };
}
