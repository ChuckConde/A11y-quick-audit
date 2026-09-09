/** Small text helpers shared by the analysis layers. Framework-free. */

export interface Match {
  /** The full matched substring. */
  match: string;
  /** Convenience alias used by some callers. */
  text: string;
  /** 1-based line number of the match start. */
  line: number;
  index: number;
}

export function firstMatch(source: string, re: RegExp): Match | null {
  const flags = re.flags.includes('g') ? re.flags : re.flags + 'g';
  const rx = new RegExp(re.source, flags);
  const m = rx.exec(source);
  if (!m) return null;
  return {
    match: m[0],
    text: m[0],
    index: m.index,
    line: lineAt(source, m.index),
  };
}

export function allMatches(source: string, re: RegExp): Match[] {
  const flags = re.flags.includes('g') ? re.flags : re.flags + 'g';
  const rx = new RegExp(re.source, flags);
  const out: Match[] = [];
  let m: RegExpExecArray | null;
  while ((m = rx.exec(source))) {
    out.push({ match: m[0], text: m[0], index: m.index, line: lineAt(source, m.index) });
    if (m.index === rx.lastIndex) rx.lastIndex++;
  }
  return out;
}

export function lineAt(source: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i++) {
    if (source.charCodeAt(i) === 10) line++;
  }
  return line;
}

/** Trim a snippet to something sensible for a UI card. */
export function snippetAround(text: string, maxLen = 240): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen - 1).trimEnd() + '…';
}

/** Collapse runs of whitespace to a single space. */
export function collapseWs(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
