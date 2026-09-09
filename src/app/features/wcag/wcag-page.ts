import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { PRINCIPLES, WCAG_CRITERIA, type WcagLevel } from './wcag-data';

@Component({
  selector: 'app-wcag-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './wcag-page.html',
  styleUrl: './wcag-page.scss',
})
export class WcagPage {
  protected readonly principles = PRINCIPLES;
  protected readonly levels: WcagLevel[] = ['A', 'AA'];

  protected readonly query = signal('');
  protected readonly principleFilter = signal<string>('all');
  protected readonly levelFilter = signal<string>('all');

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const p = this.principleFilter();
    const l = this.levelFilter();
    return WCAG_CRITERIA.filter((c) => {
      if (p !== 'all' && c.principle !== p) return false;
      if (l !== 'all' && c.level !== l) return false;
      if (!q) return true;
      const haystack = `${c.num} ${c.name} ${c.summary} ${c.devNotes.join(' ')}`.toLowerCase();
      return haystack.includes(q);
    });
  });

  protected readonly count = computed(() => this.filtered().length);

  protected reset(): void {
    this.query.set('');
    this.principleFilter.set('all');
    this.levelFilter.set('all');
  }
}
