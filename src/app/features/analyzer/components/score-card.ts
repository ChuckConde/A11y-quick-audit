import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SEVERITY_META, SEVERITY_ORDER, type AnalysisResult, type Severity } from '../../../analysis/models';

@Component({
  selector: 'app-score-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="score-card card">
      <div class="score">
        <div
          class="dial"
          role="img"
          [attr.aria-label]="'Accessibility score ' + result().score + ' out of 100, rated ' + band().label"
          [style.--pct.%]="result().score"
          [style.--dial-color]="band().color"
        >
          <span class="score-num">{{ result().score }}</span>
          <span class="score-den">/ 100</span>
        </div>
        <div class="score-meta">
          <p class="score-band" [style.color]="band().color">
            <span aria-hidden="true">{{ band().glyph }}</span> {{ band().label }}
          </p>
          <p class="score-note">
            A heuristic triage signal. It is <strong>not</strong> a WCAG conformance rating —
            a score of 100 does not mean the component is accessible.
          </p>
        </div>
      </div>

      <ul class="summary" aria-label="Findings by severity">
        @for (row of rows(); track row.key) {
          <li>
            <span class="count" [style.color]="row.color">{{ row.count }}</span>
            <span class="lbl">
              <span aria-hidden="true" [style.color]="row.color">{{ row.glyph }}</span>
              {{ row.label }}
            </span>
          </li>
        }
      </ul>
    </div>
  `,
  styles: [
    `
      .score-card {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-5);
      }
      .score {
        display: flex;
        align-items: center;
        gap: var(--space-5);
      }
      .dial {
        --size: 108px;
        position: relative;
        width: var(--size);
        height: var(--size);
        flex: none;
        border-radius: 50%;
        display: grid;
        place-content: center;
        text-align: center;
        background: conic-gradient(
          var(--dial-color) calc(var(--pct) * 1%),
          var(--color-bg-inset) 0
        );
      }
      .dial::after {
        content: '';
        position: absolute;
        inset: 10px;
        border-radius: 50%;
        background: var(--color-surface);
      }
      .score-num,
      .score-den {
        position: relative;
        z-index: 1;
        display: block;
        font-variant-numeric: tabular-nums;
      }
      .score-num {
        font-size: 2rem;
        font-weight: 700;
        color: var(--color-heading);
        line-height: 1;
      }
      .score-den {
        font-size: 0.8rem;
        color: var(--color-text-muted);
      }
      .score-band {
        font-weight: 700;
        margin: 0 0 var(--space-1);
      }
      .score-note {
        margin: 0;
        font-size: 0.85rem;
        color: var(--color-text-muted);
        max-width: 42ch;
      }
      .summary {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: var(--space-2);
        border-top: 1px solid var(--color-border);
        padding-top: var(--space-4);
      }
      .summary li {
        text-align: center;
        padding: var(--space-2);
        border-radius: var(--radius-md);
        background: var(--color-bg-subtle);
      }
      .count {
        display: block;
        font-size: 1.5rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }
      .lbl {
        font-size: 0.78rem;
        color: var(--color-text-muted);
      }
      @media (max-width: 560px) {
        .score {
          flex-direction: column;
          text-align: center;
        }
        .summary {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      @media (forced-colors: active) {
        .dial {
          background: Canvas;
          border: 2px solid CanvasText;
        }
      }
    `,
  ],
})
export class ScoreCard {
  readonly result = input.required<AnalysisResult>();

  protected readonly band = computed(() => {
    const s = this.result().score;
    if (s >= 90) return { label: 'Few issues found', glyph: '●', color: 'var(--color-good)' };
    if (s >= 70) return { label: 'Some issues to address', glyph: '●', color: 'var(--color-warn)' };
    if (s >= 40) return { label: 'Significant issues', glyph: '●', color: 'var(--sev-serious)' };
    return { label: 'Major issues', glyph: '●', color: 'var(--sev-critical)' };
  });

  protected readonly rows = computed(() =>
    SEVERITY_ORDER.map((key: Severity) => ({
      key,
      count: this.result().summary[key],
      label: SEVERITY_META[key].label,
      glyph: SEVERITY_META[key].glyph,
      color: `var(${SEVERITY_META[key].colorVar})`,
    })),
  );
}
