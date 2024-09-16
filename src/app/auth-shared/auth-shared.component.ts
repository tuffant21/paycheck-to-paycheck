import { Component, inject, input, signal, WritableSignal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { NgClass } from "@angular/common";
import { Auth, GoogleAuthProvider, signInWithPopup, UserCredential } from 'firebase/auth';
import { FIREBASE_AUTH } from "../providers/firebase-auth.provider";
import { ButtonComponent } from "../button/button.component";

@Component({
  selector: 'app-auth-shared',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgClass,
    ButtonComponent
  ],
  templateUrl: './auth-shared.component.html',
  styleUrl: './auth-shared.component.scss'
})
export class AuthSharedComponent {
  public title = input.required<string>();
  public buttonText = input.required<string>();
  public onSubmitAction = input.required<(auth: Auth, email: string, password: string) => Promise<UserCredential>>();

  private auth: Auth = inject(FIREBASE_AUTH);
  private router: Router = inject(Router);
  private fb: FormBuilder = inject(FormBuilder);
  private StrongPasswordRegx: RegExp = /^(?=[^A-Z]*[A-Z])(?=[^a-z]*[a-z])(?=\D*\d).{8,}$/;

  protected fg: FormGroup;
  protected emailError: WritableSignal<string> = signal('');
  protected passwordError: WritableSignal<string> = signal('');
  protected errorMessage: WritableSignal<string> = signal('');

  constructor() {
    this.fg = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(this.StrongPasswordRegx)]]
    });
  }

  updateEmailError() {
    const email: FormControl = this.fg.get('email') as FormControl;

    this.emailError.set('');

    if (email.hasError('required')) {
      this.emailError.set('Email is required');
    } else if (email.hasError('email')) {
      this.emailError.set('Email is invalid');
    }
  }

  updatePasswordError() {
    const password: FormControl = this.fg.get('password') as FormControl;

    this.passwordError.set('');

    if (password.hasError('required')) {
      this.passwordError.set('Password is required');
    } else if (password.hasError('minlength')) {
      this.passwordError.set('Password must be at least 8 characters');
    } else if (password.hasError('pattern')) {
      this.passwordError.set('Password must contain at least one uppercase letter, one lowercase letter, and one number');
    }
  }

  signInWithGoogle() {
    this.manageRedirectAndError(() => signInWithPopup(this.auth, new GoogleAuthProvider()));
  }

  // signInWithFacebook() {
  //   this.manageRedirectAndError(() => signInWithPopup(this.auth, new FacebookAuthProvider()));
  // }

  submit() {
    this.errorMessage.set('');

    if (this.fg.invalid) {
      return;
    }

    const email = this.fg.value.email.trim();
    const password = this.fg.value.password.trim();

    this.manageRedirectAndError(() => this.onSubmitAction()(this.auth, email, password));
  }

  private manageRedirectAndError(fn: () => Promise<UserCredential>) {
    fn()
      .then(() => {
        // On successful signup, navigate to another page
        this.router.navigate(['/documents']);
      })
      .catch((error) => {
        this.errorMessage.set(error.message);
      });
  }
}
