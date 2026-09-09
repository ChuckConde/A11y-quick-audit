import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { AnalysisLayerInfo } from '../../../analysis/models';

@Component({
  selector: 'app-privacy-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="privacy card" aria-labelledby="privacy-heading">
      <h3 id="privacy-heading">
        <span aria-hidden="true">{{ anyRemote() ? '☁' : '🔒' }}</span>
        Where your code was processed
      </h3>

      @if (layers(); as ls) {
        <ul class="layer-list">
          @for (layer of ls; track layer.id) {
            <li>
              <span
                class="pill"
                [class.pill--local]="layer.location === 'local'"
                [class.pill--remote]="layer.location === 'remote'"
              >
                {{ layer.location === 'local' ? 'In your browser' : 'Sent to a service' }}
              </span>
              <span class="layer-name">{{ layer.label }}</span>
              <span class="layer-status">
                @if (!layer.ran) {
                  not run
                } @else {
                  {{ layer.findingCount }} finding{{ layer.findingCount === 1 ? '' : 's' }}
                }
              </span>
              @if (layer.note) {
                <span class="layer-note">{{ layer.note }}</span>
              }
            </li>
          }
        </ul>
      }

      <p class="privacy-summary">
        @if (anyRemote()) {
          Some analysis was performed by an external service, so that code left your device
          for this run.
        } @else {
          All analysis ran locally in your browser. <strong>No code was sent anywhere</strong>,
          and nothing is stored — reload the page and it is gone.
        }
      </p>
    </section>
  `,
  styles: [
    `
      .privacy {
        padding: var(--space-4) var(--space-5);
      }
      .privacy h3 {
        font-size: 0.95rem;
        margin: 0 0 var(--space-3);
      }
      .layer-list {
        list-style: none;
        margin: 0 0 var(--space-3);
        padding: 0;
        display: grid;
        gap: var(--space-2);
      }
      .layer-list li {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 0.5rem 0.75rem;
        align-items: center;
        font-size: 0.88rem;
      }
      .layer-note {
        grid-column: 1 / -1;
        font-size: 0.8rem;
        color: var(--color-text-faint);
      }
      .pill {
        font-size: 0.72rem;
        font-weight: 700;
        padding: 0.1em 0.5em;
        border-radius: var(--radius-sm);
        border: 1px solid currentColor;
        white-space: nowrap;
      }
      .pill--local {
        color: var(--color-good);
        background: var(--color-good-bg);
      }
      .pill--remote {
        color: var(--sev-serious);
        background: var(--sev-serious-bg);
      }
      .layer-name {
        font-weight: 550;
      }
      .layer-status {
        color: var(--color-text-muted);
        font-variant-numeric: tabular-nums;
      }
      .privacy-summary {
        margin: 0;
        font-size: 0.85rem;
        color: var(--color-text-muted);
      }
    `,
  ],
})
export class PrivacyPanel {
  readonly layers = input.required<AnalysisLayerInfo[]>();
  readonly anyRemote = input(false);
}
