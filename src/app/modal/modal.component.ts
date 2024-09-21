import { NgClass, TitleCasePipe } from "@angular/common";
import { Component, HostListener, input, output } from '@angular/core';
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
  disabled = input<boolean>(false);
  loading = input<boolean>(false);

  confirmAction = output();
  closeAction = output();

  @HostListener('document:keydown.escape')
  close() {
    if (this.visible()) {
      this.closeAction.emit();
    }
  }
}
