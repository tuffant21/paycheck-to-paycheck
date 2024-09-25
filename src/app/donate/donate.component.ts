import { Component, inject } from '@angular/core';
import { environment } from "../../environments/environment";
import { ButtonComponent } from "../button/button.component";
import { Analytics, logEvent } from 'firebase/analytics';
import { FIREBASE_ANALYTICS } from '../providers/firebase-analytics.provider';

@Component({
  selector: 'app-donate',
  standalone: true,
  imports: [
    ButtonComponent
  ],
  templateUrl: './donate.component.html',
  styleUrl: './donate.component.scss'
})
export class DonateComponent {
  private analytics: Analytics = inject(FIREBASE_ANALYTICS);

  getFiveDollarLink(): string {
    return environment.fiveDollarLink;
  }

  getTenDollarLink(): string {
    return environment.tenDollarLink;
  }

  getTwentyDollarLink(): string {
    return environment.twentyDollarLink;
  }

  getFiftyDollarLink(): string {
    return environment.fiftyDollarLink;
  }

  getCustomAmountLink(): string {
    return environment.customAmountLink;
  }

  logDonateEvent(value?: number) {
    logEvent(this.analytics, 'donate', { value });
  }
}
