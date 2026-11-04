export type ActionType = 'RERUN' | 'FIX';

export type ExcerptLine = {
  line_number: number;
  content: string;
  is_anchor?: boolean;
};

export type TriageResult = {
  id?: number;
  provider: string;
  repo_name: string;
  branch: string;
  commit_sha: string;
  commit_author: string;
  pr_number?: number;
  workflow_name: string;
  job_name: string;
  exact_failing_step: string;
  root_cause_category: string;
  root_cause_summary: string;
  action_type: ActionType;
  suggested_direction: string;
  confidence_score: number;
  fingerprint: string;
  extracted_excerpt: string;
  excerpt_lines: ExcerptLine[];
  total_raw_lines: number;
  reduction_percentage: number;
  pr_comment_markdown: string;
  remediation_commands?: string[];
  remediation_patch?: string;
  cluster_id?: number;
  cluster_occurrence_count: number;
  created_at?: string;
};

export type ClusterSummary = {
  id: number;
  fingerprint: string;
  title: string;
  category: string;
  suggested_action_type: ActionType;
  suggested_direction: string;
  occurrence_count: number;
  first_seen: string;
  last_seen: string;
  status: 'ACTIVE' | 'RESOLVED' | 'IGNORED';
  affected_repos: string[];
};

export type BenchmarkCasePreview = {
  id: string;
  name: string;
  provider: string;
  expected_category: string;
  expected_action_type: ActionType;
  expected_step_contains: string;
  log_preview: string;
};

export type BenchmarkResultItem = {
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
};

export type BenchmarkRunSummary = {
  total_cases: number;
  passed_cases: number;
  failed_cases: number;
  accuracy_percentage: number;
  ready_to_sell: boolean;
  threshold_percentage: number;
  avg_latency_ms: number;
  results: BenchmarkResultItem[];
};

export type DashboardStats = {
  total_triaged: number;
  total_clusters: number;
  rerun_count: number;
  fix_count: number;
  top_cluster?: {
    id: number;
    title: string;
    category: string;
    occurrences: number;
  };
  category_breakdown: Record<string, number>;
  provider_breakdown?: Record<string, number>;
  flakiness_index?: number;
  runner_hours_saved?: number;
  runner_cloud_spend_saved?: number;
  top_culprits?: Array<{
    id: number;
    title: string;
    category: string;
    occurrences: number;
    action_type: string;
    status: string;
    affected_repos: string[];
  }>;
  hours_saved_total: number;
  dollars_saved_total: number;
  roi_pricing_model: {
    starter_repo_price_monthly: number;
    pro_team_price_monthly: number;
    scale_team_price_monthly: number;
  };
};

export type SystemHealth = {
  status: string;
  service: string;
  version: string;
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
};
