import { NgClass, NgOptimizedImage, TitleCasePipe } from "@angular/common";
import { Component, computed, input } from '@angular/core';
import { ButtonIcon } from "./icons/icons";
import { IconsComponent } from "./icons/icons.component";

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [
    TitleCasePipe,
    NgOptimizedImage,
    IconsComponent,
    NgClass
  ],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss'
})
export class ButtonComponent {
  loading = input<boolean>(false);
  clazz = input<string>();
  color = input.required<'blue' | 'green' | 'red' | 'gray' | 'transparent'>();
  disabled = input<boolean>(false);
  icon = input<ButtonIcon>('');
  positionIcon = input<'left' | 'right'>('right');
  padding = input<'sm' | 'md' | 'lg' | string>('md');
  text = input<string>();
  type = input<'submit' | 'reset' | 'button'>('button');

  colorClass = computed(() => {
    if (this.disabled()) {
      return 'bg-gray-300 text-white';
    }

    switch(this.color()) {
      case 'blue':
        return 'bg-blue-500 hover:bg-blue-600 text-white';
      case 'green':
        return 'bg-green-500 hover:bg-green-600 text-white';
      case 'red':
        return 'bg-red-500 hover:bg-red-600 text-white';
      case 'gray':
        return 'bg-gray-200 hover:bg-gray-300 text-gray-700 ';
      default:
        return '';
    }
  });

  cursorClass = computed(() => {
    return this.disabled() ? 'cursor-not-allowed' : 'cursor-pointer';
  });

  paddingClass = computed(() => {
    switch (this.padding()) {
      case 'sm':
        return 'px-3 py-1';
      case 'md':
        return 'px-4 py-2';
      case 'lg':
        return 'px-6 py-3';
      default:
        return this.padding();
    }
  });

  animateSpinClass = computed(() => {
    return this.loading() ? 'inline-flex items-center' : '';
  });

  allClasses = computed(() => {
    const always = 'rounded transition-colors duration-300 ease-in-out whitespace-nowrap';

    const classes = [
      always,
      this.animateSpinClass(),
      this.clazz(),
      this.colorClass(),
      this.cursorClass(),
      this.paddingClass(),
    ]

    return classes.join(' ');
  });
}
