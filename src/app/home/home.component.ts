import { Component } from '@angular/core';
import { toSignal } from "@angular/core/rxjs-interop";
import { RouterLink } from "@angular/router";
import { ButtonComponent } from "../button/button.component";
import { getUser$ } from "../services/user.service";

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterLink,
    ButtonComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  public user = toSignal(getUser$());
}
