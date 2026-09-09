import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { ACCESSIBILITY_AI_PROVIDER } from './analysis/ai/ai-provider';
import { MockAIProvider } from './analysis/ai/mock-ai-provider';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),

    /**
     * Layer 2 provider binding. Swap this single line to move from the local
     * mock to a real model integration — no other file needs to change.
     */
    { provide: ACCESSIBILITY_AI_PROVIDER, useExisting: MockAIProvider },
  ],
};
