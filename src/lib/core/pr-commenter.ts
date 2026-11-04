import { ExcerptLine } from '../types';

export function formatGithubPrComment(params: {
  jobName: string;
  failingStep: string;
  rootCauseCategory: string;
  rootCauseSummary: string;
  actionType: string;
  suggestedDirection: string;
  confidenceScore: number;
  reductionPercentage: number;
  excerptLines: ExcerptLine[];
  clusterOccurrences?: number;
}): string {
  const {
    jobName,
    failingStep,
    rootCauseCategory,
    rootCauseSummary,
    actionType,
    suggestedDirection,
    confidenceScore,
    reductionPercentage,
    excerptLines,
    clusterOccurrences = 1,
  } = params;

  const badge =
    actionType === 'RERUN'
      ? '🔄 **RECOMMENDATION: SAFE TO RERUN**'
      : '🛠️ **RECOMMENDATION: CODE/CONFIG FIX REQUIRED**';
  const confPct = Math.round(confidenceScore * 100);

  let clusterCallout = '';
  if (clusterOccurrences > 1) {
    clusterCallout = `\n> ⚠️ **Recurring Issue Detected:** This same root cause has caused **${clusterOccurrences} failures** across the repository.\n`;
  }

  const snippetCode = excerptLines
    .map((l) => `${String(l.line_number).padStart(4, ' ')} | ${l.content}`)
    .join('\n');

  return `### 🔴 CI/CD Failure Triage Report: \`${jobName}\`

${badge}
${clusterCallout}
| Attribute | Details |
| :--- | :--- |
| **Category** | \`${rootCauseCategory}\` |
| **Failing Step** | \`${failingStep}\` |
| **Confidence** | \`${confPct}%\` |
| **Noise Reduction** | \`${reductionPercentage}%\` of console log pruned |

#### 🔍 Root Cause Analysis
${rootCauseSummary}

#### 💡 Suggested Action
${suggestedDirection}

<details>
<summary><b>📄 View Extracted Log Evidence (${excerptLines.length} high-signal lines)</b></summary>

\`\`\`log
${snippetCode}
\`\`\`
</details>

---
*TCT TriageCI Diagnostic Engine • No pipeline editing • Fast attribution*`.trim();
}

export function formatSlackCard(params: {
  repoName: string;
  jobName: string;
  failingStep: string;
  rootCauseSummary: string;
  actionType: string;
  suggestedDirection: string;
  clusterOccurrences: number;
}): Record<string, any> {
  const {
    repoName,
    jobName,
    failingStep,
    rootCauseSummary,
    actionType,
    suggestedDirection,
    clusterOccurrences,
  } = params;

  const color = actionType === 'RERUN' ? '#36a64f' : '#dc2626';

  return {
    attachments: [
      {
        color,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `CI Failure: ${repoName} / ${jobName}`,
            },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Action:* \`${actionType}\`` },
              { type: 'mrkdwn', text: `*Failing Step:* \`${failingStep}\`` },
              { type: 'mrkdwn', text: `*Occurrences:* \`${clusterOccurrences} times\`` },
            ],
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Root Cause:*\n${rootCauseSummary}\n\n*Suggested Action:*\n${suggestedDirection}`,
            },
          },
        ],
      },
    ],
  };
}
