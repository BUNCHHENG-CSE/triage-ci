import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST() {
  try {
    const deleted = await prisma.failureLog.deleteMany({});
    return NextResponse.json({
      status: 'cleared',
      records_removed: deleted.count,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to clear triage logs', detail: err.message },
      { status: 500 }
    );
  }
}
