from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, JSON, Index
from sqlalchemy.orm import relationship
from pydantic import BaseModel, Field
from app.models.database import Base

def utc_now():
    return datetime.now(timezone.utc)

# SQLAlchemy ORM Models
class FailureCluster(Base):
    __tablename__ = "failure_clusters"
    __table_args__ = (
        Index("idx_clusters_status_occ", "status", "occurrence_count"),
        Index("idx_clusters_cat_occ", "category", "occurrence_count"),
    )

    id = Column(Integer, primary_key=True, index=True)
    fingerprint = Column(String(128), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    category = Column(String(64), nullable=False, index=True)
    suggested_action_type = Column(String(32), nullable=False)  # RERUN or FIX
    suggested_direction = Column(Text, nullable=False)
    occurrence_count = Column(Integer, default=1)
    first_seen = Column(DateTime, default=utc_now)
    last_seen = Column(DateTime, default=utc_now, onupdate=utc_now)
    status = Column(String(32), default="ACTIVE")  # ACTIVE, RESOLVED, IGNORED
    affected_repos = Column(JSON, default=list)  # list of repo names
    
    # Relationship to logs
    logs = relationship("FailureLog", back_populates="cluster", cascade="all, delete-orphan")


class FailureLog(Base):
    __tablename__ = "failure_logs"
    __table_args__ = (
        Index("idx_logs_cluster_created", "cluster_id", "created_at"),
        Index("idx_logs_repo_created", "repo_name", "created_at"),
        Index("idx_logs_cat_created", "root_cause_category", "created_at"),
        Index("idx_logs_action_created", "action_type", "created_at"),
        Index("idx_logs_fingerprint_created", "fingerprint", "created_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String(64), default="github_actions")  # github_actions, gitlab_ci, jenkins, manual
    repo_name = Column(String(255), default="unknown-org/repo")
    branch = Column(String(255), default="main")
    commit_sha = Column(String(64), default="HEAD")
    commit_author = Column(String(128), default="engineer")
    pr_number = Column(Integer, nullable=True)
    workflow_name = Column(String(255), default="CI Pipeline")
    job_name = Column(String(255), default="test")
    
    # Triage outputs
    exact_failing_step = Column(String(255), nullable=False)
    root_cause_category = Column(String(64), nullable=False)
    root_cause_summary = Column(Text, nullable=False)
    action_type = Column(String(32), nullable=False)  # RERUN or FIX
    suggested_direction = Column(Text, nullable=False)
    confidence_score = Column(Float, default=0.9)
    fingerprint = Column(String(128), index=True, nullable=False)
    
    # Excerpts and logs
    extracted_excerpt = Column(Text, nullable=False)
    excerpt_start_line = Column(Integer, default=1)
    excerpt_end_line = Column(Integer, default=1)
    total_raw_lines = Column(Integer, default=0)
    raw_log = Column(Text, nullable=True)
    pr_comment_markdown = Column(Text, nullable=True)
    
    cluster_id = Column(Integer, ForeignKey("failure_clusters.id"), nullable=True)
    cluster = relationship("FailureCluster", back_populates="logs")
    
    created_at = Column(DateTime, default=utc_now, index=True)


# Pydantic Request / Response Schemas
class TriageRequest(BaseModel):
    raw_log: str
    provider: Optional[str] = "github_actions"
    repo_name: Optional[str] = "acme/backend"
    branch: Optional[str] = "main"
    commit_sha: Optional[str] = "a1b2c3d"
    commit_author: Optional[str] = "dev@example.com"
    pr_number: Optional[int] = None
    workflow_name: Optional[str] = "CI / Test & Build"
    job_name: Optional[str] = "test"

class ExcerptLine(BaseModel):
    line_number: int
    content: str
    is_anchor: bool = False

class TriageResult(BaseModel):
    id: Optional[int] = None
    provider: str
    repo_name: str
    branch: str
    commit_sha: str
    commit_author: str
    pr_number: Optional[int] = None
    workflow_name: str
    job_name: str
    
    exact_failing_step: str
    root_cause_category: str
    root_cause_summary: str
    action_type: str  # RERUN vs FIX
    suggested_direction: str
    confidence_score: float
    fingerprint: str
    
    extracted_excerpt: str
    excerpt_lines: List[ExcerptLine] = []
    total_raw_lines: int
    reduction_percentage: float
    pr_comment_markdown: str
    
    cluster_id: Optional[int] = None
    cluster_occurrence_count: int = 1
    created_at: Optional[datetime] = None

class ClusterSummary(BaseModel):
    id: int
    fingerprint: str
    title: str
    category: str
    suggested_action_type: str
    suggested_direction: str
    occurrence_count: int
    first_seen: datetime
    last_seen: datetime
    status: str
    affected_repos: List[str]

class BenchmarkCase(BaseModel):
    id: str
    name: str
    provider: str
    raw_log: str
    expected_category: str
    expected_action_type: str  # RERUN or FIX
    expected_step_contains: str
    expected_root_cause_keywords: List[str]

class BenchmarkResultItem(BaseModel):
    case_id: str
    name: str
    passed: bool
    predicted_category: str
    expected_category: str
    predicted_action: str
    expected_action: str
    predicted_step: str
    expected_step_contains: str
    root_cause_summary: str
    confidence_score: float
    processing_time_ms: float
    explanation: str

class BenchmarkRunSummary(BaseModel):
    total_cases: int
    passed_cases: int
    failed_cases: int
    accuracy_percentage: float
    ready_to_sell: bool
    threshold_percentage: float
    avg_latency_ms: float
    results: List[BenchmarkResultItem]
