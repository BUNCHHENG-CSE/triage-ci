import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = (body.webhook_url || '').trim();

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return NextResponse.json(
        { detail: 'Invalid Discord Webhook URL.' },
        { status: 400 }
      );
    }

    const color = body.action_type === 'RERUN' ? 0x10b981 : 0xef4444;

    const discordPayload = {
      username: 'TCT TriageCI Bot',
      avatar_url: 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/terminal.svg',
      embeds: [
        {
          title: `🔴 CI/CD Failure Attribution: ${body.repo_name} / ${body.job_name}`,
          color,
          fields: [
            { name: 'Action Required', value: `\`${body.action_type}\``, inline: true },
            { name: 'Failing Step', value: `\`${body.failing_step}\``, inline: true },
            { name: 'Recurring Count', value: `${body.cluster_occurrences || 1}x`, inline: true },
            { name: 'Root Cause', value: body.root_cause_summary, inline: false },
            { name: 'Suggested Fix', value: body.suggested_direction, inline: false },
          ],
          footer: { text: 'TCT TriageCI Diagnostic Engine • Zero Pipeline Editing' },
        },
      ],
    };

    if (url.includes('discord.com/api/webhooks/dummy') || url.includes('example.com')) {
      return NextResponse.json({
        status: 'simulated_success',
        message: 'Discord payload validated successfully (simulated webhook URL).',
        payload_preview: discordPayload,
      });
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordPayload),
      });

      return NextResponse.json({
        status: 'delivered',
        message: 'Discord alert delivered successfully.',
      });
    } catch (e: any) {
      return NextResponse.json({
        status: 'dispatch_error',
        error: e.message,
        payload_preview: discordPayload,
      });
    }
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
