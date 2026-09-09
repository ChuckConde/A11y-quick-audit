/**
 * Core analysis domain model.
 *
 * The analysis engine is intentionally decoupled from the presentation layer:
 * everything a UI needs to render a report is described by these types, and
 * nothing here imports Angular.
 */

export type Framework = 'html' | 'angular' | 'react';

export const FRAMEWORK_LABELS: Record<Framework, string> = {
  html: 'HTML',
  angular: 'Angular',
  react: 'React / JSX',
};

export type Severity = 'critical' | 'serious' | 'moderate' | 'minor' | 'suggestion';

export type Confidence = 'high' | 'medium' | 'low';

/** Where a finding came from. Drives how strongly the UI states it. */
export type IssueSource = 'axe' | 'static-analysis' | 'ai';

export interface AccessibilityIssue {
  id: string;
  title: string;
  /** Short, one-line summary used in list rows. */
  description: string;
  severity: Severity;
  confidence: Confidence;
  source: IssueSource;
  /** e.g. ["1.1.1", "4.1.2"] — bare criterion numbers, never invented. */
  wcagCriteria: string[];
  /** The snippet of the user's code the finding refers to. */
  affectedCode: string;
  line?: number;
  /** Why it matters, in plain language. Teaches the developer. */
  explanation: string;
  /** Prose describing the fix. */
  suggestedFix?: string;
  /** A corrected version of `affectedCode` only. */
  fixedCode?: string;
  /**
   * True when the finding needs a human to confirm (all AI "potential"
   * findings, plus deterministic checks that can't see enough context).
   */
  requiresManualReview: boolean;
  /** Rule identifier from the underlying tool, when there is one. */
  ruleId?: string;
  /** Docs link for the rule, when available. */
  helpUrl?: string;
}

export interface SeveritySummary {
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  suggestion: number;
}

export interface AnalysisResult {
  framework: Framework;
  /** 0–100. A heuristic, never a compliance guarantee. */
  score: number;
  summary: SeveritySummary;
  issues: AccessibilityIssue[];
  /** Fully corrected component (accessibility-only changes). */
  correctedCode: string;
  /** Which layers actually ran, for the privacy / transparency UI. */
  layers: AnalysisLayerInfo[];
  /** True if any layer sent code off the device. Always false in the MVP. */
  sentToRemoteService: boolean;
  analyzedAt: string;
  /** Human-readable notes about coverage limits for this run. */
  notes: string[];
}

export interface AnalysisLayerInfo {
  id: 'axe' | 'static' | 'ai';
  label: string;
  ran: boolean;
  location: 'local' | 'remote';
  findingCount: number;
  note?: string;
}

/** Ordered most-to-least severe. */
export const SEVERITY_ORDER: Severity[] = ['critical', 'serious', 'moderate', 'minor', 'suggestion'];

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 15,
  serious: 10,
  moderate: 5,
  minor: 3,
  suggestion: 1,
};

export interface SeverityMeta {
  key: Severity;
  label: string;
  /** Non-color cue: a short glyph rendered alongside the label. */
  glyph: string;
  /** CSS custom-property names for text + background. */
  colorVar: string;
  bgVar: string;
  /** Screen-reader phrasing. */
  srLabel: string;
}

export const SEVERITY_META: Record<Severity, SeverityMeta> = {
  critical: {
    key: 'critical',
    label: 'Critical',
    glyph: '✕', // ✕
    colorVar: '--sev-critical',
    bgVar: '--sev-critical-bg',
    srLabel: 'Critical severity',
  },
  serious: {
    key: 'serious',
    label: 'Serious',
    glyph: '▲', // ▲
    colorVar: '--sev-serious',
    bgVar: '--sev-serious-bg',
    srLabel: 'Serious severity',
  },
  moderate: {
    key: 'moderate',
    label: 'Moderate',
    glyph: '◆', // ◆
    colorVar: '--sev-moderate',
    bgVar: '--sev-moderate-bg',
    srLabel: 'Moderate severity',
  },
  minor: {
    key: 'minor',
    label: 'Minor',
    glyph: '○', // ○
    colorVar: '--sev-minor',
    bgVar: '--sev-minor-bg',
    srLabel: 'Minor severity',
  },
  suggestion: {
    key: 'suggestion',
    label: 'Suggestion',
    glyph: 'ℹ', // ℹ
    colorVar: '--sev-suggestion',
    bgVar: '--sev-suggestion-bg',
    srLabel: 'Suggestion',
  },
};

export function emptySummary(): SeveritySummary {
  return { critical: 0, serious: 0, moderate: 0, minor: 0, suggestion: 0 };
}

export function summarize(issues: AccessibilityIssue[]): SeveritySummary {
  const s = emptySummary();
  for (const issue of issues) s[issue.severity]++;
  return s;
}

/**
 * Heuristic score. Starts at 100 and subtracts a weight per finding, with
 * diminishing returns so a very broken snippet still lands above zero.
 * This is a triage signal, not a pass/fail verdict.
 */
export function scoreFromIssues(issues: AccessibilityIssue[]): number {
  let penalty = 0;
  const counts = summarize(issues);
  for (const sev of SEVERITY_ORDER) {
    const n = counts[sev];
    const w = SEVERITY_WEIGHT[sev];
    // First few of each severity hurt at full weight, then taper.
    for (let i = 0; i < n; i++) {
      penalty += i < 3 ? w : Math.max(1, Math.round(w / 2));
    }
  }
  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}
