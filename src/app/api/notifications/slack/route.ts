import { NextRequest, NextResponse } from 'next/server';
import { formatSlackCard } from '@/lib/core/pr-commenter';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = (body.webhook_url || '').trim();

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return NextResponse.json(
        { detail: 'Invalid Slack Webhook URL. Must start with https://' },
        { status: 400 }
      );
    }

    const payload = formatSlackCard({
      repoName: body.repo_name,
      jobName: body.job_name,
      failingStep: body.failing_step,
      rootCauseSummary: body.root_cause_summary,
      actionType: body.action_type,
      suggestedDirection: body.suggested_direction,
      clusterOccurrences: body.cluster_occurrences || 1,
    });

    // Simulated URL checks
    if (url.includes('example.com') || url.includes('hooks.slack.com/services/DUMMY')) {
      return NextResponse.json({
        status: 'simulated_success',
        message: 'Slack payload validated successfully (simulated webhook URL).',
        payload_preview: payload,
      });
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const respText = await res.text();
      return NextResponse.json({
        status: 'delivered',
        message: 'Slack notification successfully delivered to channel.',
        response: respText,
      });
    } catch (e: any) {
      return NextResponse.json({
        status: 'dispatch_error',
        error: e.message,
        payload_preview: payload,
      });
    }
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
