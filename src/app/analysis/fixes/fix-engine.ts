import type { AccessibilityIssue } from '../models';

export interface CorrectedCodeResult {
  code: string;
  /** Ids of issues whose fix was applied to the corrected code. */
  appliedIssueIds: string[];
  /** Ids of issues that still need a human (no safe automatic fix). */
  manualIssueIds: string[];
}

/**
 * Produce a corrected version of the component by applying *only* the
 * per-issue text substitutions we are confident about.
 *
 * Rules:
 *  - We replace the exact `affectedCode` substring with `fixedCode`, once.
 *  - Issues without a `fixedCode`, or whose `affectedCode` can't be found
 *    verbatim, are left untouched and reported as manual.
 *  - Nothing else in the source is reformatted or rewritten.
 */
export function buildCorrectedCode(
  original: string,
  issues: AccessibilityIssue[],
): CorrectedCodeResult {
  let code = original;
  const appliedIssueIds: string[] = [];
  const manualIssueIds: string[] = [];

  for (const issue of issues) {
    const applied = applyOne(code, issue);
    if (applied) {
      code = applied;
      appliedIssueIds.push(issue.id);
    } else {
      manualIssueIds.push(issue.id);
    }
  }

  return { code, appliedIssueIds, manualIssueIds };
}

/** Apply a single issue's fix if it is safe to do so; return null otherwise. */
export function applyOne(code: string, issue: AccessibilityIssue): string | null {
  if (!issue.fixedCode || !issue.affectedCode) return null;
  const needle = issue.affectedCode.trim();
  const replacement = issue.fixedCode.trim();
  if (needle === replacement) return null;

  const idx = code.indexOf(needle);
  if (idx !== -1) {
    return code.slice(0, idx) + replacement + code.slice(idx + needle.length);
  }

  // Fall back to a whitespace-insensitive match so minor indentation
  // differences in the captured snippet don't block an otherwise safe fix.
  const loose = buildLooseMatcher(needle);
  const m = loose.exec(code);
  if (m) {
    return code.slice(0, m.index) + replacement + code.slice(m.index + m[0].length);
  }
  return null;
}

function buildLooseMatcher(snippet: string): RegExp {
  const escaped = snippet
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+');
  return new RegExp(escaped);
}
