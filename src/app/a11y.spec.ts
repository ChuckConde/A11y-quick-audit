import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import axe from 'axe-core';
import { routes } from './app.routes';
import { ACCESSIBILITY_AI_PROVIDER } from './analysis/ai/ai-provider';
import { MockAIProvider } from './analysis/ai/mock-ai-provider';
import { AnalyzerPage } from './features/analyzer/analyzer-page';
import { LearnPage } from './features/learn/learn-page';
import { AboutPage } from './features/about/about-page';
import { WcagPage } from './features/wcag/wcag-page';

/**
 * Automated accessibility checks against the app's own UI.
 *
 * jsdom cannot evaluate layout- or rendering-dependent rules (colour contrast,
 * target size, reflow), so this is a smoke test for the structural rules that
 * do work headless: names, labels, roles, ARIA validity, list structure,
 * duplicate ids. It is a floor, not a substitute for the in-browser audit.
 */
const STRUCTURAL_RULES = [
  'image-alt',
  'button-name',
  'link-name',
  'label',
  'aria-valid-attr',
  'aria-valid-attr-value',
  'aria-allowed-attr',
  'aria-allowed-role',
  'aria-required-attr',
  'aria-prohibited-attr',
  'aria-hidden-focus',
  'list',
  'listitem',
  'definition-list',
  'dlitem',
  'duplicate-id-aria',
  'nested-interactive',
  'heading-order',
  'landmark-unique',
];

async function auditComponent(type: Parameters<typeof TestBed.createComponent>[0]): Promise<void> {
  TestBed.configureTestingModule({
    imports: [type as never],
    providers: [
      provideZonelessChangeDetection(),
      provideRouter(routes),
      { provide: ACCESSIBILITY_AI_PROVIDER, useExisting: MockAIProvider },
    ],
  });
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await fixture.whenStable();

  const results = await axe.run(fixture.nativeElement as HTMLElement, {
    runOnly: { type: 'rule', values: STRUCTURAL_RULES },
    resultTypes: ['violations'],
  });

  const summary = results.violations
    .map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.html ?? ''}`)
    .join('\n');
  expect(summary).toBe('');
}

describe('App accessibility (headless smoke test)', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('Analyzer page has no structural a11y violations', async () => {
    await auditComponent(AnalyzerPage);
  });

  it('Learn page has no structural a11y violations', async () => {
    await auditComponent(LearnPage);
  });

  it('About page has no structural a11y violations', async () => {
    await auditComponent(AboutPage);
  });

  it('WCAG page has no structural a11y violations', async () => {
    await auditComponent(WcagPage);
  });
});
