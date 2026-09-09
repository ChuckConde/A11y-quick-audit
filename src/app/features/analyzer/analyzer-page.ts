import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FRAMEWORK_LABELS, type AccessibilityIssue, type AnalysisResult, type Framework } from '../../analysis/models';
import { AnalysisEngine } from '../../analysis/analysis-engine.service';
import { SAMPLE_CODE } from '../../analysis/sample-code';
import { buildCorrectedCode } from '../../analysis/fixes/fix-engine';
import { CodeEditor } from '../../shared/monaco/code-editor';
import { ScoreCard } from './components/score-card';
import { IssueCard } from './components/issue-card';
import { CorrectedCodePanel } from './components/corrected-code-panel';
import { PrivacyPanel } from './components/privacy-panel';

type Status = 'idle' | 'analyzing' | 'done' | 'error';

@Component({
  selector: 'app-analyzer-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CodeEditor, ScoreCard, IssueCard, CorrectedCodePanel, PrivacyPanel],
  templateUrl: './analyzer-page.html',
  styleUrl: './analyzer-page.scss',
})
export class AnalyzerPage {
  private readonly engine = inject(AnalysisEngine);

  protected readonly frameworks: Framework[] = ['html', 'angular', 'react'];
  protected readonly frameworkLabels = FRAMEWORK_LABELS;

  protected readonly framework = signal<Framework>('html');
  protected readonly code = signal<string>(SAMPLE_CODE.html);
  protected readonly includeSemantic = signal(true);

  protected readonly status = signal<Status>('idle');
  protected readonly errorMessage = signal('');
  protected readonly result = signal<AnalysisResult | null>(null);
  protected readonly liveMessage = signal('');

  /** Ids of issue fixes the user has chosen to apply into the corrected editor. */
  protected readonly appliedFixIds = signal<ReadonlySet<string>>(new Set());

  protected readonly hasResult = computed(() => this.status() === 'done' && !!this.result());

  /** Corrected code recomputed from just the fixes the user has applied. */
  protected readonly correctedView = computed(() => {
    const res = this.result();
    if (!res) return { code: this.code(), appliedCount: 0, manualCount: 0 };
    const applied = this.appliedFixIds();
    const chosen = res.issues.filter((i) => applied.has(i.id));
    const built = buildCorrectedCode(this.analyzedCode(), chosen);
    const fixable = res.issues.filter((i) => !!i.fixedCode).length;
    return {
      code: built.code,
      appliedCount: built.appliedIssueIds.length,
      manualCount: Math.max(0, fixable - built.appliedIssueIds.length),
    };
  });

  /** The exact source that produced the current result (frozen at analyze time). */
  private readonly analyzedCode = signal<string>('');

  protected readonly autoFixableIds = computed(
    () => this.result()?.issues.filter((i) => !!i.fixedCode).map((i) => i.id) ?? [],
  );

  protected readonly allApplied = computed(() => {
    const ids = this.autoFixableIds();
    const applied = this.appliedFixIds();
    return ids.length > 0 && ids.every((id) => applied.has(id));
  });

  protected onFrameworkChange(value: string): void {
    const fw = value as Framework;
    const current = this.code().trim();
    const isPristineSample = this.frameworks.some((f) => SAMPLE_CODE[f].trim() === current) || current === '';
    this.framework.set(fw);
    if (isPristineSample) this.code.set(SAMPLE_CODE[fw]);
  }

  protected loadSample(): void {
    this.code.set(SAMPLE_CODE[this.framework()]);
  }

  protected clearCode(): void {
    this.code.set('');
  }

  protected async analyze(): Promise<void> {
    if (this.status() === 'analyzing') return;
    const source = this.code();
    if (!source.trim()) {
      this.status.set('error');
      this.errorMessage.set('Paste some markup or component code first.');
      this.liveMessage.set('Nothing to analyze. Paste some code first.');
      return;
    }

    this.status.set('analyzing');
    this.errorMessage.set('');
    this.liveMessage.set('Analyzing your code…');
    this.result.set(null);
    this.appliedFixIds.set(new Set());

    try {
      const res = await this.engine.analyze(source, this.framework(), {
        includeSemanticLayer: this.includeSemantic(),
      });
      this.analyzedCode.set(source);
      this.result.set(res);
      // The corrected editor shows the fully corrected component by default:
      // every safe fix pre-applied. "Reset" reverts to the original.
      this.appliedFixIds.set(new Set(res.issues.filter((i) => !!i.fixedCode).map((i) => i.id)));
      this.status.set('done');
      this.liveMessage.set(this.buildSummarySentence(res));
    } catch (err) {
      this.status.set('error');
      this.errorMessage.set((err as Error).message || 'Analysis failed unexpectedly.');
      this.liveMessage.set('Analysis failed. ' + this.errorMessage());
    }
  }

  protected applyFix(id: string): void {
    const next = new Set(this.appliedFixIds());
    next.add(id);
    this.appliedFixIds.set(next);
  }

  protected applyAllFixes(): void {
    this.appliedFixIds.set(new Set(this.autoFixableIds()));
  }

  protected resetFixes(): void {
    this.appliedFixIds.set(new Set());
  }

  protected isApplied(id: string): boolean {
    return this.appliedFixIds().has(id);
  }

  protected trackIssue(_i: number, issue: AccessibilityIssue): string {
    return issue.id;
  }

  private buildSummarySentence(res: AnalysisResult): string {
    const s = res.summary;
    const parts = [
      s.critical ? `${s.critical} critical` : '',
      s.serious ? `${s.serious} serious` : '',
      s.moderate ? `${s.moderate} moderate` : '',
      s.minor ? `${s.minor} minor` : '',
      s.suggestion ? `${s.suggestion} suggestion${s.suggestion === 1 ? '' : 's'}` : '',
    ].filter(Boolean);
    const breakdown = parts.length ? parts.join(', ') : 'no issues detected';
    return `Analysis complete. Accessibility score ${res.score} of 100. ${res.issues.length} finding${
      res.issues.length === 1 ? '' : 's'
    }: ${breakdown}. Results are below the editor.`;
  }
}
