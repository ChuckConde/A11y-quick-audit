# Project: A11yFix

Build a polished MVP web application called **A11yFix**, an AI-assisted accessibility analyzer for frontend developers.

## Product concept

A developer pastes frontend code into an editor and A11yFix analyzes it for accessibility problems.

The application should:

1. Detect accessibility issues.
2. Explain why each issue matters.
3. Assign a severity.
4. Reference the relevant WCAG criterion when applicable.
5. Suggest a concrete fix.
6. Generate corrected code.
7. Make it extremely easy to compare the original and corrected versions.

The target users are frontend developers working with HTML, Angular, React/JSX, and eventually Vue.

The product should feel like a developer tool rather than an accessibility compliance consultancy.

Think:

**"ESLint for accessibility, with AI explanations and automatic fixes."**

---

# Core user flow

The homepage should immediately present the tool.

Headline:

**Find accessibility problems before your users do.**

Subheadline:

**Paste your component. A11yFix finds accessibility issues, explains them, and shows you how to fix them.**

Below this, display a code editor.

Language selector:

* HTML
* Angular
* React / JSX

Include an **Analyze Accessibility** button.

For the MVP, Vue can be shown as "Coming soon" or omitted entirely.

---

# Analysis result

After analysis, show an accessibility score such as:

**Accessibility Score: 72/100**

Then display a summary:

* 2 Critical
* 3 Serious
* 4 Moderate
* 2 Suggestions

Each detected problem should be presented as a structured issue.

Example:

### Button has no accessible name

Severity: Serious

**Problem**

This button contains only an icon and does not expose an accessible name to assistive technology.

**Affected code**

```html
<button>
  <img src="trash.svg">
</button>
```

**Why this matters**

A screen-reader user may encounter this simply as "button" without knowing what action it performs.

**WCAG**

WCAG 4.1.2 — Name, Role, Value

**Suggested fix**

Provide an accessible name to the button and treat the decorative icon appropriately.

```html
<button aria-label="Delete item">
  <img src="trash.svg" alt="">
</button>
```

Include an **Apply Fix** action where technically possible.

---

# Corrected Code

After displaying individual issues, provide a second editor containing the fully corrected component.

Allow:

* Copy corrected code
* Copy individual fix
* View original
* View corrected
* Diff original vs corrected

Never silently modify code unrelated to accessibility.

Preserve formatting and existing application logic whenever possible.

---

# Analysis architecture

Do NOT rely entirely on an LLM to determine accessibility compliance.

Design the system around multiple analysis layers.

## Layer 1 — Deterministic analysis

Use established accessibility tooling where possible, such as axe-core and framework-specific static analysis.

Detect objectively identifiable issues without AI.

Examples:

* missing alt attributes
* form controls without labels
* buttons without accessible names
* invalid ARIA attributes
* inappropriate ARIA roles
* missing document language
* heading hierarchy problems
* duplicate IDs
* tabindex misuse
* interactive elements improperly nested

## Layer 2 — Semantic analysis

Use AI for issues requiring contextual interpretation.

Examples:

* whether alt text actually describes an image appropriately
* whether an accessible name communicates the action
* confusing link text
* misleading labels
* poor semantic structure
* accessibility implications of custom components
* keyboard interaction concerns
* potential focus-management problems

AI-generated findings must clearly distinguish between:

**Confirmed issue**
and
**Potential issue requiring manual verification**

Never present uncertain AI reasoning as definitive WCAG non-compliance.

---

# Issue schema

Represent every finding internally using a consistent model similar to:

```typescript
interface AccessibilityIssue {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'serious' | 'moderate' | 'minor' | 'suggestion';
  confidence: 'high' | 'medium' | 'low';
  source: 'static-analysis' | 'axe' | 'ai';
  wcagCriteria: string[];
  affectedCode: string;
  line?: number;
  explanation: string;
  suggestedFix?: string;
  fixedCode?: string;
  requiresManualReview: boolean;
}
```

Keep the analysis engine separated from the presentation layer.

---

# Accessibility

This product MUST itself have excellent accessibility.

Treat the application's own accessibility as a showcase of the product.

Requirements include:

