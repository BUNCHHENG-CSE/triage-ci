import { NextRequest, NextResponse } from 'next/server';
import { triageEngine } from '@/lib/core/triage-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.raw_log || typeof body.raw_log !== 'string' || !body.raw_log.trim()) {
      return NextResponse.json(
        { detail: 'raw_log cannot be empty' },
        { status: 400 }
      );
    }

    const result = await triageEngine.triageLog(body);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error in /api/triage POST:', err);
    return NextResponse.json(
      { detail: err.message || 'Failed to analyze failure log' },
      { status: 500 }
    );
  }
}
