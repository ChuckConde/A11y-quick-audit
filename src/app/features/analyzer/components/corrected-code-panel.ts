import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { Framework } from '../../../analysis/models';
import { CodeEditor } from '../../../shared/monaco/code-editor';
import { CopyButton } from '../../../shared/copy-button';

type View = 'corrected' | 'original' | 'diff';

let gid = 0;

@Component({
  selector: 'app-corrected-code-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CodeEditor, CopyButton],
  template: `
    <section class="panel card" aria-labelledby="cc-heading">
      <div class="panel-head">
        <h3 id="cc-heading">Corrected code</h3>
        <app-copy-button [value]="corrected()" idleLabel="Copy corrected" what="the full corrected component" />
      </div>

      <p class="panel-note">
        {{ appliedCount() }} accessibility fix{{ appliedCount() === 1 ? '' : 'es' }} applied.
        @if (manualCount() > 0) {
          <strong>{{ manualCount() }}</strong> more auto-fixable finding{{ manualCount() === 1 ? ' is' : 's are' }}
          currently reset — re-apply {{ manualCount() === 1 ? 'it' : 'them' }} from the list above.
        }
        Findings without an automatic fix still need a manual change. Unrelated code and
        formatting are left untouched.
      </p>

      <fieldset class="view-switch">
        <legend class="visually-hidden">Choose which version to show</legend>
        @for (opt of options; track opt.value) {
          <label [class.is-active]="view() === opt.value">
            <input
              type="radio"
              name="cc-view-{{ groupId }}"
              [value]="opt.value"
              [checked]="view() === opt.value"
              (change)="view.set(opt.value)"
            />
            <span>{{ opt.label }}</span>
          </label>
        }
      </fieldset>

      <div class="editor-wrap" [style.--editor-height]="'420px'">
        @switch (view()) {
          @case ('diff') {
            <app-code-editor
              mode="diff"
              [original]="original()"
              [value]="corrected()"
              [framework]="framework()"
              label="Diff: original versus corrected code"
            />
          }
          @case ('original') {
            <app-code-editor
              [value]="original()"
              [framework]="framework()"
              [readOnly]="true"
              label="Original code (read-only)"
            />
          }
          @default {
            <app-code-editor
              [value]="corrected()"
              [framework]="framework()"
              [readOnly]="true"
              label="Corrected code (read-only)"
            />
          }
        }
      </div>
    </section>
  `,
  styles: [
    `
      .panel {
        padding: var(--space-5);
      }
      .panel-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3);
        flex-wrap: wrap;
      }
      .panel-head h3 {
        margin: 0;
      }
      .panel-note {
        font-size: 0.85rem;
        color: var(--color-text-muted);
        margin: var(--space-2) 0 var(--space-4);
      }
      .view-switch {
        border: 0;
        margin: 0 0 var(--space-3);
        padding: 0;
        display: inline-flex;
        gap: 0;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-md);
        overflow: hidden;
      }
      .view-switch label {
        position: relative;
        padding: 0.4rem 0.8rem;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        color: var(--color-text-muted);
        border-right: 1px solid var(--color-border-strong);
      }
      .view-switch label:last-child {
        border-right: 0;
      }
      .view-switch label.is-active {
        background: var(--color-accent);
        color: var(--color-accent-contrast);
      }
      .view-switch input {
        position: absolute;
        opacity: 0;
        inset: 0;
        width: 100%;
        cursor: pointer;
      }
      .view-switch label:has(input:focus-visible) {
        outline: var(--focus-ring);
        outline-offset: 2px;
      }
    `,
  ],
})
export class CorrectedCodePanel {
  readonly original = input.required<string>();
  readonly corrected = input.required<string>();
  readonly framework = input.required<Framework>();
  readonly appliedCount = input(0);
  readonly manualCount = input(0);

  protected readonly groupId = ++gid;
  protected readonly view = signal<View>('corrected');
  protected readonly options: { value: View; label: string }[] = [
    { value: 'corrected', label: 'Corrected' },
    { value: 'original', label: 'Original' },
    { value: 'diff', label: 'Diff' },
  ];

  protected readonly unchanged = computed(() => this.original() === this.corrected());
}
