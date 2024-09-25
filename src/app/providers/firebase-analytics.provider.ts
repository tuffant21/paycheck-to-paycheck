import { inject, InjectionToken } from "@angular/core";
import { Analytics, getAnalytics } from "firebase/analytics";
import { FIREBASE_APP } from "./firebase-app.provider";

export const FIREBASE_ANALYTICS = new InjectionToken<Analytics>('Analytics from Firebase');

export const provideFirebaseAnalytics = () => {
  return {
    provide: FIREBASE_ANALYTICS,
    useFactory: () => {
      const app = inject(FIREBASE_APP);
      return getAnalytics(app);
    }
  };
}
