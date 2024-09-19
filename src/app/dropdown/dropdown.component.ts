import { Component, ElementRef, HostListener, inject, input, OnDestroy, output, Renderer2, signal, ViewChild } from '@angular/core';
import { DOCUMENT, NgClass, TitleCasePipe } from '@angular/common';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [
    TitleCasePipe,
    NgClass,
    ButtonComponent
  ],
  templateUrl: './dropdown.component.html',
  styleUrls: ['./dropdown.component.scss'],
})
export class DropdownComponent implements OnDestroy {
  label = input.required<string>();
  actions = input.required<{ id: string, label: string }[]>();
  loading = input<boolean>(false);
  disabled = input<boolean>(false);
  dropdownItemClicked = output<string>();
  isOpen = signal<boolean>(false);

  // Reference to the dropdown element
  @ViewChild('dropdownMenu') dropdownMenu!: ElementRef;

  private elementRef: ElementRef = inject(ElementRef);
  private renderer: Renderer2 = inject(Renderer2);
  private document: Document = inject(DOCUMENT);
  private dropdownContainer!: HTMLElement;

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: Event) {
    if (this.isOpen() && !this.elementRef.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }

  @HostListener('document:keydown.escape')
  close() {
    if (this.isOpen()) {
      this.closeDropdown();
    }
  }

  toggleDropdown() {
    if (this.isOpen()) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  openDropdown() {
    this.isOpen.set(true);

    // Create the dropdown menu container if it doesn't exist
    this.dropdownContainer = this.renderer.createElement('div');
    this.renderer.appendChild(this.document.body, this.dropdownContainer);

    // Clone the dropdown menu and append it to the body
    const dropdownMenuElement = this.dropdownMenu.nativeElement;
    this.renderer.appendChild(this.dropdownContainer, dropdownMenuElement);

    // Position the dropdown relative to the button
    const rect = this.elementRef.nativeElement.getBoundingClientRect();
    this.renderer.setStyle(this.dropdownContainer, 'position', 'absolute');
    this.renderer.setStyle(this.dropdownContainer, 'top', `${rect.bottom}px`);
    this.renderer.setStyle(this.dropdownContainer, 'left', `${rect.left}px`);
    this.renderer.setStyle(this.dropdownContainer, 'z-index', '9999');
  }

  closeDropdown() {
    this.isOpen.set(false);

    // Remove the dropdown from the body
    if (this.dropdownContainer) {
      this.renderer.removeChild(this.document.body, this.dropdownContainer);
    }
  }

  ngOnDestroy() {
    // Clean up if the component is destroyed
    if (this.isOpen() && this.dropdownContainer) {
      this.renderer.removeChild(this.document.body, this.dropdownContainer);
    }
  }

  selectAction(id: string) {
    this.dropdownItemClicked.emit(id);
    this.closeDropdown();
  }
}