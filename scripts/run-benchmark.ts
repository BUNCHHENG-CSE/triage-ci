import { BENCHMARK_CASES } from '../src/lib/core/benchmark-data';
import { triageEngine } from '../src/lib/core/triage-engine';

async function main() {
  console.log('===================================================');
  console.log('🚀 Running TCT TriageCI Benchmark Validation (20 Logs)');
  console.log('Target Threshold: >= 15/20 Correct (75%)');
  console.log('===================================================\n');

  let passed = 0;
  let totalTimeMs = 0;

  for (const tc of BENCHMARK_CASES) {
    const start = performance.now();
    const res = await triageEngine.triageLog({
      raw_log: tc.raw_log,
      provider: tc.provider,
      repo_name: 'acme/benchmark-suite',
      job_name: tc.name,
    });
    const elapsed = performance.now() - start;
    totalTimeMs += elapsed;

    const catMatch = res.root_cause_category === tc.expected_category;
    const actMatch = res.action_type === tc.expected_action_type;
    const isPass = catMatch && actMatch;

    if (isPass) passed++;

    const statusSymbol = isPass ? '✅ PASS' : '❌ FAIL';
    console.log(`${statusSymbol} [${tc.id}] ${tc.name} (${Math.round(elapsed)}ms)`);
    console.log(`   Expected: [${tc.expected_action_type}] ${tc.expected_category}`);
    console.log(`   Actual:   [${res.action_type}] ${res.root_cause_category}`);
    console.log(`   Summary:  ${res.root_cause_summary.slice(0, 80)}...\n`);
  }

  const accuracy = Math.round((passed / BENCHMARK_CASES.length) * 1000) / 10;
  const avgLatency = Math.round((totalTimeMs / BENCHMARK_CASES.length) * 10) / 10;
  const ready = passed >= 15;

  console.log('===================================================');
  console.log(`📊 Benchmark Summary: ${passed}/${BENCHMARK_CASES.length} Passed (${accuracy}%)`);
  console.log(`⏱️ Average Processing Latency: ${avgLatency} ms/log`);
  console.log(`🎯 Status: ${ready ? '🏆 READY TO SELL (Threshold Exceeded)' : '⚠️ NEEDS CALIBRATION'}`);
  console.log('===================================================');
}

main().catch(console.error);
