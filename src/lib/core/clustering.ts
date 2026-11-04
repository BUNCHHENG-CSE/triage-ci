import { prisma } from '../db';
import { FailureCluster } from '@prisma/client';

export async function getOrCreateCluster(params: {
  fingerprint: string;
  title: string;
  category: string;
  suggestedActionType: string;
  suggestedDirection: string;
  repoName: string;
}): Promise<{ cluster: FailureCluster; occurrenceCount: number }> {
  const { fingerprint, title, category, suggestedActionType, suggestedDirection, repoName } = params;

  const existing = await prisma.failureCluster.findUnique({
    where: { fingerprint },
  });

  if (existing) {
    let affectedReposList: string[] = [];
    try {
      affectedReposList = JSON.parse(existing.affectedRepos || '[]');
    } catch {
      affectedReposList = [];
    }

    if (repoName && !affectedReposList.includes(repoName)) {
      affectedReposList.push(repoName);
    }

    const updated = await prisma.failureCluster.update({
      where: { id: existing.id },
      data: {
        occurrenceCount: { increment: 1 },
        lastSeen: new Date(),
        affectedRepos: JSON.stringify(affectedReposList),
      },
    });

    return { cluster: updated, occurrenceCount: updated.occurrenceCount };
  }

  // Create new cluster
  const created = await prisma.failureCluster.create({
    data: {
      fingerprint,
      title,
      category,
      suggestedActionType,
      suggestedDirection,
      occurrenceCount: 1,
      firstSeen: new Date(),
      lastSeen: new Date(),
      status: 'ACTIVE',
      affectedRepos: JSON.stringify(repoName ? [repoName] : []),
    },
  });

  return { cluster: created, occurrenceCount: 1 };
}
