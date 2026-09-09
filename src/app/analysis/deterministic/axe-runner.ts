import axe, { type AxeResults, type Result, type ImpactValue } from 'axe-core';
import type { AccessibilityIssue, Confidence, Severity } from '../models';
import { collapseWs, snippetAround } from '../util/text';

/**
 * Layer 1a — axe-core, run entirely in the browser against a detached copy of
 * the user's markup. Nothing is transmitted anywhere.
 *
 * We deliberately restrict axe to rules that are meaningful on an isolated
 * fragment. Document-level rules (html-has-lang, document-title, region, …) are
 * handled by the static analyzer instead, because axe would otherwise evaluate
 * the host application's DOM rather than the pasted snippet.
 */
const FRAGMENT_SAFE_RULES = [
  'image-alt',
  'input-image-alt',
  'area-alt',
  'object-alt',
  'role-img-alt',
  'svg-img-alt',
  'button-name',
  'link-name',
  'label',
  'label-title-only',
  'form-field-multiple-labels',
  'select-name',
  'aria-input-field-name',
  'aria-toggle-field-name',
  'aria-command-name',
  'aria-tooltip-name',
  'aria-meter-name',
  'aria-progressbar-name',
  'aria-required-attr',
  'aria-required-children',
  'aria-required-parent',
  'aria-roles',
  'aria-valid-attr',
  'aria-valid-attr-value',
  'aria-allowed-attr',
  'aria-allowed-role',
  'aria-hidden-focus',
  'aria-prohibited-attr',
  'nested-interactive',
  'list',
  'listitem',
  'definition-list',
  'dlitem',
  'th-has-data-cells',
  'td-headers-attr',
  'scope-attr-valid',
  'table-fake-caption',
  'duplicate-id-aria',
  'tabindex',
  'autocomplete-valid',
  'frame-title',
  'heading-order',
  'presentation-role-conflict',
  'no-autoplay-audio',
];

const IMPACT_TO_SEVERITY: Record<ImpactValue & string, Severity> = {
  critical: 'critical',
  serious: 'serious',
  moderate: 'moderate',
  minor: 'minor',
};

function severityFor(impact: ImpactValue | null | undefined): Severity {
  return (impact && IMPACT_TO_SEVERITY[impact]) || 'moderate';
}

export interface AxeRunOutput {
  issues: AccessibilityIssue[];
  ran: boolean;
  note?: string;
}

/**
 * List-structure rules are prone to false positives once framework control
 * flow (`@for`, `.map()`) has been flattened by the normalizer, so callers can
 * ask to drop them for non-HTML input.
 */
export const NORMALIZATION_FRAGILE_RULES = ['list', 'listitem', 'definition-list', 'dlitem'];

export async function runAxe(html: string, excludeRules: string[] = []): Promise<AxeRunOutput> {
  if (typeof document === 'undefined') {
    return { issues: [], ran: false, note: 'axe-core needs a DOM; skipped in this environment.' };
  }
  const ruleValues = FRAGMENT_SAFE_RULES.filter((r) => !excludeRules.includes(r));

  const host = document.createElement('div');
  // NB: do not set aria-hidden / display:none here — axe-core skips any subtree
  // that is outside the accessibility tree, which would make every rule
  // "inapplicable". The host is only attached for the duration of the run and
  // is positioned far off-screen.
  host.style.cssText = 'position:absolute;left:-99999px;top:0;width:1024px;height:auto;';
  // A wrapper keeps axe's context scoped to just the pasted markup.
  const mount = document.createElement('div');
  mount.className = 'a11yfix-axe-mount';
  try {
    mount.innerHTML = html;
  } catch {
    return { issues: [], ran: false, note: 'Markup could not be parsed for axe-core.' };
  }
  host.appendChild(mount);
  document.body.appendChild(host);

  let results: AxeResults;
  try {
    results = await axe.run(mount, {
      runOnly: { type: 'rule', values: ruleValues },
      resultTypes: ['violations', 'incomplete'],
      // color-contrast is unreliable on off-screen, unstyled content.
      rules: { 'color-contrast': { enabled: false } },
      elementRef: false,
    });
  } catch (err) {
    document.body.removeChild(host);
    return {
      issues: [],
      ran: false,
      note: 'axe-core failed to run on this snippet: ' + (err as Error).message,
    };
  }
  document.body.removeChild(host);

  const issues: AccessibilityIssue[] = [];
  let counter = 0;

  const consume = (list: Result[], kind: 'violation' | 'incomplete') => {
    for (const r of list) {
      for (const node of r.nodes) {
        counter++;
        const confirmed = kind === 'violation';
        const confidence: Confidence = confirmed ? 'high' : 'medium';
        const snippet = snippetAround(node.html ?? '');
        const wcag = wcagFromTags(r.tags);
        issues.push({
          id: `axe-${counter}`,
          title: r.help,
          description: collapseWs(r.description),
          severity: severityFor(r.impact),
          confidence,
          source: 'axe',
          wcagCriteria: wcag,
          affectedCode: snippet,
          explanation: buildExplanation(r, confirmed),
          suggestedFix: formatFailureSummary(node.failureSummary),
          requiresManualReview: !confirmed,
          ruleId: r.id,
          helpUrl: r.helpUrl,
        });
      }
    }
  };

  consume(results.violations, 'violation');
  consume(results.incomplete, 'incomplete');

  return {
    issues,
    ran: true,
    note:
      'Colour-contrast checks are skipped here because the snippet is analysed without your ' +
      'stylesheet. Use the colour-contrast tooling in your browser devtools for that.',
  };
}

function buildExplanation(rule: Result, confirmed: boolean): string {
  const base = collapseWs(rule.description);
  const lead = confirmed
    ? 'axe-core deterministically detected this.'
    : 'axe-core flagged this but could not fully verify it — confirm it manually.';
  return `${lead} ${base}.`.replace(/\.\.+/g, '.');
}

/**
 * axe failure summaries look like:
 *   "Fix any of the following:\n  Element does not have inner text…\n  aria-label…"
 * Turn that into a single readable sentence with the options separated.
 */
function formatFailureSummary(summary: string | undefined): string | undefined {
  if (!summary) return undefined;
  const lines = summary
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return undefined;
  const [head, ...rest] = lines;
  const opener = /^Fix (any|all) of the following:?$/i.test(head)
    ? head.replace(/:?$/, ': ')
    : head + (rest.length ? '. ' : '');
  return (opener + rest.join('; ')).replace(/\s+/g, ' ').trim();
}

/** Pull bare WCAG criterion numbers (e.g. "1.1.1") from axe rule tags. */
function wcagFromTags(tags: string[]): string[] {
  const out = new Set<string>();
  for (const tag of tags) {
    const m = tag.match(/^wcag(\d)(\d)(\d+)$/);
    if (m) out.add(`${m[1]}.${m[2]}.${m[3]}`);
  }
  return [...out];
}
