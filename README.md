# A11yFix

**"ESLint for accessibility, with AI explanations and automatic fixes."**

Paste an HTML, Angular, or React/JSX component and A11yFix analyzes it for accessibility
problems: it detects issues, explains why each one matters, assigns a severity, references the
relevant WCAG criterion, suggests a concrete fix, generates corrected code, and lets you
compare original vs. corrected side by side.

This repository is the **MVP frontend**. The analysis is real for the deterministic layers
(they run in your browser); the semantic layer is a local mock behind a stable interface.
There is no backend, no auth, no payments, no database.

---

## Running it

```bash
npm install
npm start          # dev server on http://localhost:4200
npm test           # unit + headless accessibility tests (Vitest)
npm run build      # production build to dist/a11yfix
```

Angular 21 (standalone, zoneless, signals), TypeScript strict, SCSS with CSS custom
properties, Monaco editor, axe-core.

---

## Architecture

The codebase is split into an **analysis engine** (framework-free, no Angular imports) and a
**presentation layer** (Angular components). They communicate only through the plain data
types in `src/app/analysis/models.ts`.

```
src/app/
├─ analysis/                        ← the engine (no Angular, no DOM assumptions beyond axe)
│  ├─ models.ts                     AccessibilityIssue, AnalysisResult, Severity, scoring, summary
│  ├─ analysis-engine.service.ts    orchestrates the layers, dedupes, sorts, scores, builds notes
│  ├─ sample-code.ts                deliberately-flawed starter snippets per framework
│  ├─ deterministic/
│  │  ├─ axe-runner.ts              Layer 1a — axe-core against a detached copy of the markup,
│  │  │                             restricted to rules meaningful on a fragment
│  │  ├─ static-analyzer.ts         Layer 1b — structural checks axe can't do on a fragment
│  │  │                             (page language, title, landmarks, heading order, dup ids,
│  │  │                             focus removal, zoom disabling, mouse-only handlers, …)
│  │  └─ framework-normalizer.ts    best-effort JSX / Angular-template → analyzable HTML
│  ├─ ai/
│  │  ├─ ai-provider.ts             AccessibilityAIProvider interface + DI token
│  │  └─ mock-ai-provider.ts        Layer 2 — local, offline mock; recognises anti-patterns
│  ├─ fixes/
│  │  └─ fix-engine.ts              applies per-issue substitutions to build corrected code
│  └─ util/text.ts                  regex/line-number/snippet helpers
│
├─ features/
│  ├─ analyzer/                     the main tool (route: /)
│  │  ├─ analyzer-page.*            state, orchestration, live-region announcements
│  │  └─ components/                score-card, issue-card, corrected-code-panel, privacy-panel
│  ├─ learn/     learn-page.ts      educational path + external resources (route: /learn)
│  ├─ wcag/      wcag-page.* + wcag-data.ts   searchable WCAG 2.2 A/AA reference (route: /wcag)
│  ├─ about/     about-page.ts      what the tool is + what it cannot guarantee (route: /about)
│  └─ tools/     tool-placeholder-page.ts     reserved for future SEO pages (/tools/:slug)
│
├─ shared/
│  ├─ monaco/    code-editor.ts, monaco-loader.ts   editor + diff wrapper, lazy-loaded
│  ├─ severity-badge.ts            icon + text + colour (never colour alone)
│  ├─ copy-button.ts               copy with screen-reader-announced result
│  ├─ clipboard.service.ts
│  └─ theme.service.ts             light / dark / system, persisted, reflected on <html>
│
├─ core/        site-header.ts, site-footer.ts     shell chrome, nav, theme toggle, audit CTA
├─ app.ts                          skip link, <main> landmark, route focus + title management
├─ app.routes.ts                   lazy routes, /tools/:slug reserved
└─ app.config.ts                   router + zoneless CD + AI-provider binding (one line to swap)
```

### The layered analysis (why not just an LLM)

`AnalysisEngine.analyze(code, framework)` runs, in order:

