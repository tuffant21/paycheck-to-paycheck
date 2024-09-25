import { Component, effect, inject, isDevMode, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Analytics, logEvent } from 'firebase/analytics';
import { filter } from 'rxjs';
import { FooterComponent } from "./footer/footer.component";
import { HeaderComponent } from "./header/header.component";
import { FIREBASE_ANALYTICS } from './providers/firebase-analytics.provider';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, HeaderComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'paycheck-to-paycheck';
  private analytics: Analytics = inject(FIREBASE_ANALYTICS);
  private router: Router = inject(Router);
  private navigationEnd$ = this.router.events.pipe(filter(event => event instanceof NavigationEnd));
  private navigationEnd: Signal<NavigationEnd | undefined> = toSignal(this.navigationEnd$);

  constructor() {
    effect(() => {
      const event = this.navigationEnd();
      if (!event) return;
      const hostUrl = isDevMode() ? 'http://localhost' : 'https://paycheck-to-paycheck.com';
      const url = event.url.startsWith('/expense-tracker') ? '/expense-tracker' : event.url;

      logEvent(this.analytics, 'page_view', {
        page_location: `${hostUrl}${url}`,
        page_path: url
      });
    });
  }
}
