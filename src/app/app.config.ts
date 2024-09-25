import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling, withViewTransitions } from '@angular/router';

import { routes } from './app.routes';
import { provideFirebaseApp } from "./providers/firebase-app.provider";
import { provideFirebaseAuth } from "./providers/firebase-auth.provider";
import { provideFirebaseFirestore } from "./providers/firebase-firestore.provider";
import { provideFirebaseAnalytics } from './providers/firebase-analytics.provider';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({eventCoalescing: true}),
    provideRouter(routes, withViewTransitions(), withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
    provideFirebaseApp(),
    provideFirebaseAuth(),
    provideFirebaseFirestore(),
    provideFirebaseAnalytics()
  ]
};
