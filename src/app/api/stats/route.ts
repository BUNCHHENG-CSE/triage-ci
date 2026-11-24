import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { seedInitialDemoData } from '@/lib/seed';

export async function GET() {
  try {
    // Check if initial seeding needed
    if ((await prisma.failureLog.findFirst({ select: { id: true } })) === null) {
      await seedInitialDemoData();
    }

    const [totalTriaged, totalClusters, actionGroups, topClusters, categoryGroups, providerGroups] =
      await Promise.all([
        prisma.failureLog.count(),
        prisma.failureCluster.count(),
        prisma.failureLog.groupBy({ by: ['actionType'], _count: { id: true } }),
        prisma.failureCluster.findMany({ orderBy: { occurrenceCount: 'desc' }, take: 5 }),
        prisma.failureLog.groupBy({ by: ['rootCauseCategory'], _count: { id: true } }),
        prisma.failureLog.groupBy({ by: ['provider'], _count: { id: true } }),
      ]);

    const actionCounts: Record<string, number> = {};
    for (const g of actionGroups) actionCounts[g.actionType] = g._count.id;
    const rerunCount = actionCounts.RERUN ?? 0;
    const fixCount = actionCounts.FIX ?? 0;
    const totalActions = rerunCount + fixCount;

    const flakinessIndex =
      Math.round((rerunCount / Math.max(1, totalActions)) * 1000) / 10;
    const topCluster = topClusters[0] || null;

    const categoryCounts: Record<string, number> = {};
    for (const g of categoryGroups) {
      categoryCounts[g.rootCauseCategory] = g._count.id;
    }

    const providerCounts: Record<string, number> = {};
    for (const g of providerGroups) {
      providerCounts[g.provider] = g._count.id;
    }

    // ROI metrics:
    // 18 mins developer context-switch saved per failure
    const minsSaved = totalTriaged * 18;
    const hoursSaved = Math.round((minsSaved / 60.0) * 10) / 10;
    const dollarsSaved = Math.round(hoursSaved * 80.0 * 100) / 100; // @ $80/hr engineer cost

    // CI runner cost saved: each avoided futile rerun saves ~20 mins ($0.008/min runner cost)
    const runnerMinutesSaved = fixCount * 20;
    const runnerHoursSaved = Math.round((runnerMinutesSaved / 60.0) * 10) / 10;
    const runnerCloudSpendSaved =
      Math.round(runnerMinutesSaved * 0.008 * 100) / 100;

    return NextResponse.json({
      total_triaged: totalTriaged,
      total_clusters: totalClusters,
      rerun_count: rerunCount,
      fix_count: fixCount,
      flakiness_index: flakinessIndex,
      runner_hours_saved: runnerHoursSaved,
      runner_cloud_spend_saved: runnerCloudSpendSaved,
      top_cluster: topCluster
        ? {
            id: topCluster.id,
            title: topCluster.title,
            category: topCluster.category,
            occurrences: topCluster.occurrenceCount,
          }
        : null,
      top_culprits: topClusters.map((c) => {
        let repos: string[] = [];
        try {
          repos = JSON.parse(c.affectedRepos || '[]');
        } catch {
          repos = [];
        }
        return {
          id: c.id,
          title: c.title,
          category: c.category,
          occurrences: c.occurrenceCount,
          action_type: c.suggestedActionType,
          status: c.status,
          affected_repos: repos,
        };
      }),
      category_breakdown: categoryCounts,
      provider_breakdown: providerCounts,
      hours_saved_total: hoursSaved,
      dollars_saved_total: dollarsSaved,
      roi_pricing_model: {
        starter_repo_price_monthly: 29,
        pro_team_price_monthly: 99,
        scale_team_price_monthly: 199,
      },
    });
  } catch (err: any) {
    console.error('Error in /api/stats:', err);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats', detail: err.message },
      { status: 500 }
    );
  }
}
