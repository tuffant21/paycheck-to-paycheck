import { InjectionToken } from "@angular/core";
import { FirebaseApp, initializeApp } from "firebase/app";
import { environment } from "../../environments/environment";

export const FIREBASE_APP = new InjectionToken<FirebaseApp>('FirebaseApp');

export const provideFirebaseApp = () => {
  return {
    provide: FIREBASE_APP,
    useFactory: () => {
      return initializeApp(environment.firebaseConfig);
    }
  };
}
