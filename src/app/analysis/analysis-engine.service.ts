import { Injectable, inject } from '@angular/core';
import {
  type AccessibilityIssue,
  type AnalysisLayerInfo,
  type AnalysisResult,
  type Framework,
  SEVERITY_ORDER,
  scoreFromIssues,
  summarize,
} from './models';
import { NORMALIZATION_FRAGILE_RULES, runAxe } from './deterministic/axe-runner';
import { runStaticAnalysis } from './deterministic/static-analyzer';
import { normalizeToHtml } from './deterministic/framework-normalizer';
import { buildCorrectedCode } from './fixes/fix-engine';
import { ACCESSIBILITY_AI_PROVIDER } from './ai/ai-provider';
import { collapseWs } from './util/text';

export interface AnalyzeOptions {
  /** When false, Layer 2 (semantic/AI) is skipped entirely. */
  includeSemanticLayer?: boolean;
}

/**
 * Orchestrates the analysis layers and assembles an {@link AnalysisResult}.
 *
 * Layer 1 (axe-core + static structural checks) always runs locally in the
 * browser. Layer 2 delegates to whatever {@link ACCESSIBILITY_AI_PROVIDER} is
 * bound; in the MVP that is a local mock, so still nothing leaves the device.
 *
 * This service holds no UI concerns — it returns plain data.
 */
@Injectable({ providedIn: 'root' })
export class AnalysisEngine {
  private readonly ai = inject(ACCESSIBILITY_AI_PROVIDER);

  async analyze(
    code: string,
    framework: Framework,
    options: AnalyzeOptions = {},
  ): Promise<AnalysisResult> {
    const includeSemanticLayer = options.includeSemanticLayer ?? true;
    const notes: string[] = [];

    const normalized = normalizeToHtml(code, framework);
    notes.push(...normalized.notes);

    // ---- Layer 1a: axe-core ----
    const axeOut = await runAxe(
      normalized.html,
      normalized.lossy ? NORMALIZATION_FRAGILE_RULES : [],
    );
    if (axeOut.note) notes.push(axeOut.note);

    // ---- Layer 1b: deterministic structural checks ----
    // Run against the original for HTML (accurate line numbers), the
    // normalized form otherwise.
    const staticIssues = runStaticAnalysis(framework === 'html' ? code : normalized.html);

    // ---- Layer 2: semantic / AI ----
    let aiIssues: AccessibilityIssue[] = [];
    let aiRan = false;
    if (includeSemanticLayer) {
      try {
        aiIssues = await this.ai.analyze(code, framework);
        aiRan = true;
      } catch (err) {
        notes.push('The semantic layer did not complete: ' + (err as Error).message);
      }
    }

    const merged = dedupe([...axeOut.issues, ...staticIssues, ...aiIssues]);
    const ordered = sortIssues(merged);

    const corrected = buildCorrectedCode(code, ordered);
    if (corrected.manualIssueIds.length) {
      notes.push(
        `${corrected.manualIssueIds.length} issue(s) need a change that can't be applied ` +
          'automatically — see each finding for guidance.',
      );
    }

    const layers: AnalysisLayerInfo[] = [
      {
        id: 'axe',
        label: 'axe-core rules',
        ran: axeOut.ran,
        location: 'local',
        findingCount: axeOut.issues.length,
        note: axeOut.ran ? undefined : axeOut.note,
      },
      {
        id: 'static',
        label: 'Structural checks',
        ran: true,
        location: 'local',
        findingCount: staticIssues.length,
      },
      {
        id: 'ai',
        label: this.ai.displayName,
        ran: aiRan,
        location: this.ai.sendsCodeRemotely ? 'remote' : 'local',
        findingCount: aiIssues.length,
        note: includeSemanticLayer ? undefined : 'Skipped (disabled for this run).',
      },
    ];

    return {
      framework,
      score: scoreFromIssues(ordered),
      summary: summarize(ordered),
      issues: ordered,
      correctedCode: corrected.code,
      layers,
      sentToRemoteService: this.ai.sendsCodeRemotely && aiRan,
      analyzedAt: new Date().toISOString(),
      notes: dedupeStrings(notes),
    };
  }
}

/** Remove near-duplicate findings that different layers report for the same node. */
function dedupe(issues: AccessibilityIssue[]): AccessibilityIssue[] {
  const seen = new Map<string, AccessibilityIssue>();
  for (const issue of issues) {
    const key =
      (issue.ruleId ?? issue.title).toLowerCase() +
      '::' +
      collapseWs(issue.affectedCode).toLowerCase().slice(0, 120);
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, issue);
      continue;
    }
    // Prefer the higher-confidence / deterministic one.
    if (rank(issue) > rank(existing)) seen.set(key, issue);
  }
  return [...seen.values()];
}

function rank(issue: AccessibilityIssue): number {
  const sourceScore = issue.source === 'axe' ? 3 : issue.source === 'static-analysis' ? 2 : 1;
  const confScore = issue.confidence === 'high' ? 3 : issue.confidence === 'medium' ? 2 : 1;
  return sourceScore * 10 + confScore;
}

function sortIssues(issues: AccessibilityIssue[]): AccessibilityIssue[] {
  const sevIdx = (s: AccessibilityIssue['severity']) => SEVERITY_ORDER.indexOf(s);
  return [...issues].sort((a, b) => {
    if (sevIdx(a.severity) !== sevIdx(b.severity)) return sevIdx(a.severity) - sevIdx(b.severity);
    // Confirmed before "needs review".
    if (a.requiresManualReview !== b.requiresManualReview) return a.requiresManualReview ? 1 : -1;
    return rank(b) - rank(a);
  });
}

function dedupeStrings(list: string[]): string[] {
  return [...new Set(list.map((s) => s.trim()).filter(Boolean))];
}
