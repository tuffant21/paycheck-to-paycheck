import { Component, inject, signal, Signal, WritableSignal } from '@angular/core';
import { Router } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { NgClass } from "@angular/common";
import { Auth, signOut, User } from "firebase/auth";
import { FIREBASE_AUTH } from "../providers/firebase-auth.provider";
import { getUser$ } from "../services/user.service";
import { ButtonComponent } from "../button/button.component";

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
  public user: Signal<User | null> = toSignal(getUser$(), { initialValue: null });
  public menuClosed: WritableSignal<boolean> = signal(true);

  public navigateTo(path: string) {
    this.menuClosed.set(true);
    this.router.navigate([path]);
  }

  public signOut() {
    signOut(this.auth)
      .then(() => {
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
