import { NextResponse } from 'next/server';
import { BENCHMARK_CASES } from '@/lib/core/benchmark-data';
import { BenchmarkCasePreview } from '@/lib/types';

export async function GET() {
  const previews: BenchmarkCasePreview[] = BENCHMARK_CASES.map((c) => ({
    id: c.id,
    name: c.name,
    provider: c.provider,
    expected_category: c.expected_category,
    expected_action_type: c.expected_action_type,
    expected_step_contains: c.expected_step_contains,
    log_preview: c.raw_log.slice(0, 300) + '...',
  }));

  return NextResponse.json(previews);
}
