import { scoreFromIssues, summarize, type AccessibilityIssue } from './models';
import { runStaticAnalysis } from './deterministic/static-analyzer';
import { buildCorrectedCode } from './fixes/fix-engine';
import { normalizeToHtml } from './deterministic/framework-normalizer';

function issue(partial: Partial<AccessibilityIssue>): AccessibilityIssue {
  return {
    id: 'x',
    title: 't',
    description: 'd',
    severity: 'moderate',
    confidence: 'high',
    source: 'static-analysis',
    wcagCriteria: [],
    affectedCode: '',
    explanation: 'e',
    requiresManualReview: false,
    ...partial,
  };
}

describe('scoreFromIssues', () => {
  it('is 100 for no issues', () => {
    expect(scoreFromIssues([])).toBe(100);
  });

  it('never drops below 0 and never exceeds 100', () => {
    const many = Array.from({ length: 40 }, () => issue({ severity: 'critical' }));
    const s = scoreFromIssues(many);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });

  it('penalises a critical more than a suggestion', () => {
    const crit = scoreFromIssues([issue({ severity: 'critical' })]);
    const sugg = scoreFromIssues([issue({ severity: 'suggestion' })]);
    expect(crit).toBeLessThan(sugg);
  });
});

describe('summarize', () => {
  it('counts by severity', () => {
    const s = summarize([
      issue({ severity: 'critical' }),
      issue({ severity: 'critical' }),
      issue({ severity: 'minor' }),
    ]);
    expect(s.critical).toBe(2);
    expect(s.minor).toBe(1);
    expect(s.serious).toBe(0);
  });
});

describe('runStaticAnalysis', () => {
  it('flags a missing lang on a full document', () => {
    const found = runStaticAnalysis('<!doctype html><html><head><title>x</title></head><body></body></html>');
    expect(found.some((i) => i.ruleId === 'html-has-lang')).toBe(true);
  });

  it('does not flag lang when it is present', () => {
    const found = runStaticAnalysis('<html lang="en"><head><title>x</title></head><body><main></main></body></html>');
    expect(found.some((i) => i.ruleId === 'html-has-lang')).toBe(false);
  });

  it('flags a disabled viewport zoom and offers a fix', () => {
    const found = runStaticAnalysis(
      '<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">',
    );
    const v = found.find((i) => i.ruleId === 'meta-viewport');
    expect(v).toBeTruthy();
    expect(v!.fixedCode).not.toContain('user-scalable');
  });

  it('flags duplicate ids', () => {
    const found = runStaticAnalysis('<div id="a"></div><span id="a"></span>');
    expect(found.some((i) => i.ruleId === 'duplicate-id')).toBe(true);
  });

  it('is quiet on a clean fragment', () => {
    const found = runStaticAnalysis('<button type="button">Save</button>');
    expect(found.length).toBe(0);
  });
});

describe('buildCorrectedCode', () => {
  it('applies a fix by exact substring and leaves the rest untouched', () => {
    const original = 'before <html> after';
    const res = buildCorrectedCode(original, [
      issue({ id: '1', affectedCode: '<html>', fixedCode: '<html lang="en">' }),
    ]);
    expect(res.code).toBe('before <html lang="en"> after');
    expect(res.appliedIssueIds).toEqual(['1']);
  });

  it('reports issues it cannot apply as manual', () => {
    const res = buildCorrectedCode('nothing to see', [
      issue({ id: '1', affectedCode: '<img>', fixedCode: '<img alt="">' }),
    ]);
    expect(res.manualIssueIds).toEqual(['1']);
    expect(res.code).toBe('nothing to see');
  });
});

describe('normalizeToHtml', () => {
  it('passes HTML through unchanged', () => {
    expect(normalizeToHtml('<p>hi</p>', 'html')).toEqual({ html: '<p>hi</p>', lossy: false, notes: [] });
  });

  it('rewrites JSX className and marks the result lossy', () => {
    const out = normalizeToHtml('<div className="x" onClick={go}>t</div>', 'react');
    expect(out.html).toContain('class="x"');
    expect(out.html).toContain('data-onclick');
    expect(out.lossy).toBe(true);
  });

  it('rewrites Angular bindings and event handlers', () => {
    const out = normalizeToHtml('<img [src]="a"><button (click)="go()">x</button>', 'angular');
    expect(out.html).toContain('src="a"');
    expect(out.html).toContain('data-onclick');
  });
});
