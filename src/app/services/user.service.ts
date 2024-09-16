import { inject } from '@angular/core';
import { Auth, onAuthStateChanged, User } from "firebase/auth";
import { FIREBASE_AUTH } from "../providers/firebase-auth.provider";
import { Observable } from "rxjs";

export const getUser$: () => Observable<User | null> = () => {
  const auth: Auth = inject(FIREBASE_AUTH);

  return new Observable<User | null>(observer => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      observer.next(user);
    });

    return () => {
      unsubscribe();
    };
  });
};
