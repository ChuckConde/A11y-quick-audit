import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-site-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="site-footer">
      <div class="container grid">
        <div>
          <p class="ft-title">A11yFix</p>
          <p class="ft-muted">
            Deterministic accessibility checks plus AI explanations, running in your browser.
            Not a substitute for testing with real assistive technology and real users.
          </p>
        </div>

        <div class="audit-cta">
          <p class="ft-title">Need a professional accessibility audit?</p>
          <p class="ft-muted">
            Automated analysis catches a slice of the picture. For a manual expert review of a
            product or design system, get in touch.
          </p>
          <p class="ft-links">
            <a href="https://www.linkedin.com/in/facundo-conde-a61898125/" rel="noopener">
              LinkedIn <span class="visually-hidden">(opens in a new tab)</span>
            </a>
            <span aria-hidden="true">·</span>
            <a href="mailto:chuck.conde@gmail.com">chuck.conde&#64;gmail.com</a>
          </p>
        </div>
      </div>
    </footer>
  `,
  styles: [
    `
      .site-footer {
        margin-top: var(--space-8);
        border-top: 1px solid var(--color-border);
        background: var(--color-bg-subtle);
        padding: var(--space-6) 0;
      }
      .grid {
        display: grid;
        gap: var(--space-6);
        grid-template-columns: 1.4fr 1fr;
        align-items: start;
      }
      .ft-title {
        font-weight: 650;
        color: var(--color-heading);
        margin: 0 0 var(--space-2);
      }
      .ft-muted {
        color: var(--color-text-muted);
        font-size: 0.9rem;
        max-width: 52ch;
      }
      .audit-cta {
        border-left: 2px solid var(--color-border-strong);
        padding-left: var(--space-4);
      }
      .ft-links {
        display: flex;
        gap: 0.6rem;
        align-items: center;
        font-size: 0.9rem;
        margin: 0;
      }
      @media (max-width: 720px) {
        .grid {
          grid-template-columns: 1fr;
        }
        .audit-cta {
          border-left: 0;
          border-top: 2px solid var(--color-border-strong);
          padding-left: 0;
          padding-top: var(--space-4);
        }
      }
    `,
  ],
})
export class SiteFooter {}