* WCAG 2.2 AA target
* fully keyboard accessible
* visible focus states
* correct semantic HTML
* correct heading structure
* appropriate landmarks
* accessible dialogs
* accessible tooltips
* accessible error messages
* no color-only status indicators
* reduced-motion support
* screen-reader-friendly dynamic analysis results
* sufficient color contrast

Run automated accessibility tests against the application itself.

---

# Technology

Choose a modern architecture optimized for fast development and inexpensive hosting.

Preferred stack:

* Angular
* TypeScript
* Tailwind or clean SCSS
* Monaco Editor
* axe-core
* Supabase only if persistent storage becomes necessary

The initial version should require as little backend infrastructure as possible.

Keep the architecture modular so an AI provider can be added or replaced without changing the rest of the application.

Create an abstraction such as:

```typescript
interface AccessibilityAIProvider {
  analyze(code: string, framework: Framework): Promise<AccessibilityIssue[]>;
}
```

Do not hardcode the application around a specific LLM provider.

---

# Design

The UI should feel similar to modern developer tools.

Use a clean, professional dark/light interface.

Prioritize the code editor and results rather than marketing content.

Desktop layout can use:

LEFT:
Code editor

RIGHT:
Accessibility analysis

On smaller screens, stack them vertically.

Use restrained visual styling.

Avoid excessive gradients, glassmorphism, huge rounded cards, excessive animations, or generic "AI startup" aesthetics.

Severity indicators must use icons/text in addition to color.

---

# MVP pages

Create:

### /

Main accessibility analyzer.

### /learn

Accessibility educational resources.

### /wcag

Searchable/simple WCAG reference aimed at developers.

### /about

Explain what A11yFix does and, importantly, what automated accessibility analysis cannot guarantee.

Later we may create SEO pages such as:

/tools/alt-text-checker
/tools/aria-label-checker
/tools/color-contrast-checker
/tools/heading-structure-checker
/tools/html-accessibility-checker
/tools/angular-accessibility-checker
/tools/react-accessibility-checker

Architect routing so these can easily be added.

---

# Monetization

Do NOT implement complicated monetization initially.

Architect around a future freemium model:

FREE

* limited analyses
* HTML/Angular/React analysis
* basic fixes

PRO

* unlimited analyses
* larger components
* project-level analysis
* downloadable accessibility reports
* GitHub integration
* VS Code integration
* CI accessibility checks

Also reserve a subtle section for:

**Need a professional accessibility audit?**

This can eventually generate consulting leads.

Do not make this prominent enough to distract from the tool.

But give a link to my LinkedIn or a redirection to write me an email

https://www.linkedin.com/in/facundo-conde-a61898125/

chuck.conde@gmail.com

---

# Privacy

Developers may paste proprietary source code into the application.

Privacy must therefore be considered a core product feature.

Clearly indicate when code is processed locally versus sent to an AI service.

Do not persist submitted source code by default.

Design the architecture so deterministic checks can run locally in the browser whenever practical.

Before sending code to an external AI provider, make that behavior transparent.

---

# Important product principles

1. Never claim that passing automated analysis means a website is WCAG compliant.
2. Distinguish deterministic violations from AI suggestions.
3. Prefer precise findings over generating large numbers of speculative warnings.
4. Every issue should teach the developer something.
5. Every issue should ideally include an actionable fix.
6. Preserve the developer's original application behavior.
7. Avoid changing unrelated code.
8. Do not invent WCAG criteria.
9. Keep AI-provider logic isolated.
10. Make the product itself an example of excellent accessibility.

---

# Initial implementation

Start by creating the complete MVP frontend with mocked analysis data.

I want to be able to:

1. Open the application.
2. Paste HTML or Angular code.
3. Click Analyze Accessibility.
4. See realistic accessibility findings.
5. Select individual findings.
6. See affected code and WCAG information.
7. See suggested fixes.
8. Compare original and corrected code.
9. Copy corrected code.
10. Navigate the entire application using only the keyboard.

Do NOT implement authentication, payments, Supabase, or a production AI integration yet.

First build an excellent local MVP and establish clean architecture.

Once the MVP is working, explain the architecture you created, identify the main files/components/services, and propose the next three implementation steps.

Before writing code, inspect the existing repository and reuse its conventions if this is not an empty project.
