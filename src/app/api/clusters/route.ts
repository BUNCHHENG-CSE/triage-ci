import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ClusterSummary } from '@/lib/types';

export async function GET() {
  try {
    const clusters = await prisma.failureCluster.findMany({
      orderBy: { occurrenceCount: 'desc' },
    });

    const result: ClusterSummary[] = clusters.map((c) => {
      let repos: string[] = [];
      try {
        repos = JSON.parse(c.affectedRepos || '[]');
      } catch {
        repos = [];
      }

      return {
        id: c.id,
        fingerprint: c.fingerprint,
        title: c.title,
        category: c.category,
        suggested_action_type: c.suggestedActionType,
        suggested_direction: c.suggestedDirection,
        occurrence_count: c.occurrenceCount,
        first_seen: c.firstSeen.toISOString(),
        last_seen: c.lastSeen.toISOString(),
        status: c.status,
        affected_repos: repos,
      };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to fetch clusters', detail: err.message },
      { status: 500 }
    );
  }
}
