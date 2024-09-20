import { NgClass } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { ExpenseHeaderType } from '../../models/expense-model';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [NgClass],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss'
})
export class InputComponent {
  value = input.required<string | undefined>();
  clazz = input<string>('');
  disabled = input(false);
  type = input<ExpenseHeaderType>('text');

  updated = output<string>();

  classForType = computed(() => {
    if (this.type() === 'checkbox') {
      return 'accent-blue-500';
    }

    return 'rounded w-full pl-1 pr-1 disabled:cursor-text disabled:bg-transparent enabled:hover:outline enabled:hover:outline-gray-300';
  });

  allClasses = computed(() => {
    return [
      this.clazz(),
      this.classForType()
    ].join(' ');
  });

  selectText(event: Event): void {
    (<HTMLInputElement>event.target).select();
  }

  update(event: Event, blur: boolean): void {
    const currentValue = this.value();
    const target = <HTMLInputElement> event.target;

    if (blur) {
      target.blur();
    }

    if (!target.value || target.value === currentValue) return;

    this.updated.emit(target.value);
  }
}
