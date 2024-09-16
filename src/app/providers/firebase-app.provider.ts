import { InjectionToken } from "@angular/core";
import { FirebaseApp, initializeApp } from "firebase/app";

export const FIREBASE_APP = new InjectionToken<FirebaseApp>('FirebaseApp');

export const provideFirebaseApp = () => {
  return {
    provide: FIREBASE_APP,
    useFactory: () => {
      return initializeApp({
        "projectId": "paycheck-to-paycheck-b023c",
        "appId": "1:709109871667:web:d55eecfaf6274d3fcd5f46",
        "databaseURL": "https://paycheck-to-paycheck-b023c-default-rtdb.firebaseio.com",
        "storageBucket": "paycheck-to-paycheck-b023c.appspot.com",
        "apiKey": "AIzaSyC6vwyTWB1PXpWzgdgDjMt4H3o8y17ZJ8Q",
        "authDomain": "paycheck-to-paycheck-b023c.firebaseapp.com",
        "messagingSenderId": "709109871667",
        "measurementId": "G-974ZB8Y6RF"
      });
    }
  };
}
