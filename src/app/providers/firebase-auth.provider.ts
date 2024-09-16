import { inject, InjectionToken, isDevMode } from "@angular/core";
import { Auth, connectAuthEmulator, getAuth } from "firebase/auth";
import { FIREBASE_APP } from "./firebase-app.provider";

export const FIREBASE_AUTH = new InjectionToken<Auth>('Auth from Firebase');

export const provideFirebaseAuth = () => {
  return {
    provide: FIREBASE_AUTH,
    useFactory: () => {
      const app = inject(FIREBASE_APP);
      const auth = getAuth(app);

      if (isDevMode()) {
        console.log('using auth emulator');
        connectAuthEmulator(auth, 'http://localhost:9099');
      }

      return auth;
    }
  };
}
