import { Injectable } from '@angular/core';
import type { AccessibilityIssue, Framework } from '../models';
import type { AccessibilityAIProvider } from './ai-provider';
import { firstMatch, snippetAround } from '../util/text';

/**
 * MVP stand-in for Layer 2. It runs entirely in the browser and sends nothing
 * anywhere. Instead of real reasoning it recognises a handful of well-known
 * anti-patterns and returns the kind of *contextual* finding a language model
 * would produce — always flagged as "potential, needs manual review".
 *
 * The realistic-but-canned output is deliberate: it lets the rest of the
 * product (schema, UI, diffing, copy) be built and judged before any model
 * integration exists.
 */
@Injectable({ providedIn: 'root' })
export class MockAIProvider implements AccessibilityAIProvider {
  readonly id = 'mock-local';
  readonly displayName = 'Local heuristic model (mock)';
  readonly sendsCodeRemotely = false;

  async analyze(code: string, _framework: Framework): Promise<AccessibilityIssue[]> {
    // Simulate a little latency so the UI's loading/announce states are exercised.
    await new Promise((r) => setTimeout(r, 450));

    const issues: AccessibilityIssue[] = [];
    let n = 0;
    const nextId = () => `ai-${++n}`;

    // 1. Non-descriptive link text.
    const vagueLink = firstMatch(
      code,
      /<a\b[^>]*>\s*(click here|here|read more|learn more|more|link)\s*<\/a>/i,
    );
    if (vagueLink) {
      issues.push({
        id: nextId(),
        title: 'Link text may not describe its destination',
        description: 'Generic link text like “click here” is ambiguous out of context.',
        severity: 'moderate',
        confidence: 'medium',
        source: 'ai',
        wcagCriteria: ['2.4.4'],
        affectedCode: vagueLink.text.trim(),
        line: vagueLink.line,
        explanation:
          'Screen-reader users often navigate by pulling up a list of links. Out of context, ' +
          '“click here” gives no idea where the link goes. Link text should make sense on its own.',
        suggestedFix:
          'Rewrite the link text to name the destination or action, e.g. “View the pricing page”. ' +
          'If the visible text must stay generic for design reasons, add an aria-label with the full description.',
        requiresManualReview: true,
      });
    }

    // 2. Placeholder used instead of a label.
    const placeholderOnly = firstMatch(
      code,
      /<input\b(?![^>]*\baria-label)(?![^>]*\baria-labelledby)[^>]*\bplaceholder=(["'])(.*?)\1[^>]*>/i,
    );
    if (placeholderOnly) {
      issues.push({
        id: nextId(),
        title: 'Placeholder text may be acting as the only label',
        description: 'A placeholder is not a reliable substitute for a visible label.',
        severity: 'serious',
        confidence: 'medium',
        source: 'ai',
        wcagCriteria: ['1.3.1', '3.3.2', '4.1.2'],
        affectedCode: placeholderOnly.match,
        line: placeholderOnly.line,
        explanation:
          'Placeholder text disappears once the user types, is often low-contrast, and is not ' +
          'consistently exposed as the field’s accessible name. If this input has no associated ' +
          '<label>, users may not know what it is for.',
        suggestedFix:
          'Add a programmatically associated <label> (via for/id) and keep the placeholder only for ' +
          'example formatting, or remove it.',
        requiresManualReview: true,
      });
    }

    // 3. Div/span with click handler — likely a fake button.
    const fakeButton = firstMatch(
      code,
      /<(div|span)\b[^>]*\b\(?on[cC]lick\)?=[^>]*>/,
    );
    if (fakeButton) {
      issues.push({
        id: nextId(),
        title: 'Clickable element may not be keyboard operable',
        description: 'A <div>/<span> with a click handler is usually not focusable or key-activated.',
        severity: 'serious',
        confidence: 'medium',
        source: 'ai',
        wcagCriteria: ['2.1.1', '4.1.2'],
        affectedCode: fakeButton.match,
        line: fakeButton.line,
        explanation:
          'Only interactive elements (or elements with an appropriate role plus tabindex and key ' +
          'handlers) are reachable and operable by keyboard. A bare <div onclick> works with a mouse ' +
          'but not with Tab + Enter/Space, and exposes no role to assistive technology.',
        suggestedFix:
          'Use a real <button> (or <a> if it navigates). If the element must stay a <div>, add ' +
          'role="button", tabindex="0", and handlers for both Enter and Space.',
        requiresManualReview: true,
      });
    }

    // 4. Autofocus.
    const autofocus = firstMatch(code, /<[^>]*\bautofocus\b[^>]*>/i);
    if (autofocus) {
      issues.push({
        id: nextId(),
        title: 'Automatic focus on load can disorient users',
        description: 'autofocus moves the user’s starting point without their consent.',
        severity: 'minor',
        confidence: 'low',
        source: 'ai',
        wcagCriteria: ['2.4.3'],
        affectedCode: autofocus.match,
        line: autofocus.line,
        explanation:
          'Auto-focusing an element on page load can skip past important context for screen-reader ' +
          'and screen-magnifier users, and can trigger the on-screen keyboard on mobile unexpectedly. ' +
          'It is sometimes appropriate (e.g. a search-only page) — this needs a human judgement call.',
        suggestedFix:
          'Confirm the field is genuinely the primary purpose of the view. If not, remove autofocus ' +
          'and let focus start at the top of the document.',
        requiresManualReview: true,
      });
    }

    // 5. Positive tabindex (context: AI frames the UX cost; static layer also flags it).
    const positiveTab = firstMatch(code, /tabindex=(["'])\s*([1-9]\d*)\s*\1/i);
    if (positiveTab) {
      issues.push({
        id: nextId(),
        title: 'Manual tab order is likely to drift out of sync',
        description: 'A positive tabindex overrides DOM order and is fragile to maintain.',
        severity: 'moderate',
        confidence: 'medium',
        source: 'ai',
        wcagCriteria: ['2.4.3'],
        affectedCode: positiveTab.match,
        line: positiveTab.line,
        explanation:
          'Positive tabindex values pull elements to the front of the tab sequence regardless of ' +
          'where they sit visually. As the component changes, the intended order tends to break, ' +
          'producing a focus order that does not match the reading order.',
        suggestedFix:
          'Remove the positive value. Order the DOM to match the visual order, and use tabindex="0" ' +
          '(or nothing) so elements follow document order.',
        requiresManualReview: true,
      });
    }

    return issues.map((issue) => ({
      ...issue,
      // Keep affected snippets bounded even if a regex captured a lot.
      affectedCode: snippetAround(issue.affectedCode),
    }));
  }
}
