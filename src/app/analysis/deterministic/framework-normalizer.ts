import type { Framework } from '../models';

/**
 * Best-effort conversion of framework markup into plain HTML that a DOM parser
 * and axe-core can inspect. This is lossy on purpose — it exists so the
 * deterministic layer has *something* structural to check for Angular and JSX,
 * not to be a real compiler. Findings from normalized code are reported with a
 * coverage note.
 */
export interface NormalizedSource {
  html: string;
  /** Line offset map is not attempted; callers fall back to snippet matching. */
  lossy: boolean;
  notes: string[];
}

export function normalizeToHtml(code: string, framework: Framework): NormalizedSource {
  if (framework === 'html') {
    return { html: code, lossy: false, notes: [] };
  }
  if (framework === 'react') {
    return normalizeJsx(code);
  }
  return normalizeAngular(code);
}

function normalizeJsx(code: string): NormalizedSource {
  const notes: string[] = [
    'React/JSX is normalized to approximate HTML for static checks. Runtime-only issues ' +
      '(state-driven ARIA, portals, effect-based focus) are not covered.',
  ];

  let html = code;

  // Strip a leading import/export block and hooks so the parser sees markup.
  const returnMatch = html.match(/return\s*\(([\s\S]*?)\);?\s*}/);
  if (returnMatch) html = returnMatch[1];

  html = html
    // JSX comments
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    // className -> class, htmlFor -> for
    .replace(/\bclassName=/g, 'class=')
    .replace(/\bhtmlFor=/g, 'for=')
    // onClick={...} -> data-onclick (marker the static layer looks for)
    .replace(/\bon([A-Z][A-Za-z]+)=\{[^}]*\}/g, (_m, ev) => `data-on${String(ev).toLowerCase()}="handler"`)
    // attr={`...`} / attr={'...'} / attr={"..."} -> attr="..."
    .replace(/=\{`([^`]*)`\}/g, '="$1"')
    .replace(/=\{(['"])(.*?)\1\}/g, '="$2"')
    // attr={expr} boolean-ish -> attr="expr"
    .replace(/=\{([^}]+)\}/g, (_m, expr) => `="${String(expr).replace(/"/g, "'").trim()}"`)
    // {condition && ( ... )} — drop the wrapper, keep inner
    .replace(/\{[^{}]*&&\s*\(([\s\S]*?)\)\}/g, '$1')
    // remaining {expressions} rendered as text
    .replace(/\{[^{}]*\}/g, 'expr')
    // self-closing tags are already HTML5-friendly
    .trim();

  return { html, lossy: true, notes };
}

function normalizeAngular(code: string): NormalizedSource {
  const notes: string[] = [
    'Angular templates are normalized to approximate HTML for static checks. Bindings, ' +
      'structural directives, and control flow are simplified.',
  ];

  let html = code
    // control flow blocks: @if (x) { ... } @else { ... }
    .replace(/@(if|for|switch|case|default|empty|else\s*if|else)\s*(\([^)]*\))?\s*\{/g, '')
    .replace(/\}\s*(?=@|\s*$)/g, '')
    // *ngIf / *ngFor etc.
    .replace(/\*ng[A-Za-z]+="[^"]*"/g, '')
    // [prop]="expr" -> prop="expr"
    .replace(/\[([a-zA-Z][\w-]*)\]="([^"]*)"/g, '$1="$2"')
    // [attr.x]="expr" -> x="expr"
    .replace(/\[attr\.([a-zA-Z][\w:-]*)\]="([^"]*)"/g, '$1="$2"')
    // (event)="handler()" -> data-onevent="handler"
    .replace(/\(([a-zA-Z]+)\)="[^"]*"/g, (_m, ev) => `data-on${String(ev).toLowerCase()}="handler"`)
    // [(ngModel)] -> name marker
    .replace(/\[\(ngModel\)\]="([^"]*)"/g, 'name="$1"')
    // interpolation
    .replace(/\{\{[^}]*\}\}/g, 'expr')
    .trim();

  return { html, lossy: true, notes };
}
