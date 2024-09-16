import { Component, HostListener, input, output } from '@angular/core';
import { NgClass, TitleCasePipe } from "@angular/common";
import { ButtonComponent } from "../button/button.component";

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [
    TitleCasePipe,
    NgClass,
    ButtonComponent
  ],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss'
})
export class ModalComponent {
  visible = input.required<boolean>();
  title = input.required<string>();
  confirmText = input<string>();
  closeText = input.required<string>();

  confirmAction = output();
  closeAction = output();

  @HostListener('document:keydown.escape')
  close() {
    if (this.visible()) {
      this.closeAction.emit();
    }
  }
}
