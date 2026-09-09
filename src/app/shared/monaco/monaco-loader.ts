/**
 * Lazy loader for the Monaco editor.
 *
 * Monaco is ~2 MB, so it is dynamically imported the first time an editor is
 * shown rather than bundled into the initial page. Web workers are wired up
 * through `new Worker(new URL(...))`, which the Angular/esbuild build understands
 * and turns into hashed worker bundles. If worker construction fails for any
 * reason, Monaco degrades to running its language services on the main thread —
 * still fully usable for this tool's small snippets.
 */
export type MonacoApi = typeof import('monaco-editor');

let monacoPromise: Promise<MonacoApi> | null = null;

function installEnvironment(): void {
  const w = self as unknown as { MonacoEnvironment?: unknown };
  if (w.MonacoEnvironment) return;
  // We deliberately run Monaco without web workers. Bundling Monaco's worker
  // entry points cleanly across build tools is brittle, and this tool only
  // needs editing, syntax highlighting (Monarch, main thread) and diffing —
  // not the worker-backed language services (completion, deep validation).
  // Returning a tiny no-op worker keeps Monaco from throwing and lets it fall
  // back to the main thread silently.
  const noop = URL.createObjectURL(
    new Blob(['self.onmessage=function(){}'], { type: 'text/javascript' }),
  );
  w.MonacoEnvironment = {
    getWorker(): Worker {
      return new Worker(noop);
    },
  };
}

export function loadMonaco(): Promise<MonacoApi> {
  if (!monacoPromise) {
    installEnvironment();
    monacoPromise = import('monaco-editor').then((m) => {
      defineThemes(m);
      return m;
    });
  }
  return monacoPromise;
}

function defineThemes(monaco: MonacoApi): void {
  monaco.editor.defineTheme('a11yfix-light', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#f6f7f9',
    },
  });
  monaco.editor.defineTheme('a11yfix-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#11161d',
    },
  });
}

export function preferredMonacoTheme(): 'a11yfix-dark' | 'a11yfix-light' {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'dark') return 'a11yfix-dark';
  if (attr === 'light') return 'a11yfix-light';
  const prefersDark =
    typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'a11yfix-dark' : 'a11yfix-light';
}
