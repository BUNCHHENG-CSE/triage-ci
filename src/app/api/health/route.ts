import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { FAILURE_PATTERNS } from '@/lib/core/pattern-library';

const START_TIME = Date.now();

export async function GET() {
  const dbStart = performance.now();
  let dbStatus = 'connected';
  let dbError: string | null = null;

  try {
    // Ping database
    await prisma.$queryRaw`SELECT 1`;
  } catch (e: any) {
    dbStatus = 'error';
    dbError = e.message || String(e);
  }

  const dbLatencyMs = Math.round((performance.now() - dbStart) * 100) / 100;

  const dbUrl = process.env.DATABASE_URL || '';
  const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');
  const dbType = isPostgres
    ? 'PostgreSQL (Neon Serverless Pool)'
    : 'SQLite (WAL Mode)';

  let totalLogs = 0;
  let totalClusters = 0;
  try {
    totalLogs = await prisma.failureLog.count();
    totalClusters = await prisma.failureCluster.count();
  } catch {}

  const uptimeSec = Math.round((Date.now() - START_TIME) / 100) / 10;

  let llmStatus = 'Offline Deterministic Expert Mode (Sub-ms Latency)';
  if (process.env.OPENAI_API_KEY) {
    llmStatus = 'OpenAI GPT-4o-mini Enabled';
  } else if (process.env.GEMINI_API_KEY) {
    llmStatus = 'Google Gemini-1.5-Flash Enabled';
  }

  return NextResponse.json({
    status: dbStatus === 'connected' ? 'healthy' : 'degraded',
    service: 'TCT TriageCI',
    package: 'tct-triage-ci',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime_seconds: uptimeSec,
    database: {
      type: dbType,
      status: dbStatus,
      latency_ms: dbLatencyMs,
      error: dbError,
    },
    engine: {
      pattern_library_size: FAILURE_PATTERNS.length,
      taxonomies_supported: 8,
      llm_engine_status: llmStatus,
      total_triaged_logs: totalLogs,
      active_recurring_clusters: totalClusters,
    },
  });
}
