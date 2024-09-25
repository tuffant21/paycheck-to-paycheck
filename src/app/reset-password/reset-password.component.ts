import { Component, inject, signal, WritableSignal } from '@angular/core';
import { ButtonComponent } from "../button/button.component";
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FIREBASE_AUTH } from '../providers/firebase-auth.provider';
import { Auth, sendPasswordResetEmail } from 'firebase/auth';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    ButtonComponent,
    ReactiveFormsModule
  ],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent {

  private auth: Auth = inject(FIREBASE_AUTH);
  private fb: FormBuilder = inject(FormBuilder);

  protected fg: FormGroup;
  protected emailError: WritableSignal<string> = signal('');

  constructor() {
    this.fg = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
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

  submit() {
    if (this.fg.invalid) {
      return;
    }

    const email = this.fg.value.email.trim();

    sendPasswordResetEmail(this.auth, email)
      .then(() => {
        window.alert('Password reset email sent. Please check your inbox.');
      })
      .catch((error) => {
        console.error('Error resetting password:', error);
        window.alert('Error resetting password. Please try again.');
      });
  }
}
