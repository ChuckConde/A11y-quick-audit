import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-about-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="container prose">
      <h1>About A11yFix</h1>

      <p class="lede">
        A11yFix is a developer tool: paste a component, get accessibility findings you can act
        on, with explanations and corrected code. Think “ESLint for accessibility, with
        explanations and automatic fixes.”
      </p>

      <h2>How the analysis works</h2>
      <p>A11yFix runs your code through layers, not a single black box:</p>
      <ul>
        <li>
          <strong>Layer 1 — deterministic.</strong> axe-core rules plus structural checks
          (document language, page title, heading order, duplicate IDs, focus removal, zoom
          disabling, and more). These run entirely in your browser and produce
          <em>confirmed</em> findings.
        </li>
        <li>
          <strong>Layer 2 — semantic.</strong> Context-dependent judgement: is this alt text
          meaningful? Is this link text clear out of context? Is this <code>&lt;div&gt;</code>
          actually a button? These are marked <em>potential — verify manually</em> and are never
          reported as definitive WCAG non-conformance.
        </li>
      </ul>
      <p>
        In this MVP, Layer 2 is a local mock rather than a real model, so <strong>no code leaves
        your browser</strong> in any configuration. The provider sits behind a small interface,
        so a real model can be added later without changing the rest of the app — and when one
        is, the tool will tell you clearly before sending anything.
      </p>

      <h2 id="limits">What automated analysis cannot guarantee</h2>
      <div class="callout">
        <p>
          <strong>A clean report does not mean your component is accessible or WCAG
          conformant.</strong>
        </p>
      </div>
      <p>Automated tooling — this one included — cannot tell you whether:</p>
      <ul>
        <li>alt text and labels actually communicate the right thing;</li>
        <li>the focus order and reading order make sense together;</li>
        <li>a custom widget behaves correctly with a real screen reader and keyboard;</li>
        <li>error messages are understandable and easy to recover from;</li>
        <li>content still works at 200%–400% zoom and with text-spacing overrides;</li>
        <li>the experience is coherent for someone using voice control or a switch device.</li>
      </ul>
      <p>
        Independent estimates put the share of WCAG issues detectable by automated tools at
        around 30–40%. The rest needs manual testing and, ideally, testing with disabled users.
        Use A11yFix to catch the mechanical problems fast and to learn — then test properly.
      </p>

      <h2>Privacy</h2>
      <ul>
        <li>Deterministic checks run locally; nothing is uploaded.</li>
        <li>Submitted code is not persisted — reloading the page clears everything.</li>
        <li>
          Before any future version sends code to an AI service, that behaviour will be shown
          explicitly, per analysis, in the “Where your code was processed” panel.
        </li>
      </ul>

      <h2>Its own accessibility</h2>
      <p>
        This app is meant to be an example of the thing it checks for: keyboard operable, visible
        focus, semantic landmarks and headings, screen-reader announcements for dynamic results,
        no colour-only status, reduced-motion support, and AA-contrast themes. Found a gap?
        That is a bug — please report it.
      </p>

      <h2>Need a manual audit?</h2>
      <p>
        For a professional accessibility review of a product or design system — the kind
        automated tools can’t do — reach out:
      </p>
      <ul>
        <li>
          <a href="https://www.linkedin.com/in/facundo-conde-a61898125/" rel="noopener">
            LinkedIn <span class="visually-hidden">(opens in a new tab)</span>
          </a>
        </li>
        <li><a href="mailto:chuck.conde@gmail.com">chuck.conde&#64;gmail.com</a></li>
      </ul>

      <p class="next"><a routerLink="/">← Back to the analyzer</a></p>
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
        font-size: 1.05rem;
      }
      .callout {
        border: 1px solid var(--sev-serious);
        background: var(--sev-serious-bg);
        color: var(--sev-serious);
        border-radius: var(--radius-md);
        padding: var(--space-3) var(--space-4);
      }
      .callout p {
        margin: 0;
      }
      .next {
        margin-top: var(--space-6);
      }
    `,
  ],
})
export class AboutPage {}
