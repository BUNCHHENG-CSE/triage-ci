import { PatternMatch } from './pattern-library';

export interface TriageAnalysis {
  exact_failing_step: string;
  root_cause_category: string;
  root_cause_summary: string;
  action_type: 'RERUN' | 'FIX' | string;
  suggested_direction: string;
  confidence_score: number;
}

export class LLMProvider {
  openaiKey: string | undefined;
  geminiKey: string | undefined;
  anthropicKey: string | undefined;

  constructor() {
    this.openaiKey = process.env.OPENAI_API_KEY;
    this.geminiKey = process.env.GEMINI_API_KEY;
    this.anthropicKey = process.env.ANTHROPIC_API_KEY;
  }

  async summarizeTriage(params: {
    extractedExcerpt: string;
    failingStepDetected: string;
    patternMatch: PatternMatch | null;
    jobName?: string;
    repoName?: string;
  }): Promise<TriageAnalysis> {
    const { extractedExcerpt, failingStepDetected, patternMatch, jobName = 'CI Job' } = params;

    // If OpenAI API key is available, call OpenAI
    if (this.openaiKey) {
      const res = await this.callOpenAI(extractedExcerpt, failingStepDetected, patternMatch, jobName);
      if (res) return res;
    } else if (this.geminiKey) {
      const res = await this.callGemini(extractedExcerpt, failingStepDetected, patternMatch, jobName);
      if (res) return res;
    }

    // Default / Fallback: High-Accuracy Heuristic & Pattern Engine
    return this.heuristicFallback(extractedExcerpt, failingStepDetected, patternMatch);
  }

  private heuristicFallback(
    _extractedExcerpt: string,
    failingStepDetected: string,
    patternMatch: PatternMatch | null
  ): TriageAnalysis {
    if (patternMatch) {
      return {
        exact_failing_step: failingStepDetected,
        root_cause_category: patternMatch.category,
        root_cause_summary: patternMatch.summary,
        action_type: patternMatch.action_type,
        suggested_direction: patternMatch.suggested_direction,
        confidence_score: patternMatch.confidence,
      };
    }

    return {
      exact_failing_step: failingStepDetected,
      root_cause_category: 'UNKNOWN_FAILURE',
      root_cause_summary: 'The pipeline process exited with non-zero status during execution.',
      action_type: 'FIX',
      suggested_direction: 'Review recent commit diff and step output around the failure anchor.',
      confidence_score: 0.65,
    };
  }

  private async callOpenAI(
    excerpt: string,
    failingStep: string,
    patternMatch: PatternMatch | null,
    jobName: string
  ): Promise<TriageAnalysis | null> {
    try {
      const prompt = `CI Failure Analysis for Job '${jobName}'. Failing Step: '${failingStep}'.
${patternMatch ? `Heuristic Match: Category ${patternMatch.category}, Action ${patternMatch.action_type}` : ''}

Log snippet:
${excerpt}`;

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are TCT TriageCI, an expert root-cause attribution engine. Return JSON with exact_failing_step, root_cause_category, root_cause_summary, action_type ("RERUN" or "FIX"), suggested_direction, confidence_score (0.0 to 1.0).',
            },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        return JSON.parse(content) as TriageAnalysis;
      }
    } catch (e) {
      console.warn('OpenAI summarization failed, falling back to heuristic:', e);
    }
    return null;
  }

  private async callGemini(
    excerpt: string,
    failingStep: string,
    patternMatch: PatternMatch | null,
    jobName: string
  ): Promise<TriageAnalysis | null> {
    try {
      const prompt = `CI Failure Analysis for Job '${jobName}'. Failing Step: '${failingStep}'.
Log:
${excerpt}
Return valid JSON with: exact_failing_step, root_cause_category, root_cause_summary, action_type ("RERUN"|"FIX"), suggested_direction, confidence_score.`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return JSON.parse(text) as TriageAnalysis;
      }
    } catch (e) {
      console.warn('Gemini summarization failed, falling back to heuristic:', e);
    }
    return null;
  }
}
