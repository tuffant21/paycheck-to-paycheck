import { ApplicationConfig, isDevMode, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { connectAuthEmulator, getAuth, provideAuth } from '@angular/fire/auth';
import { getAnalytics, provideAnalytics, ScreenTrackingService, UserTrackingService } from '@angular/fire/analytics';
import { connectFirestoreEmulator, getFirestore, provideFirestore } from '@angular/fire/firestore';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({eventCoalescing: true}),
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp({
      "projectId": "paycheck-to-paycheck-b023c",
      "appId": "1:709109871667:web:d55eecfaf6274d3fcd5f46",
      "databaseURL": "https://paycheck-to-paycheck-b023c-default-rtdb.firebaseio.com",
      "storageBucket": "paycheck-to-paycheck-b023c.appspot.com",
      "apiKey": "AIzaSyC6vwyTWB1PXpWzgdgDjMt4H3o8y17ZJ8Q",
      "authDomain": "paycheck-to-paycheck-b023c.firebaseapp.com",
      "messagingSenderId": "709109871667",
      "measurementId": "G-974ZB8Y6RF"
    })),
    provideAuth(() => {
      const auth = getAuth();
      if (isDevMode()) {
        console.log('using auth emulator');
        connectAuthEmulator(auth, 'http://localhost:9099');
      }
      return auth;
    }),
    provideAnalytics(() => getAnalytics()),
    ScreenTrackingService,
    UserTrackingService,
    provideFirestore(() => {
      const firestore = getFirestore();
      if (isDevMode()) {
        console.log('using firestore emulator');
        connectFirestoreEmulator(firestore, 'localhost', 8080);
      }
      return firestore;
    })
  ]
};
