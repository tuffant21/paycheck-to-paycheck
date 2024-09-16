import { Component, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';
import { TitleCasePipe } from "@angular/common";
import { ButtonComponent } from "../button/button.component";

@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [
    TitleCasePipe,
    ButtonComponent
  ],
  templateUrl: './dropdown.component.html',
  styleUrl: './dropdown.component.scss'
})
export class DropdownComponent {

  label = input.required<string>();
  actions = input.required<{ id: string, label: string }[]>();
  dropdownItemClicked = output<string>();

  private elementRef: ElementRef = inject(ElementRef);
  isOpen = signal<boolean>(false);

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: Event) {
    // Check if the click is outside the dropdown element
    if (this.isOpen() && !this.elementRef.nativeElement.contains(event.target)) {
      this.toggleDropdown();
    }
  }

  @HostListener('document:keydown.escape')
  close() {
    if (this.isOpen()) {
      this.toggleDropdown();
    }
  }

  toggleDropdown() {
    this.isOpen.update(open => !open);
  }

  selectAction(id: string) {
    this.dropdownItemClicked.emit(id);
    this.toggleDropdown();
  }

}
