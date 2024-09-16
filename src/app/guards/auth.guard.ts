import { CanMatchFn, Route, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { getUser$ } from "../services/user.service";

export const authGuard: CanMatchFn = (route: Route): Observable<boolean> => {
  const user$ = getUser$();
  const router = inject(Router);

  const redirectUnauthorizedTo = route.data?.['redirectUnauthorizedTo'];
  const redirectLoggedInTo = route.data?.['redirectLoggedInTo'];
  const requiresLoggedOut = route.data?.['requiresLoggedOut'] || false; // Default to false

  return user$.pipe(
    map(user => {
      if (user) {
        // If the route is meant for logged-out users, redirect logged-in users
        if (requiresLoggedOut) {
          if (redirectLoggedInTo) {
            router.navigate([redirectLoggedInTo]);
          }
          return false; // Block access to the route for logged-in users
        }
        return true; // Allow access if logged in and no redirection is required
      } else {
        // If user is not logged in
        if (requiresLoggedOut) {
          return true; // Allow access if the route requires the user to be logged out
        }
        if (redirectUnauthorizedTo) {
          router.navigate([redirectUnauthorizedTo]);
        }
        return false; // Block access to the route for unauthorized users by default
      }
    })
  );
};
