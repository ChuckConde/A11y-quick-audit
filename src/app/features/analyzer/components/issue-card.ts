import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { type AccessibilityIssue } from '../../../analysis/models';
import { SeverityBadge } from '../../../shared/severity-badge';
import { CopyButton } from '../../../shared/copy-button';

const SOURCE_LABEL: Record<AccessibilityIssue['source'], string> = {
  axe: 'axe-core',
  'static-analysis': 'Structural check',
  ai: 'Semantic model',
};

@Component({
  selector: 'app-issue-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, SeverityBadge, CopyButton],
  template: `
    <details class="issue" [open]="startOpen()" [id]="'issue-' + issue().id">
      <summary>
        <span class="sum-row">
          <app-severity-badge [severity]="issue().severity" size="sm" />
          <span class="sum-title">{{ issue().title }}</span>
        </span>
        <span class="sum-sub">
          <span class="tag" [class.tag--review]="issue().requiresManualReview">
            {{ issue().requiresManualReview ? 'Potential — verify manually' : 'Confirmed' }}
          </span>
          <span class="tag tag--muted">{{ sourceLabel() }}</span>
          <span class="chev" aria-hidden="true">▸</span>
        </span>
      </summary>

      <div class="body">
        @if (issue().requiresManualReview) {
          <p class="review-callout">
            <span aria-hidden="true">⚠</span>
            This finding needs a human to confirm. It is flagged from
            {{ issue().source === 'ai' ? 'contextual interpretation' : 'a check that cannot see enough context' }},
            not a definitive rule violation. Do not report it as WCAG non-conformance without verifying.
          </p>
        }

        <h4>Problem</h4>
        <p>{{ issue().description }}</p>

        <h4>Affected code</h4>
        <pre><code>{{ issue().affectedCode }}</code></pre>
        @if (issue().line) {
          <p class="loc">Around line {{ issue().line }}{{ frameworkNote() }}</p>
        }

        <h4>Why this matters</h4>
        <p>{{ issue().explanation }}</p>

        @if (issue().wcagCriteria.length) {
          <h4>WCAG</h4>
          <ul class="wcag-list">
            @for (c of issue().wcagCriteria; track c) {
              <li>
                <a [routerLink]="['/wcag']" [fragment]="c">
                  WCAG {{ c }} <span class="visually-hidden">— open in the WCAG reference</span>
                </a>
              </li>
            }
          </ul>
        } @else {
          <h4>WCAG</h4>
          <p class="loc">
            No specific success criterion — this is advisory good practice rather than a
            conformance requirement.
          </p>
        }

        @if (issue().suggestedFix) {
          <h4>Suggested fix</h4>
          <p>{{ issue().suggestedFix }}</p>
        }

        @if (issue().fixedCode) {
          <h4>Corrected snippet</h4>
          <pre><code>{{ issue().fixedCode }}</code></pre>
          <div class="actions">
            <button
              type="button"
              class="btn btn--sm btn--primary"
              [disabled]="applied()"
              (click)="applyFix.emit(issue().id)"
            >
              <span aria-hidden="true">{{ applied() ? '✔' : '↧' }}</span>
              {{ applied() ? 'Applied to corrected code' : 'Apply this fix' }}
            </button>
            <app-copy-button
              [value]="issue().fixedCode!"
              idleLabel="Copy fix"
              what="the corrected snippet"
            />
          </div>
        } @else {
          <p class="loc no-autofix">
            No automatic fix for this one — apply the guidance above by hand.
          </p>
        }

        <p class="meta-line">
          Source: {{ sourceLabel() }} · Confidence: {{ issue().confidence }}
          @if (issue().helpUrl) {
            · <a [href]="issue().helpUrl" rel="noopener">Rule docs
              <span class="visually-hidden">(opens in a new tab)</span></a>
          }
        </p>
      </div>
    </details>
  `,
  styles: [
    `
      .issue {
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        background: var(--color-surface);
        margin-bottom: var(--space-3);
      }
      .issue[open] {
        border-color: var(--color-border-strong);
      }
      summary {
        list-style: none;
        cursor: pointer;
        padding: var(--space-3) var(--space-4);
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2) var(--space-3);
        align-items: center;
        justify-content: space-between;
      }
      summary::-webkit-details-marker {
        display: none;
      }
      summary:focus-visible {
        outline: var(--focus-ring);
        outline-offset: -2px;
        border-radius: var(--radius-md);
      }
      .sum-row {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        min-width: 0;
      }
      .sum-title {
        font-weight: 600;
        color: var(--color-heading);
      }
      .sum-sub {
        display: flex;
        align-items: center;
        gap: var(--space-2);
      }
      .tag {
        font-size: 0.72rem;
        font-weight: 600;
        padding: 0.1em 0.5em;
        border-radius: var(--radius-sm);
        border: 1px solid var(--color-good);
        color: var(--color-good);
        background: var(--color-good-bg);
      }
      .tag--review {
        border-color: var(--sev-moderate);
        color: var(--sev-moderate);
        background: var(--sev-moderate-bg);
      }
      .tag--muted {
        border-color: var(--color-border-strong);
        color: var(--color-text-muted);
        background: transparent;
      }
      .chev {
        transition: transform 0.15s ease;
        color: var(--color-text-faint);
      }
      .issue[open] .chev {
        transform: rotate(90deg);
      }
      .body {
        padding: 0 var(--space-4) var(--space-4);
        border-top: 1px solid var(--color-border);
      }
      .body h4 {
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--color-text-muted);
        margin: var(--space-4) 0 var(--space-1);
      }
      .body p {
        margin: 0 0 var(--space-2);
      }
      .review-callout {
        margin-top: var(--space-3);
        padding: var(--space-3);
        border-radius: var(--radius-md);
        background: var(--sev-moderate-bg);
        color: var(--sev-moderate);
        border: 1px solid var(--sev-moderate);
        font-size: 0.9rem;
      }
      pre {
        margin: 0;
        font-size: 0.82rem;
      }
      .loc {
        font-size: 0.8rem;
        color: var(--color-text-faint);
      }
      .no-autofix {
        margin-top: var(--space-2);
        font-style: italic;
      }
      .wcag-list {
        margin: 0;
        padding-left: 1.1rem;
        font-size: 0.9rem;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-3);
        align-items: center;
        margin-top: var(--space-3);
      }
      .meta-line {
        margin-top: var(--space-4);
        padding-top: var(--space-2);
        border-top: 1px dashed var(--color-border);
        font-size: 0.78rem;
        color: var(--color-text-faint);
      }
    `,
  ],
})
export class IssueCard {
  readonly issue = input.required<AccessibilityIssue>();
  readonly startOpen = input(false);
  readonly applied = input(false);
  readonly framework = input<'html' | 'angular' | 'react'>('html');

  readonly applyFix = output<string>();

  protected readonly sourceLabel = computed(() => SOURCE_LABEL[this.issue().source]);
  protected readonly frameworkNote = computed(() =>
    this.framework() === 'html' ? '' : ' (line numbers are approximate for framework code)',
  );
}
