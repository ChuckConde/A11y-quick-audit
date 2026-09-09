import type { AccessibilityIssue } from '../models';
import { allMatches, firstMatch, snippetAround } from '../util/text';

/**
 * Layer 1b — deterministic structural checks that run in the browser with no
 * network access. These complement axe-core: they cover document-level concerns
 * (page language, title, landmarks) and a few patterns that are objectively
 * wrong regardless of runtime state. Anything requiring judgement lives in the
 * AI layer instead.
 *
 * Every check here is conservative: it only fires on an unambiguous signal, and
 * it never invents a WCAG criterion.
 */
export function runStaticAnalysis(rawCode: string): AccessibilityIssue[] {
  const code = rawCode;
  const issues: AccessibilityIssue[] = [];
  let n = 0;
  const id = () => `static-${++n}`;

  const hasHtmlTag = /<html\b/i.test(code);
  const hasHeadTag = /<head\b/i.test(code);
  const hasBodyTag = /<body\b/i.test(code);
  const looksLikeFullDoc = hasHtmlTag || hasBodyTag || /<!doctype/i.test(code);

  // ---- Document language (3.1.1) ----
  if (hasHtmlTag) {
    const htmlOpen = firstMatch(code, /<html\b[^>]*>/i);
    const langAttr = htmlOpen ? htmlOpen.match.match(/\blang=(["'])([a-zA-Z-]*)\1/) : null;
    if (!langAttr) {
      issues.push({
        id: id(),
        title: 'Document has no language set',
        description: 'The <html> element is missing a lang attribute.',
        severity: 'serious',
        confidence: 'high',
        source: 'static-analysis',
        wcagCriteria: ['3.1.1'],
        affectedCode: htmlOpen?.match ?? '<html>',
        line: htmlOpen?.line,
        explanation:
          'Assistive technologies use the page language to pick the right speech synthesiser and ' +
          'pronunciation rules. Without lang, a screen reader may read English content with, say, ' +
          'German phonetics.',
        suggestedFix: 'Add a valid BCP-47 language tag to the <html> element, e.g. lang="en".',
        fixedCode: (htmlOpen?.match ?? '<html>').replace(/<html\b/i, '<html lang="en"'),
        requiresManualReview: false,
        ruleId: 'html-has-lang',
      });
    } else if (langAttr[2].trim() === '') {
      issues.push({
        id: id(),
        title: 'Document language attribute is empty',
        description: 'lang="" does not identify a language.',
        severity: 'serious',
        confidence: 'high',
        source: 'static-analysis',
        wcagCriteria: ['3.1.1'],
        affectedCode: htmlOpen!.match,
        line: htmlOpen!.line,
        explanation:
          'An empty lang value is treated as "no language declared", so assistive technology falls ' +
          'back to its default and may mispronounce the content.',
        suggestedFix: 'Set a real language tag, e.g. lang="en".',
        fixedCode: htmlOpen!.match.replace(/\blang=(["'])\1/, 'lang="en"'),
        requiresManualReview: false,
        ruleId: 'html-lang-valid',
      });
    }
  }

  // ---- Document title (2.4.2) ----
  if (hasHeadTag && !/<title\b[^>]*>\s*\S/i.test(code)) {
    const head = firstMatch(code, /<head\b[^>]*>/i);
    issues.push({
      id: id(),
      title: 'Page has no title',
      description: 'The document <head> contains no non-empty <title>.',
      severity: 'serious',
      confidence: 'high',
      source: 'static-analysis',
      wcagCriteria: ['2.4.2'],
      affectedCode: head?.match ?? '<head>',
      line: head?.line,
      explanation:
        'The title is the first thing a screen reader announces and the label users see in browser ' +
        'tabs, history, and bookmarks. Without it, people cannot tell pages apart.',
      suggestedFix: 'Add a concise, unique <title> inside <head> that names the page and the site.',
      fixedCode: (head?.match ?? '<head>') + '\n  <title>Page title — Site name</title>',
      requiresManualReview: false,
      ruleId: 'document-title',
    });
  }

  // ---- Anchor without href is not keyboard focusable (2.1.1 / 4.1.2) ----
  for (const m of allMatches(code, /<a\b(?![^>]*\bhref=)[^>]*>/gi)) {
    // Ignore named anchors used purely as targets (<a id="..."> with no handlers/text intent).
    if (/\brole=/.test(m.match)) continue;
    issues.push({
      id: id(),
      title: 'Link has no href and is not keyboard focusable',
      description: 'An <a> without href is skipped by the Tab key and exposes no link role.',
      severity: 'serious',
      confidence: 'high',
      source: 'static-analysis',
      wcagCriteria: ['2.1.1', '4.1.2'],
      affectedCode: snippetAround(m.match),
      line: m.line,
      explanation:
        'Browsers only make an <a> focusable and operable when it has an href. A hrefless anchor ' +
        'used as a button works with a mouse but not with the keyboard, and screen readers do not ' +
        'announce it as a link.',
      suggestedFix:
        'If it navigates, add a real href. If it performs an in-page action, swap the <a>…</a> ' +
        'for a <button type="button">…</button> (remember to change the closing tag too).',
      // Detection is certain, but there is no safe automatic fix: rewriting an
      // element plus its matching closing tag is beyond a single-snippet
      // substitution, and guessing an href would be wrong more often than right.
      requiresManualReview: false,
      ruleId: 'anchor-has-href',
    });
    break; // one representative finding is enough
  }

  // ---- Zoom disabled via viewport meta (1.4.4 / 1.4.10) ----
  const viewport = firstMatch(code, /<meta\b[^>]*name=(["'])viewport\1[^>]*>/i);
  if (viewport && /(user-scalable\s*=\s*(no|0))|(maximum-scale\s*=\s*(1(\.0+)?|0))/i.test(viewport.match)) {
    issues.push({
      id: id(),
      title: 'Pinch-zoom is disabled',
      description: 'The viewport meta tag blocks users from zooming the page.',
      severity: 'serious',
      confidence: 'high',
      source: 'static-analysis',
      wcagCriteria: ['1.4.4', '1.4.10'],
      affectedCode: viewport.match,
      line: viewport.line,
      explanation:
        'user-scalable=no / maximum-scale=1 stop people with low vision from enlarging text on ' +
        'mobile. Users must be able to zoom to at least 200%.',
      suggestedFix: 'Remove user-scalable and maximum-scale so the default (zoom allowed) applies.',
      fixedCode: viewport.match
        .replace(/\s*,?\s*user-scalable\s*=\s*(no|0)/i, '')
        .replace(/\s*,?\s*maximum-scale\s*=\s*[\d.]+/i, ''),
      requiresManualReview: false,
      ruleId: 'meta-viewport',
    });
  }

  // ---- Deprecated auto-moving elements (2.2.2) ----
  const moving = firstMatch(code, /<(blink|marquee)\b[^>]*>/i);
  if (moving) {
    issues.push({
      id: id(),
      title: `<${moving.match.replace(/[<>]/g, '').split(/\s/)[0]}> moves content automatically`,
      description: 'Auto-scrolling/blinking content cannot be paused by the user.',
      severity: 'moderate',
      confidence: 'high',
      source: 'static-analysis',
      wcagCriteria: ['2.2.2'],
      affectedCode: moving.match,
      line: moving.line,
      explanation:
        'Content that blinks or scrolls for more than five seconds must have a mechanism to pause, ' +
        'stop, or hide it. These elements are also obsolete and unsupported in modern browsers.',
      suggestedFix: 'Replace with static markup, or a CSS animation that respects prefers-reduced-motion and has a pause control.',
      requiresManualReview: false,
      ruleId: 'no-deprecated-moving-elements',
    });
  }

  // ---- Focus outline removed inline (2.4.7) ----
  const killedOutline = firstMatch(
    code,
    /style=(["'])[^"']*\boutline\s*:\s*(none|0)[^"']*\1/i,
  );
  if (killedOutline) {
    issues.push({
      id: id(),
      title: 'Focus outline is removed with no replacement',
      description: 'An inline style sets outline:none, which can hide the keyboard focus indicator.',
      severity: 'serious',
      confidence: 'medium',
      source: 'static-analysis',
      wcagCriteria: ['2.4.7'],
      affectedCode: snippetAround(killedOutline.match),
      line: killedOutline.line,
      explanation:
        'Keyboard users rely on a visible focus indicator to know where they are. Removing the ' +
        'outline without providing an equally visible alternative (a custom ring, background, or ' +
        'border change) makes the interface unusable without a mouse.',
      suggestedFix:
        'Remove outline:none, or pair it with a clearly visible :focus-visible style that meets ' +
        'the 3:1 contrast and minimum-area requirements of WCAG 2.4.11.',
      requiresManualReview: true,
      ruleId: 'no-unstyled-focus-removal',
    });
  }

  // ---- Mouse-only event handlers (2.1.1) ----
  const mouseOnly = firstMatch(
    code,
    /<[^>]*\bon(mouseover|mouseout|mousedown|mouseup)=[^>]*>/i,
  );
  if (mouseOnly && !/on(key|focus|blur)/i.test(mouseOnly.match)) {
    issues.push({
      id: id(),
      title: 'Interaction is wired to mouse events only',
      description: 'onmouseover/onmouseout without a keyboard equivalent excludes keyboard users.',
      severity: 'moderate',
      confidence: 'medium',
      source: 'static-analysis',
      wcagCriteria: ['2.1.1'],
      affectedCode: snippetAround(mouseOnly.match),
      line: mouseOnly.line,
      explanation:
        'Anything triggered by hovering or pressing the mouse must also be reachable with the ' +
        'keyboard. Pair pointer handlers with focus/blur or key handlers, or use CSS :hover/:focus.',
      suggestedFix: 'Add matching onfocus/onblur (or keydown) handlers, or move the behaviour to CSS :hover, :focus-within.',
      requiresManualReview: true,
      ruleId: 'mouse-only-handlers',
    });
  }

  // ---- Autoplaying video (1.4.2 / 2.2.2) ----
  const autoplayVideo = firstMatch(code, /<video\b(?=[^>]*\bautoplay)(?![^>]*\bmuted)[^>]*>/i);
  if (autoplayVideo) {
    issues.push({
      id: id(),
      title: 'Video plays automatically with sound',
      description: 'An autoplaying, unmuted <video> starts audio the user did not request.',
      severity: 'moderate',
      confidence: 'high',
      source: 'static-analysis',
      wcagCriteria: ['1.4.2'],
      affectedCode: snippetAround(autoplayVideo.match),
      line: autoplayVideo.line,
      explanation:
        'Audio that plays automatically for more than three seconds must have a way to pause or ' +
        'stop it, or a volume control independent of the system volume. It also collides with ' +
        'screen-reader speech.',
      suggestedFix: 'Add the muted attribute, provide visible controls, or require a user gesture to start playback.',
      fixedCode: autoplayVideo.match.replace(/<video\b/i, '<video muted controls'),
      requiresManualReview: false,
      ruleId: 'no-autoplay-audio',
    });
  }

  // ---- Duplicate IDs referenced by ARIA / labels (1.3.1 / 4.1.2) ----
  const ids = allMatches(code, /\bid=(["'])([^"']+)\1/gi).map((m) => ({
    value: m.match.replace(/^.*id=(["'])/i, '').replace(/["']$/, ''),
    line: m.line,
  }));
  const seen = new Map<string, number>();
  for (const entry of ids) {
    seen.set(entry.value, (seen.get(entry.value) ?? 0) + 1);
  }
  const dupes = [...seen.entries()].filter(([, c]) => c > 1).map(([v]) => v);
  if (dupes.length) {
    const first = dupes[0];
    const at = ids.find((e) => e.value === first);
    issues.push({
      id: id(),
      title: `Duplicate id "${first}"`,
      description: 'The same id is used more than once in the snippet.',
      severity: 'moderate',
      confidence: 'high',
      source: 'static-analysis',
      wcagCriteria: ['1.3.1', '4.1.2'],
      affectedCode: `id="${first}"`,
      line: at?.line,
      explanation:
        'IDs must be unique. label[for], aria-labelledby, aria-describedby and aria-controls all ' +
        'resolve to the *first* matching id, so duplicates silently break name and description ' +
        'computation and can misroute focus.',
      suggestedFix: `Rename the repeated id so each is unique (e.g. "${first}", "${first}-2"). Update any for / aria-* references to match.`,
      requiresManualReview: false,
      ruleId: 'duplicate-id',
    });
  }

  // ---- Heading structure (1.3.1 / 2.4.6) ----
  const headings = allMatches(code, /<h([1-6])\b[^>]*>/gi).map((m) => ({
    level: Number(m.match.match(/<h([1-6])/i)![1]),
    line: m.line,
  }));
  if (headings.length) {
    const h1Count = headings.filter((h) => h.level === 1).length;
    if (h1Count > 1) {
      issues.push({
        id: id(),
        title: `Multiple <h1> headings (${h1Count})`,
        description: 'More than one top-level heading makes the document outline ambiguous.',
        severity: 'moderate',
        confidence: 'medium',
        source: 'static-analysis',
        wcagCriteria: ['1.3.1'],
        affectedCode: '<h1>…</h1>',
        line: headings.find((h) => h.level === 1)?.line,
        explanation:
          'Screen-reader users navigate by heading level. A single <h1> that names the page, with ' +
          'sections nested beneath it, gives a predictable outline. Several <h1>s flatten that ' +
          'structure.',
        suggestedFix: 'Keep one <h1> for the page/view and demote the others to <h2>/<h3> to reflect nesting.',
        requiresManualReview: true,
        ruleId: 'page-has-heading-one',
      });
    }
    if (looksLikeFullDoc && headings[0].level > 1) {
      issues.push({
        id: id(),
        title: `First heading is <h${headings[0].level}>, not <h1>`,
        description: 'The heading outline starts below level 1.',
        severity: 'moderate',
        confidence: 'medium',
        source: 'static-analysis',
        wcagCriteria: ['1.3.1', '2.4.6'],
        affectedCode: `<h${headings[0].level}>…`,
        line: headings[0].line,
        explanation:
          'A document should begin its heading hierarchy at <h1>. Starting at <h2> or lower leaves ' +
          'assistive-technology users looking for a level-1 heading that never appears.',
        suggestedFix: 'Introduce an <h1> for the main topic, or promote the first heading to <h1>.',
        requiresManualReview: true,
        ruleId: 'heading-order',
      });
    }
  }

  // ---- Main landmark on a full page (1.3.1) ----
  if (hasBodyTag && !/<main\b/i.test(code) && !/role=(["'])main\1/i.test(code)) {
    const body = firstMatch(code, /<body\b[^>]*>/i);
    issues.push({
      id: id(),
      title: 'Page has no main landmark',
      description: 'There is no <main> element wrapping the primary content.',
      severity: 'minor',
      confidence: 'medium',
      source: 'static-analysis',
      wcagCriteria: ['1.3.1'],
      affectedCode: body?.match ?? '<body>',
      line: body?.line,
      explanation:
        'A <main> landmark lets screen-reader users jump straight to the primary content and lets ' +
        '“skip to content” links target something concrete. Exactly one per page.',
      suggestedFix: 'Wrap the primary content of the page in a single <main> element.',
      requiresManualReview: true,
      ruleId: 'landmark-one-main',
    });
  }

  // ---- New window with no warning (advisory) ----
  const blankLink = firstMatch(code, /<a\b[^>]*\btarget=(["'])_blank\1[^>]*>([\s\S]*?)<\/a>/i);
  if (blankLink && !/new (tab|window)|opens in|external/i.test(blankLink.match)) {
    issues.push({
      id: id(),
      title: 'Link opens a new tab without telling the user',
      description: 'target="_blank" with no visible or assistive-tech hint that the context changes.',
      severity: 'suggestion',
      confidence: 'low',
      source: 'static-analysis',
      // Advisory: relates to WCAG 2.2 AAA 3.2.5 and technique G201, not an AA failure.
      wcagCriteria: [],
      affectedCode: snippetAround(blankLink.match),
      line: blankLink.line,
      explanation:
        'Opening a new tab is an unexpected change of context. It is not an AA failure, but adding ' +
        'a short cue (visible text or visually-hidden “(opens in a new tab)”) is a well-established ' +
        'good practice, and rel="noopener" avoids a security/perf footgun.',
      suggestedFix:
        'Append a visually-hidden “ (opens in a new tab)” to the link text and add rel="noopener".',
      requiresManualReview: true,
      ruleId: 'blank-target-hint',
    });
  }

  return issues;
}
