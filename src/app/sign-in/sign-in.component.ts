import { Component } from '@angular/core';
import { Auth, signInWithEmailAndPassword } from "@angular/fire/auth";
import { AuthSharedComponent } from "../auth-shared/auth-shared.component";

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [
    AuthSharedComponent
  ],
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.scss'
})
export class SignInComponent {
  public title = 'Sign In';
  public buttonText = 'Sign In';
  public submitAction = (auth: Auth, email: string, password: string) => signInWithEmailAndPassword(auth, email, password)
}