1. **Layer 1a — axe-core** (`axe-runner.ts`). The markup is mounted in a detached, off-screen
   `<div>`, and axe runs a curated allow-list of rules that make sense on an isolated fragment
   (`image-alt`, `button-name`, `label`, `aria-*`, `nested-interactive`, …). Document-level
   axe rules are deliberately excluded so axe never grades the host app instead of your
   snippet. Colour-contrast is skipped (no stylesheet in scope) and disclosed in the notes.
   Violations → `confidence: high`, `requiresManualReview: false`. Incomplete → needs review.

2. **Layer 1b — structural checks** (`static-analyzer.ts`). Conservative, regex/DOM checks for
   objectively-wrong patterns axe can't see on a fragment. Each returns bare WCAG numbers and,
   where a substitution is safe, a `fixedCode`.

3. **Layer 2 — semantic** (`mock-ai-provider.ts`, via the `AccessibilityAIProvider` interface).
   Context-dependent judgement: vague link text, placeholder-as-label, fake buttons, autofocus,
   fragile tab order. **Every** Layer 2 finding is `source: 'ai'` and
   `requiresManualReview: true` — the UI labels these "Potential — verify manually" and never
   states them as definitive WCAG non-conformance.

The engine then **dedupes** overlapping findings (preferring the higher-confidence /
deterministic one), **sorts** by severity then confirmed-before-potential, computes a
heuristic **score** (0–100, explicitly *not* a conformance rating), and asks `fix-engine.ts`
to build the corrected component by applying only the exact `affectedCode → fixedCode`
substitutions it is sure about. Nothing else in the source is reformatted.

### Swapping in a real AI provider

`app.config.ts` binds the token in one line:

```ts
{ provide: ACCESSIBILITY_AI_PROVIDER, useExisting: MockAIProvider }
```

Implement `AccessibilityAIProvider` (set `sendsCodeRemotely` honestly), change that line, and
nothing else moves. The privacy panel reads `sendsCodeRemotely` / `sentToRemoteService` and
will tell the user, per analysis, when code leaves the device.

### The app's own accessibility

Treated as a showcase: skip link, one `<main>` landmark with route focus management,
`aria-live` result announcements, semantic headings/landmarks, `<details>` disclosures,
visible `:focus-visible` rings, severity shown as icon **and** text **and** colour,
`prefers-reduced-motion` handling, forced-colors handling, and AA-contrast light/dark
palettes. `src/app/a11y.spec.ts` runs axe-core against every page in the test suite; the
in-browser audit (all four routes, both themes, results rendered, diff open) is clean.

---

## Next three implementation steps

1. **Replace the mock semantic layer with a real provider behind the existing interface.**
   Add an `HttpAIProvider implements AccessibilityAIProvider` that calls a thin serverless
   function (the only backend needed), with a strict response schema mapped to
   `AccessibilityIssue`, `requiresManualReview` forced `true`, a token/size budget, and a
   pre-send confirmation dialog wired to the privacy panel. Keep `MockAIProvider` as the
   offline default.

2. **Make the deterministic layer framework-aware instead of normalize-then-guess.**
   Parse React/JSX with `@babel/parser` and Angular templates with
   `@angular/compiler`'s template parser, so findings carry real line/column numbers and
   framework-specific rules become possible (`jsx-a11y` parity for React; `[attr.aria-*]`
   binding analysis, `*ngFor` without `trackBy` focus loss, `(click)` without `(keydown)` for
   Angular). This also removes the "line numbers are approximate" caveat.

3. **Ship the first SEO tool pages on the reserved `/tools/:slug` route.**
   Turn `tool-placeholder-page` into a real per-check landing page (alt-text, aria-label,
   heading-structure, contrast, html/angular/react checkers) that reuses the analyzer engine
   with a single rule family pre-selected, plus static explanatory content and structured
   data. Add prerendering (`@angular/ssr` build-time only) for these routes so they are
   indexable without a running server.
