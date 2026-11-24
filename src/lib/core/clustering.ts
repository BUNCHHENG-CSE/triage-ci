import { prisma } from '../db';
import { FailureCluster } from '@prisma/client';

function parseRepos(raw: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getOrCreateCluster(params: {
  fingerprint: string;
  title: string;
  category: string;
  suggestedActionType: string;
  suggestedDirection: string;
  repoName: string;
}): Promise<{ cluster: FailureCluster; occurrenceCount: number }> {
  const { fingerprint, title, category, suggestedActionType, suggestedDirection, repoName } = params;
  const now = new Date();

  // Atomic upsert: avoids the unique-constraint race when concurrent webhooks
  // report the same fingerprint (previously find-then-create → 500).
  let cluster = await prisma.failureCluster.upsert({
    where: { fingerprint },
    create: {
      fingerprint,
      title,
      category,
      suggestedActionType,
      suggestedDirection,
      occurrenceCount: 1,
      firstSeen: now,
      lastSeen: now,
      status: 'ACTIVE',
      affectedRepos: JSON.stringify(repoName ? [repoName] : []),
    },
    update: {
      occurrenceCount: { increment: 1 },
      lastSeen: now,
    },
  });

  const repos = parseRepos(cluster.affectedRepos);
  if (repoName && !repos.includes(repoName)) {
    repos.push(repoName);
    cluster = await prisma.failureCluster.update({
      where: { id: cluster.id },
      data: { affectedRepos: JSON.stringify(repos) },
    });
  }

  return { cluster, occurrenceCount: cluster.occurrenceCount };
}
