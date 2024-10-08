import { Component } from '@angular/core';
import { Auth, createUserWithEmailAndPassword } from 'firebase/auth';
import { AuthSharedComponent } from "../auth-shared/auth-shared.component";
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [
    AuthSharedComponent,
    RouterLink
  ],
  templateUrl: './sign-up.component.html',
  styleUrl: './sign-up.component.scss'
})
export class SignUpComponent {
  public title = 'Create Your Account';
  public buttonText = 'Sign Up';
  public submitAction = (auth: Auth, email: string, password: string) => createUserWithEmailAndPassword(auth, email, password)
}
