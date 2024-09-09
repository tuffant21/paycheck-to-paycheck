import { inject } from '@angular/core';
import { CanMatchFn, Route, Router, UrlSegment } from '@angular/router';
import { collection, doc, Firestore, getDoc } from "@angular/fire/firestore";

export const documentExistsGuard: CanMatchFn = async (route: Route, segments: UrlSegment[]): Promise<boolean> => {
  const firestore = inject(Firestore);
  const router = inject(Router);
  const EXPENSES = 'expenses'; // Suggested collection name
  const documentId = segments[1]?.path;
  const redirectUrl = route.data?.['redirectNotFoundTo'] || '/documents'; // Default redirect URL

  if (!documentId) {
    router.navigate([redirectUrl]); // Redirect if no document ID is provided
    return false;
  }

  const collectionRef = collection(firestore, EXPENSES);
  const docRef = doc(collectionRef, documentId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return true;
  } else {
    router.navigate([redirectUrl]); // Document not found, redirect
    return false;
  }
};
