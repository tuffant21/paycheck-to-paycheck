import { NgClass } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { ExpenseHeaderType } from '../../models/expense-model';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [NgClass],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss'
})
export class InputComponent {
  value = input.required<any | undefined>();
  clazz = input<string>('');
  disabled = input(false);
  type = input<ExpenseHeaderType>('text');

  updated = output<any>();

  selectText(event: Event): void {
    (<HTMLInputElement>event.target).select();
  }

  update(event: Event, blur: boolean): void {
    const currentValue = this.value();
    const target = <HTMLInputElement> event.target;

    if (blur) {
      target.blur();
    }

    const value = this.type() === 'checkbox' ? target.checked : target.value;

    if (value === currentValue) return;

    this.updated.emit(value);
  }
}
