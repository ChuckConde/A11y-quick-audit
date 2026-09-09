import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../shared/theme.service';

@Component({
  selector: 'app-site-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="site-header">
      <div class="container bar">
        <a routerLink="/" class="brand">
          <span class="brand-mark" aria-hidden="true">A11y</span>
          <span class="brand-name">A11yFix</span>
        </a>

        <nav aria-label="Primary">
          <ul class="nav-list">
            <li>
              <a
                routerLink="/"
                routerLinkActive="is-active"
                [routerLinkActiveOptions]="{ exact: true }"
                >Analyzer</a
              >
            </li>
            <li><a routerLink="/learn" routerLinkActive="is-active">Learn</a></li>
            <li><a routerLink="/wcag" routerLinkActive="is-active">WCAG</a></li>
            <li><a routerLink="/about" routerLinkActive="is-active">About</a></li>
          </ul>
        </nav>

        <button
          type="button"
          class="btn btn--sm theme-toggle"
          (click)="onToggleTheme()"
          [attr.aria-label]="'Colour theme: ' + themeLabel() + '. Activate to change.'"
        >
          <span aria-hidden="true">{{ themeGlyph() }}</span>
          <span class="theme-text">{{ themeLabel() }}</span>
        </button>
      </div>
    </header>
  `,
  styles: [
    `
      .site-header {
        border-bottom: 1px solid var(--color-border);
        background: var(--color-surface);
        position: sticky;
        top: 0;
        z-index: 20;
      }
      .bar {
        display: flex;
        align-items: center;
        gap: var(--space-5);
        min-height: 56px;
      }
      .brand {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 700;
        text-decoration: none;
        color: var(--color-heading);
      }
      .brand-mark {
        font-family: var(--font-mono);
        font-size: 0.7rem;
        letter-spacing: 0.02em;
        padding: 0.15rem 0.35rem;
        border-radius: var(--radius-sm);
        background: var(--color-accent);
        color: var(--color-accent-contrast);
      }
      nav {
        margin-right: auto;
      }
      .nav-list {
        display: flex;
        gap: 0.25rem;
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .nav-list a {
        display: block;
        padding: 0.5rem 0.7rem;
        border-radius: var(--radius-sm);
        text-decoration: none;
        color: var(--color-text-muted);
        font-weight: 550;
      }
      .nav-list a:hover {
        color: var(--color-text);
        background: var(--color-bg-inset);
      }
      .nav-list a.is-active {
        color: var(--color-text);
        background: var(--color-bg-inset);
        box-shadow: inset 0 -2px 0 var(--color-accent);
      }
      .theme-text {
        min-width: 3.4em;
        text-align: left;
      }
      @media (max-width: 640px) {
        .bar {
          flex-wrap: wrap;
          padding-top: var(--space-2);
          padding-bottom: var(--space-2);
        }
        nav {
          order: 3;
          width: 100%;
        }
        .nav-list {
          justify-content: space-between;
        }
      }
    `,
  ],
})
export class SiteHeader {
  private readonly theme = inject(ThemeService);

  protected readonly themeLabel = computed(() => {
    switch (this.theme.choice()) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      default:
        return 'System';
    }
  });

  protected readonly themeGlyph = computed(() => {
    switch (this.theme.choice()) {
      case 'light':
        return '☀';
      case 'dark':
        return '☾';
      default:
        return '◐';
    }
  });

  protected onToggleTheme(): void {
    this.theme.cycle();
  }
}
