import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SEVERITY_META, type Severity } from '../analysis/models';

/**
 * Severity indicator that never relies on colour alone: it always shows a
 * distinct glyph and the severity word.
 */
@Component({
  selector: 'app-severity-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="badge"
      [style.--sev-fg]="'var(' + meta().colorVar + ')'"
      [style.--sev-bg]="'var(' + meta().bgVar + ')'"
      [class.badge--sm]="size() === 'sm'"
    >
      <span class="glyph" aria-hidden="true">{{ meta().glyph }}</span>
      <span>{{ meta().label }}</span>
      <span class="visually-hidden">severity</span>
    </span>
  `,
  styles: [
    `
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 0.4em;
        padding: 0.2em 0.6em;
        border-radius: 999px;
        font-size: 0.8rem;
        font-weight: 650;
        line-height: 1.5;
        color: var(--sev-fg);
        background: var(--sev-bg);
        border: 1px solid var(--sev-fg);
        white-space: nowrap;
      }
      .badge--sm {
        font-size: 0.72rem;
        padding: 0.1em 0.5em;
      }
      .glyph {
        font-size: 0.85em;
      }
      @media (forced-colors: active) {
        .badge {
          border: 1px solid CanvasText;
          color: CanvasText;
          background: Canvas;
        }
      }
    `,
  ],
})
export class SeverityBadge {
  readonly severity = input.required<Severity>();
  readonly size = input<'sm' | 'md'>('md');
  protected readonly meta = computed(() => SEVERITY_META[this.severity()]);
}
