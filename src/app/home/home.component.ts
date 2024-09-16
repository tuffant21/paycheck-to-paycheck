import { Component } from '@angular/core';
import { RouterLink } from "@angular/router";
import { getUser$ } from "../services/user.service";
import { toSignal } from "@angular/core/rxjs-interop";
import { ButtonComponent } from "../button/button.component";

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
