import { Component, input } from '@angular/core';
import { ButtonIcon } from "./icons";

@Component({
  selector: 'app-icons',
  standalone: true,
  imports: [],
  templateUrl: './icons.component.html',
  styleUrl: './icons.component.scss'
})
export class IconsComponent {
  icon = input.required<ButtonIcon>();
}
