import { NextResponse } from 'next/server';
import { BENCHMARK_CASES } from '@/lib/core/benchmark-data';
import { triageEngine } from '@/lib/core/triage-engine';
import { BenchmarkResultItem, BenchmarkRunSummary } from '@/lib/types';

export async function POST() {
  try {
    const results: BenchmarkResultItem[] = [];
    let totalTimeMs = 0;

    for (const testCase of BENCHMARK_CASES) {
      const startTime = performance.now();

      const triageRes = await triageEngine.triageLog({
        raw_log: testCase.raw_log,
        provider: testCase.provider,
        repo_name: 'acme/benchmark-suite',
        branch: 'main',
        job_name: testCase.name,
      });

      const elapsedMs = performance.now() - startTime;
      totalTimeMs += elapsedMs;

      const categoryMatch = triageRes.root_cause_category === testCase.expected_category;
      const actionMatch = triageRes.action_type === testCase.expected_action_type;
      const stepMatch =
        triageRes.exact_failing_step.toLowerCase().includes(testCase.expected_step_contains.toLowerCase()) ||
        triageRes.extracted_excerpt.toLowerCase().includes(testCase.expected_step_contains.toLowerCase());

      const summaryLower = triageRes.root_cause_summary.toLowerCase();
      const excerptLower = triageRes.extracted_excerpt.toLowerCase();
      const keywordHits = testCase.expected_keywords.filter(
        (kw) => summaryLower.includes(kw.toLowerCase()) || excerptLower.includes(kw.toLowerCase())
      ).length;
      const keywordsOk = keywordHits >= 1;

      const casePassed = categoryMatch && actionMatch && (stepMatch || keywordsOk);

      const explanation = `Category: ${categoryMatch ? 'MATCH' : 'MISMATCH'} (${triageRes.root_cause_category} vs ${testCase.expected_category}), Action: ${actionMatch ? 'MATCH' : 'MISMATCH'} (${triageRes.action_type} vs ${testCase.expected_action_type})`;

      results.push({
        case_id: testCase.id,
        name: testCase.name,
        passed: casePassed,
        predicted_category: triageRes.root_cause_category,
        expected_category: testCase.expected_category,
        predicted_action: triageRes.action_type,
        expected_action: testCase.expected_action_type,
        predicted_step: triageRes.exact_failing_step,
        expected_step_contains: testCase.expected_step_contains,
        root_cause_summary: triageRes.root_cause_summary,
        confidence_score: triageRes.confidence_score,
        processing_time_ms: Math.round(elapsedMs * 100) / 100,
        explanation,
      });
    }

    const passedCount = results.filter((r) => r.passed).length;
    const totalCount = results.length;
    const accuracyPct = totalCount > 0 ? Math.round((passedCount / totalCount) * 1000) / 10 : 0;
    const readyToSell = passedCount >= 15; // Threshold >= 75%
    const avgLatency = totalCount > 0 ? Math.round((totalTimeMs / totalCount) * 10) / 10 : 0;

    const summary: BenchmarkRunSummary = {
      total_cases: totalCount,
      passed_cases: passedCount,
      failed_cases: totalCount - passedCount,
      accuracy_percentage: accuracyPct,
      ready_to_sell: readyToSell,
      threshold_percentage: 75.0,
      avg_latency_ms: avgLatency,
      results,
    };

    return NextResponse.json(summary);
  } catch (err: any) {
    console.error('Error running benchmark:', err);
    return NextResponse.json(
      { error: 'Failed to run benchmark suite', detail: err.message },
      { status: 500 }
    );
  }
}
