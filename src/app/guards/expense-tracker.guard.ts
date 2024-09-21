import { inject } from '@angular/core';
import { CanMatchFn, Route, Router, UrlSegment } from '@angular/router';
import { User } from "firebase/auth";
import { collection, doc, DocumentSnapshot, getDoc } from "firebase/firestore";
import { combineLatest, from, Observable, of, switchMap } from "rxjs";
import { ExpenseModel } from "../models/expense-model";
import { FIREBASE_FIRESTORE } from "../providers/firebase-firestore.provider";
import { getUser$ } from "../services/user.service";

export const expenseTrackerGuard: CanMatchFn = (route: Route, segments: UrlSegment[]): Observable<boolean> => {
  const router = inject(Router);
  const redirectUrl = route.data?.['redirectNotFoundTo'] || '/documents'; // Default redirect URL
  const documentId = segments[1]?.path;

  if (!documentId) {
    router.navigate([redirectUrl]); // Redirect if no document ID is provided
    return of(false);
  }

  const firestore = inject(FIREBASE_FIRESTORE);
  const collectionRef = collection(firestore, 'expenses');
  const docRef = doc(collectionRef, documentId);

  return combineLatest([getUser$(), from(getDoc(docRef))]).pipe(
    switchMap(([user, docSnap]: [User | null, DocumentSnapshot]) => {
      if (!user || !user.uid || !user.email || !docSnap.exists()) {
        router.navigate([redirectUrl]); // Redirect if no document ID is provided
        return of(false);
      }

      // check acl
      const data = docSnap.data() as ExpenseModel;

      const isOwner = data.createdBy === user.uid;
      const isEditor = !user.email ? false : data.acl.editors.includes(user.email);
      const isViewer = !user.email ? false : data.acl.viewers.includes(user.email);

      if (!isOwner && !isEditor && !isViewer) {
        router.navigate([redirectUrl]); // Redirect if no document ID is provided
        return of(false);
      }

      return of(true);
    })
  );
};
