import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const clusterId = parseInt(id, 10);
    if (isNaN(clusterId)) {
      return NextResponse.json({ detail: 'Invalid ID' }, { status: 400 });
    }

    const cluster = await prisma.failureCluster.findUnique({
      where: { id: clusterId },
    });

    if (!cluster) {
      return NextResponse.json({ detail: 'Cluster not found' }, { status: 404 });
    }

    const newStatus = cluster.status === 'RESOLVED' ? 'ACTIVE' : 'RESOLVED';
    const updated = await prisma.failureCluster.update({
      where: { id: clusterId },
      data: { status: newStatus },
    });

    return NextResponse.json({
      status: 'success',
      cluster_id: updated.id,
      new_status: updated.status,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
