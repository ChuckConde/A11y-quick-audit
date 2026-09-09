import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { ClipboardService } from './clipboard.service';

/**
 * Copy-to-clipboard button with an accessible, screen-reader-announced result.
 * The transient "Copied" state is exposed via an aria-live region rather than
 * colour alone.
 */
@Component({
  selector: 'app-copy-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="btn btn--sm"
      [class.is-done]="state() === 'done'"
      [disabled]="state() === 'working'"
      (click)="run()"
    >
      <span aria-hidden="true">{{ state() === 'done' ? '✔' : '⧉' }}</span>
      <span>{{ label() }}</span>
    </button>
    <span class="visually-hidden" role="status">{{ liveMessage() }}</span>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
      }
      .is-done {
        border-color: var(--color-good);
        color: var(--color-good);
      }
    `,
  ],
})
export class CopyButton {
  private readonly clipboard = inject(ClipboardService);

  /** Text to copy. */
  readonly value = input.required<string>();
  /** Visible label in the idle state. */
  readonly idleLabel = input('Copy');
  /** What was copied, for the screen-reader announcement (e.g. "corrected code"). */
  readonly what = input('to clipboard');

  protected readonly state = signal<'idle' | 'working' | 'done' | 'error'>('idle');
  protected readonly liveMessage = signal('');

  protected label(): string {
    switch (this.state()) {
      case 'done':
        return 'Copied';
      case 'error':
        return 'Copy failed';
      default:
        return this.idleLabel();
    }
  }

  protected async run(): Promise<void> {
    this.state.set('working');
    const ok = await this.clipboard.copy(this.value());
    this.state.set(ok ? 'done' : 'error');
    this.liveMessage.set(ok ? `Copied ${this.what()}.` : 'Copy failed. You can select the text manually.');
    setTimeout(() => {
      this.state.set('idle');
      this.liveMessage.set('');
    }, 2500);
  }
}
