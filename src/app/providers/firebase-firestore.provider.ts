import { inject, InjectionToken, isDevMode } from "@angular/core";
import { connectFirestoreEmulator, Firestore, getFirestore } from "firebase/firestore";
import { FIREBASE_APP } from "./firebase-app.provider";

export const FIREBASE_FIRESTORE = new InjectionToken<Firestore>('Firestore from Firebase');

export const provideFirebaseFirestore = () => {
  return {
    provide: FIREBASE_FIRESTORE,
    useFactory: () => {
      const app = inject(FIREBASE_APP);
      const firestore = getFirestore(app);

      if (isDevMode()) {
        console.log('using firestore emulator');
        connectFirestoreEmulator(firestore, 'localhost', 8080);
      }

      return firestore;
    }
  };
}
