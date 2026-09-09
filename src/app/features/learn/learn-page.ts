import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Resource {
  title: string;
  href: string;
  by: string;
  note: string;
}

@Component({
  selector: 'app-learn-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="container prose">
      <h1>Learn accessibility</h1>
      <p class="lede">
        A short, opinionated path for frontend developers. The goal is not to memorise WCAG —
        it is to build the habits that make most of it fall out for free.
      </p>

      <h2>Start here</h2>
      <ol class="steps">
        <li>
          <h3>Use the right element</h3>
          <p>
            Ninety percent of accessibility is choosing <code>&lt;button&gt;</code>,
            <code>&lt;a href&gt;</code>, <code>&lt;label&gt;</code>, <code>&lt;table&gt;</code>,
            and the heading elements instead of styled <code>&lt;div&gt;</code>s. Native elements
            come with focus, keyboard behaviour, and the correct role already wired up.
          </p>
        </li>
        <li>
          <h3>Operate everything with the keyboard</h3>
          <p>
            Put the mouse away and Tab through your feature. Can you reach every control? Is the
            focus ring always visible? Can you complete the task and get back out? If not, that
            is your first bug.
          </p>
        </li>
        <li>
          <h3>Give every control a name</h3>
          <p>
            Icon buttons, inputs, links: each needs text an assistive technology can announce —
            visible text, a <code>&lt;label&gt;</code>, or <code>aria-label</code>. If there is
            visible text, the accessible name must contain it (WCAG 2.5.3).
          </p>
        </li>
        <li>
          <h3>Announce what changes</h3>
          <p>
            When content updates without a page load — search results, validation errors, a
            “Saved” toast — put it in a live region (<code>role="status"</code> or
            <code>aria-live</code>) so screen-reader users hear it without losing their place.
          </p>
        </li>
        <li>
          <h3>Check colour and motion</h3>
          <p>
            Text contrast ≥ 4.5:1, never rely on colour alone for meaning, and honour
            <code>prefers-reduced-motion</code> for anything that animates.
          </p>
        </li>
      </ol>

      <h2>What automated tools can and cannot do</h2>
      <p>
        Rule engines like axe-core reliably catch missing alt attributes, unlabelled fields,
        invalid ARIA, and duplicate IDs. They cannot judge whether alt text is <em>meaningful</em>,
        whether the focus order matches the visual order, whether an error message is
        <em>understandable</em>, or whether a custom widget behaves correctly. Studies put the
        share of WCAG issues that are automatically detectable at roughly a third. Treat a clean
        automated run as the floor, not the finish line — see
        <a routerLink="/about">what this tool does not guarantee</a>.
      </p>

      <h2>External resources</h2>
      <ul class="resources">
        @for (r of resources; track r.href) {
          <li>
            <a [href]="r.href" rel="noopener">
              {{ r.title }} <span class="visually-hidden">(opens in a new tab)</span>
            </a>
            <span class="by">{{ r.by }}</span>
            <p>{{ r.note }}</p>
          </li>
        }
      </ul>

      <p class="next">
        Ready to try it? <a routerLink="/">Open the analyzer</a> and paste a component you are
        working on.
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
        font-size: 1.05rem;
      }
      .steps {
        counter-reset: step;
        list-style: none;
        padding: 0;
        display: grid;
        gap: var(--space-4);
      }
      .steps li {
        border-left: 3px solid var(--color-accent);
        padding-left: var(--space-4);
      }
      .steps h3 {
        margin-bottom: var(--space-1);
      }
      .steps h3::before {
        counter-increment: step;
        content: counter(step) '. ';
        color: var(--color-accent);
        font-family: var(--font-mono);
      }
      .resources {
        list-style: none;
        padding: 0;
        display: grid;
        gap: var(--space-3);
      }
      .resources li {
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        padding: var(--space-3) var(--space-4);
      }
      .resources .by {
        color: var(--color-text-faint);
        font-size: 0.85rem;
        margin-left: 0.5rem;
      }
      .resources p {
        margin: var(--space-1) 0 0;
        color: var(--color-text-muted);
        font-size: 0.9rem;
      }
      .next {
        margin-top: var(--space-6);
        padding: var(--space-4);
        background: var(--color-bg-subtle);
        border-radius: var(--radius-md);
      }
    `,
  ],
})
export class LearnPage {
  protected readonly resources: Resource[] = [
    {
      title: 'ARIA Authoring Practices Guide (APG)',
      href: 'https://www.w3.org/WAI/ARIA/apg/patterns/',
      by: 'W3C',
      note: 'Reference implementations for tabs, menus, comboboxes, dialogs and more. Copy the keyboard model exactly.',
    },
    {
      title: 'Understanding WCAG 2.2',
      href: 'https://www.w3.org/WAI/WCAG22/Understanding/',
      by: 'W3C',
      note: 'The “why” and “how” behind each success criterion, with techniques and failures.',
    },
    {
      title: 'MDN — Accessibility',
      href: 'https://developer.mozilla.org/en-US/docs/Web/Accessibility',
      by: 'MDN Web Docs',
      note: 'Practical, example-driven guides on HTML semantics, ARIA, and testing.',
    },
    {
      title: 'axe-core rules',
      href: 'https://dequeuniversity.com/rules/axe/',
      by: 'Deque',
      note: 'What each deterministic rule checks, and how to fix a failure.',
    },
    {
      title: 'WebAIM',
      href: 'https://webaim.org/',
      by: 'WebAIM',
      note: 'The contrast checker, the annual screen-reader survey, and clear how-to articles.',
    },
  ];
}
