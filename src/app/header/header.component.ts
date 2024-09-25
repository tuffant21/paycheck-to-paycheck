import { NgClass } from "@angular/common";
import { Component, inject, signal, Signal, WritableSignal } from '@angular/core';
import { toSignal } from "@angular/core/rxjs-interop";
import { Router } from "@angular/router";
import { Auth, signOut, User } from "firebase/auth";
import { ButtonComponent } from "../button/button.component";
import { FIREBASE_AUTH } from "../providers/firebase-auth.provider";
import { getUser$ } from "../services/user.service";
import { Analytics, logEvent } from "firebase/analytics";
import { FIREBASE_ANALYTICS } from "../providers/firebase-analytics.provider";

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    NgClass,
    ButtonComponent
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  private auth: Auth = inject(FIREBASE_AUTH);
  private router: Router = inject(Router);
  private analytics: Analytics = inject(FIREBASE_ANALYTICS);
  public user: Signal<User | null> = toSignal(getUser$(), { initialValue: null });
  public menuClosed: WritableSignal<boolean> = signal(true);

  public navigateTo(path: string) {
    this.menuClosed.set(true);
    this.router.navigate([path]);
  }

  public signOut() {
    signOut(this.auth)
      .then(() => {
        logEvent(this.analytics, 'sign_out');
        this.navigateTo('/');
      })
      .catch((error) => {
        console.log(error);
      });
  }

  public toggleMenu() {
    this.menuClosed.update((value) => !value);
  }
}
