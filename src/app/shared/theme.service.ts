import { Injectable, signal } from '@angular/core';

export type ThemeChoice = 'light' | 'dark' | 'system';

const KEY = 'a11yfix.theme';

/** Persists the user's colour-scheme choice and reflects it on <html data-theme>. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _choice = signal<ThemeChoice>(this.read());
  readonly choice = this._choice.asReadonly();

  constructor() {
    this.apply(this._choice());
  }

  set(choice: ThemeChoice): void {
    this._choice.set(choice);
    try {
      if (choice === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, choice);
    } catch {
      /* storage may be unavailable */
    }
    this.apply(choice);
  }

  /** Cycle light → dark → system for a single toggle control. */
  cycle(): ThemeChoice {
    const order: ThemeChoice[] = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(this._choice()) + 1) % order.length];
    this.set(next);
    return next;
  }

  private read(): ThemeChoice {
    try {
      const v = localStorage.getItem(KEY);
      if (v === 'light' || v === 'dark') return v;
    } catch {
      /* ignore */
    }
    return 'system';
  }

  private apply(choice: ThemeChoice): void {
    const root = document.documentElement;
    if (choice === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', choice);
  }
}
