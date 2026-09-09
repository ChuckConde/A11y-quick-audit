import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App shell', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('creates the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders a skip link that targets the main landmark', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const skip = el.querySelector('a.skip-link') as HTMLAnchorElement | null;
    expect(skip?.getAttribute('href')).toBe('#main-content');
    expect(el.querySelector('main#main-content')).toBeTruthy();
  });

  it('exposes exactly one main landmark and a primary nav', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('main').length).toBe(1);
    expect(el.querySelector('nav[aria-label="Primary"]')).toBeTruthy();
  });
});
