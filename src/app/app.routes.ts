import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    data: { title: 'Accessibility analyzer' },
    loadComponent: () => import('./features/analyzer/analyzer-page').then((m) => m.AnalyzerPage),
  },
  {
    path: 'learn',
    data: { title: 'Learn accessibility' },
    loadComponent: () => import('./features/learn/learn-page').then((m) => m.LearnPage),
  },
  {
    path: 'wcag',
    data: { title: 'WCAG reference' },
    loadComponent: () => import('./features/wcag/wcag-page').then((m) => m.WcagPage),
  },
  {
    path: 'about',
    data: { title: 'About A11yFix' },
    loadComponent: () => import('./features/about/about-page').then((m) => m.AboutPage),
  },
  // Reserved for future SEO landing pages: /tools/:slug
  {
    path: 'tools/:slug',
    loadComponent: () => import('./features/tools/tool-placeholder-page').then((m) => m.ToolPlaceholderPage),
  },
  { path: '**', redirectTo: '' },
];
