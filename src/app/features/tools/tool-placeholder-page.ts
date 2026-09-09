import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

/**
 * Placeholder for future SEO landing pages such as /tools/alt-text-checker.
 * The route exists now so links and sitemaps can be built against it; the real
 * per-tool content is a later step.
 */
@Component({
  selector: 'app-tool-placeholder-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="container prose">
      <h1>{{ prettySlug() }}</h1>
      <p class="lede">This focused tool page is planned but not built yet.</p>
      <p>
        In the meantime, the main <a routerLink="/">accessibility analyzer</a> covers this check
        as part of a full report.
      </p>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        padding: var(--space-6) 0 var(--space-8);
      }
      .lede {
        color: var(--color-text-muted);
      }
    `,
  ],
})
export class ToolPlaceholderPage {
  private readonly route = inject(ActivatedRoute);

  private readonly slug = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('slug') ?? 'tool')),
    { initialValue: 'tool' },
  );

  protected prettySlug(): string {
    return this.slug()
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
}
