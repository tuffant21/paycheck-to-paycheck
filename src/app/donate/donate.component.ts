import { Component } from '@angular/core';
import { environment } from "../../environments/environment";
import { ButtonComponent } from "../button/button.component";

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
}
