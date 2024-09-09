import { Component, inject, signal, Signal, WritableSignal } from '@angular/core';
import { Router } from "@angular/router";
import { Auth, signOut, User, user } from "@angular/fire/auth";
import { toSignal } from "@angular/core/rxjs-interop";
import { NgClass } from "@angular/common";

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    NgClass
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  private auth: Auth = inject(Auth);
  private router: Router = inject(Router);
  public userSignal: Signal<User | null> = toSignal(user(this.auth), { initialValue: null });
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
