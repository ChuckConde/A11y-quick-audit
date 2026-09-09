import { ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SiteHeader } from './core/site-header';
import { SiteFooter } from './core/site-footer';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SiteHeader, SiteFooter],
  template: `
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <app-site-header />
    <main id="main-content" tabindex="-1" #main>
      <router-outlet />
    </main>
    <app-site-footer />
    <p class="visually-hidden" aria-live="assertive" #routeAnnounce></p>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
      }
      main {
        flex: 1 0 auto;
        outline: none;
      }
    `,
  ],
})
export class App {
  private readonly router = inject(Router);
  private readonly titleService = inject(Title);

  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');
  private readonly routeAnnounce = viewChild.required<ElementRef<HTMLElement>>('routeAnnounce');

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.onNavigated());
  }

  private onNavigated(): void {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) route = route.firstChild;
    const pageTitle = route.data?.['title'] as string | undefined;
    const full = pageTitle ? `${pageTitle} · A11yFix` : 'A11yFix';
    this.titleService.setTitle(full);

    // Move focus to the main region so keyboard/screen-reader users start at
    // the new content, and announce the change.
    queueMicrotask(() => {
      this.main().nativeElement.focus({ preventScroll: false });
      this.routeAnnounce().nativeElement.textContent = `${pageTitle ?? 'Page'} loaded`;
    });
  }
}
