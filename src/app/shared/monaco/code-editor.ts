import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { editor } from 'monaco-editor';
import type { Framework } from '../../analysis/models';
import { loadMonaco, preferredMonacoTheme, type MonacoApi } from './monaco-loader';
import { ThemeService } from '../theme.service';

let uid = 0;

function monacoLanguageFor(framework: Framework): string {
  switch (framework) {
    case 'react':
      return 'javascript';
    case 'angular':
      return 'html';
    default:
      return 'html';
  }
}

/**
 * Thin wrapper around Monaco supporting a plain editor and a side-by-side diff.
 *
 * Accessibility:
 *  - the mounting element is labelled and described;
 *  - Monaco's own screen-reader mode is left on `auto`;
 *  - a visible hint explains how to move focus past the editor (Esc, then Tab),
 *    since a code editor legitimately captures Tab for indentation.
 */
@Component({
  selector: 'app-code-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="editor-frame">
      <!-- ARIA lives on Monaco's own input element (set via the ariaLabel option
           and wired up in mount()), not on this generic wrapper, where
           aria-* would be prohibited. -->
      <div #host class="editor-host"></div>
      @if (loading()) {
        <p class="editor-loading" role="status">Loading editor…</p>
      }
      @if (failed()) {
        <div class="editor-fallback">
          <label [attr.for]="taId" class="visually-hidden">{{ label() }}</label>
          <textarea
            [id]="taId"
            [attr.readonly]="readOnly() ? '' : null"
            [value]="value()"
            (input)="onTextarea($event)"
            spellcheck="false"
            autocapitalize="off"
            autocomplete="off"
          ></textarea>
        </div>
      }
    </div>
    <p [id]="hintId" class="editor-hint">
      {{ mode() === 'diff' ? 'Read-only diff. ' : '' }}
      To move focus out of the editor, press <kbd>Esc</kbd> then <kbd>Tab</kbd>.
      Press <kbd>Alt</kbd>+<kbd>F1</kbd> for the editor's own accessibility help.
    </p>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .editor-frame {
        position: relative;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        overflow: hidden;
        background: var(--code-bg);
      }
      .editor-host {
        width: 100%;
        height: var(--editor-height, 360px);
      }
      .editor-loading {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        margin: 0;
        color: var(--color-text-muted);
        background: var(--code-bg);
      }
      .editor-fallback textarea {
        width: 100%;
        height: var(--editor-height, 360px);
        border: 0;
        padding: var(--space-3);
        font-family: var(--font-mono);
        font-size: 0.85rem;
        line-height: 1.5;
        color: var(--color-text);
        background: var(--code-bg);
        resize: vertical;
      }
      .editor-hint {
        margin: var(--space-2) 0 0;
        font-size: 0.8rem;
        color: var(--color-text-muted);
      }
      .editor-hint kbd {
        border: 1px solid var(--color-border-strong);
        border-bottom-width: 2px;
        border-radius: 4px;
        padding: 0 0.3em;
        background: var(--color-bg-subtle);
      }
    `,
  ],
})
export class CodeEditor {
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly themeService = inject(ThemeService);

  readonly host = viewChild.required<ElementRef<HTMLElement>>('host');

  readonly value = input('');
  /** Diff "before" side. Only used when mode = 'diff'. */
  readonly original = input('');
  readonly framework = input<Framework>('html');
  readonly readOnly = input(false);
  readonly mode = input<'edit' | 'diff'>('edit');
  readonly label = input('Code editor');

  readonly valueChange = output<string>();

  protected readonly loading = signal(true);
  protected readonly failed = signal(false);

  protected readonly hintId = `ed-hint-${++uid}`;
  protected readonly taId = `ed-ta-${uid}`;

  private monaco: MonacoApi | null = null;
  private editor: editor.IStandaloneCodeEditor | null = null;
  private diffEditor: editor.IStandaloneDiffEditor | null = null;
  private models: editor.ITextModel[] = [];
  private applyingExternal = false;
  private readonly languageId = computed(() => monacoLanguageFor(this.framework()));

  constructor() {
    effect((onCleanup) => {
      // Depend on host being available.
      const el = this.host().nativeElement;
      let disposed = false;
      this.zone.runOutsideAngular(() => {
        loadMonaco()
          .then((m) => {
            if (disposed) return;
            this.monaco = m;
            this.mount(el);
            this.loading.set(false);
          })
          .catch(() => {
            this.zone.run(() => {
              this.loading.set(false);
              this.failed.set(true);
            });
          });
      });
      onCleanup(() => {
        disposed = true;
        this.dispose();
      });
    });

    // Push external value changes into an already-mounted editor.
    effect(() => {
      const next = this.value();
      if (!this.monaco) return;
      this.applyingExternal = true;
      if (this.editor) {
        if (this.editor.getValue() !== next) this.editor.setValue(next);
      }
      if (this.diffEditor) {
        const model = this.diffEditor.getModel();
        if (model && model.modified.getValue() !== next) model.modified.setValue(next);
      }
      this.applyingExternal = false;
    });

    effect(() => {
      const before = this.original();
      if (this.diffEditor) {
        const model = this.diffEditor.getModel();
        if (model && model.original.getValue() !== before) model.original.setValue(before);
      }
    });

    effect(() => {
      const lang = this.languageId();
      if (!this.monaco) return;
      for (const model of this.models) this.monaco.editor.setModelLanguage(model, lang);
    });

    // React to explicit app theme changes…
    effect(() => {
      this.themeService.choice();
      this.monaco?.editor.setTheme(preferredMonacoTheme());
    });
    // …and to OS-level changes while on "system".
    if (typeof matchMedia === 'function') {
      const mq = matchMedia('(prefers-color-scheme: dark)');
      const onChange = () => this.monaco?.editor.setTheme(preferredMonacoTheme());
      mq.addEventListener('change', onChange);
      this.destroyRef.onDestroy(() => mq.removeEventListener('change', onChange));
    }
  }

  private mount(el: HTMLElement): void {
    const monaco = this.monaco!;
    const theme = preferredMonacoTheme();
    const common: editor.IEditorOptions & editor.IGlobalEditorOptions = {
      theme,
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 13,
      fontFamily: 'var(--font-mono)',
      lineNumbers: 'on',
      renderLineHighlight: 'all',
      accessibilitySupport: 'auto',
      ariaLabel: this.label(),
      tabSize: 2,
      wordWrap: 'on',
      readOnly: this.readOnly(),
      padding: { top: 10, bottom: 10 },
    };

    if (this.mode() === 'diff') {
      this.diffEditor = monaco.editor.createDiffEditor(el, {
        ...common,
        readOnly: true,
        originalEditable: false,
        renderSideBySide: true,
      });
      const originalModel = monaco.editor.createModel(this.original(), this.languageId());
      const modifiedModel = monaco.editor.createModel(this.value(), this.languageId());
      this.models = [originalModel, modifiedModel];
      this.diffEditor.setModel({ original: originalModel, modified: modifiedModel });
      // Monaco does not label the two inner editors from the diff options, so
      // set an accessible name on each explicitly.
      this.diffEditor.getOriginalEditor().updateOptions({ ariaLabel: `${this.label()} — original` });
      this.diffEditor.getModifiedEditor().updateOptions({ ariaLabel: `${this.label()} — corrected` });
      this.describeInputs(el);
      return;
    }

    this.editor = monaco.editor.create(el, {
      ...common,
      value: this.value(),
      language: this.languageId(),
    });
    this.models = [this.editor.getModel()!].filter(Boolean) as editor.ITextModel[];
    this.describeInputs(el);
    this.editor.onDidChangeModelContent(() => {
      if (this.applyingExternal) return;
      const v = this.editor!.getValue();
      this.zone.run(() => this.valueChange.emit(v));
    });
  }

  /** Point Monaco's real input element(s) at the keyboard-help hint. */
  private describeInputs(el: HTMLElement): void {
    queueMicrotask(() => {
      el.querySelectorAll<HTMLElement>('.inputarea, .native-edit-context').forEach((input) => {
        input.setAttribute('aria-describedby', this.hintId);
      });
    });
  }

  protected onTextarea(event: Event): void {
    this.valueChange.emit((event.target as HTMLTextAreaElement).value);
  }

  private dispose(): void {
    this.editor?.dispose();
    this.diffEditor?.dispose();
    for (const m of this.models) m.dispose();
    this.editor = null;
    this.diffEditor = null;
    this.models = [];
  }
}
