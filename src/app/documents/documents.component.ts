import { Component, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { ExpenseService } from "../repos/expense.service";
import { Router, RouterLink } from "@angular/router";
import { ExpenseModel } from "../models/expense-model";
import { DatePipe } from "@angular/common";

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe
  ],
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.scss'
})
export class DocumentsComponent implements OnInit {
  // Reactive signals
  page: WritableSignal<number> = signal(0); // Tracks the current page number
  filter: WritableSignal<string> = signal('all'); // Tracks the selected filter
  sortBy: WritableSignal<string> = signal('modified'); // Tracks the selected sort option
  documents: WritableSignal<ExpenseModel[]> = signal([]); // Tracks the documents to display

  // Inject dependencies
  private router = inject(Router);
  private expenseService = inject(ExpenseService);

  ngOnInit() {
    this.getDocuments(); // Load the documents on initialization
  }

  nextPage(): void {
    this.page.update(p => p + 1);
    this.getDocuments(); // Refresh the documents
  }

  previousPage(): void {
    if (this.page() > 0) {
      this.page.update(p => p - 1);
      this.getDocuments(); // Refresh the documents
    }
  }

  applyFilter(filter: string): void {
    this.filter.set(filter); // Set the new filter
    this.page.set(0); // Reset to the first page when applying a new filter
    this.getDocuments(); // Refresh the documents
  }

  applySort(sortBy: string): void {
    this.sortBy.set(sortBy); // Set the new sort option
    this.page.set(0); // Reset to the first page when applying a new filter
    this.getDocuments(); // Refresh the documents
  }

  async createDocument(): Promise<void> {
    const docId = await this.expenseService.createDocument();
    this.router.navigate(['/expense-tracker', docId]);
  }

  async getDocuments(): Promise<void> {
    const docs = await this.expenseService.getDocuments(this.page(), this.filter(), this.sortBy());
    this.documents.set(docs);
  }
}
