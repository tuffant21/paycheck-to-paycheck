import { Component, input, output, signal, WritableSignal } from '@angular/core';
import { ButtonComponent } from "../../button/button.component";
import { ExpenseData, ExpenseHeader } from '../../models/expense-model';
import { InputComponent } from "../input/input.component";

@Component({
  selector: 'app-bill-table',
  standalone: true,
  imports: [InputComponent, ButtonComponent],
  templateUrl: './bill-table.component.html',
  styleUrl: './bill-table.component.scss'
})
export class BillTableComponent {
  hovering: WritableSignal<ExpenseData | null> = signal(null);

  headers = input.required<ExpenseHeader[]>();
  data = input.required<ExpenseData[]>();
  isOwner = input.required<boolean>();
  isEditor = input.required<boolean>();
  isViewer = input.required<boolean>();

  sortTable = output<string>();
  toggleDisabled = output<ExpenseData>();
  openDeleteBillModal = output<ExpenseData>();
  valueUpdate = output<{ bill: ExpenseData, key: string, value: any }>();

  valueUpdated(bill: ExpenseData, key: string, value: any) {
    this.valueUpdate.emit({ bill, key, value });
  }
}
