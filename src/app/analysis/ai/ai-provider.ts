import { InjectionToken } from '@angular/core';
import type { AccessibilityIssue, Framework } from '../models';

/**
 * Layer 2 (semantic) provider contract.
 *
 * Implementations interpret context an automated rule engine cannot: whether an
 * alt text is *meaningful*, whether a label is *misleading*, focus-management
 * concerns, etc. Every finding an implementation returns MUST set
 * `source: 'ai'` and, unless it is genuinely certain, `requiresManualReview: true`.
 *
 * The rest of the app depends only on this interface, so a real provider
 * (Anthropic, OpenAI, a self-hosted model, …) can be dropped in later by
 * swapping the token binding in `app.config.ts` — no other file changes.
 */
export interface AccessibilityAIProvider {
  readonly id: string;
  readonly displayName: string;
  /** True when analyze() transmits code off the user's device. */
  readonly sendsCodeRemotely: boolean;

  analyze(code: string, framework: Framework): Promise<AccessibilityIssue[]>;
}

export const ACCESSIBILITY_AI_PROVIDER = new InjectionToken<AccessibilityAIProvider>(
  'ACCESSIBILITY_AI_PROVIDER',
);
