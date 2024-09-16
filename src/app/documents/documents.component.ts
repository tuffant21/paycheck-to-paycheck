import { Component, computed, inject, OnInit, Signal, signal, WritableSignal } from '@angular/core';
import { ExpenseService } from "../services/expense.service";
import { Router, RouterLink } from "@angular/router";
import { DatePipe, NgClass } from "@angular/common";
import { ExpenseModel } from "../models/expense-model";
import { OrderByDirection, QueryDocumentSnapshot, QuerySnapshot, startAfter, startAt } from "firebase/firestore";
import { ButtonComponent } from "../button/button.component";

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    NgClass,
    ButtonComponent
  ],
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.scss'
})
export class DocumentsComponent implements OnInit {
  // Inject dependencies
  private router = inject(Router);
  private expenseService = inject(ExpenseService);

  // Reactive signals
  public filter: WritableSignal<'all' | 'owned' | 'shared'> = signal('all'); // Tracks the selected filter
  public sortBy: WritableSignal<'created' | 'modified'> = signal('modified'); // Tracks the selected sort option
  public sortDirection: WritableSignal<OrderByDirection> = signal('asc'); // Tracks the selected sort direction

  // each time we get a new page, we need to track the first element for each previous page to reference later
  // the first page should push undefined to the previous snapshot so it doesn't have a startAfter point
  private previousSnapshotStart: WritableSignal<QueryDocumentSnapshot[]> = signal([]); // Tracks the previous documents
  private currentSnapshot: WritableSignal<QuerySnapshot | undefined> = signal(undefined); // Tracks the documents to display
  private nextSnapshot: WritableSignal<QuerySnapshot | undefined> = signal(undefined); // Tracks the next documents

  public hasPrevious: Signal<boolean> = computed(() => {
    return this.previousSnapshotStart().length > 0;
  });
  public hasNext: Signal<boolean> = computed(() => {
    const currentSnapshot = this.currentSnapshot();
    const nextSnapshot = this.nextSnapshot();

    if (!currentSnapshot || currentSnapshot.size < 10) {
      return false;
    }

    return nextSnapshot ? !nextSnapshot.empty : false;
  });
  public documents: Signal<ExpenseModel[]> = computed(() => {
    // I don't think this is the best way to scroll to the top of the page, but it's the easiest way to do it and it works
    window.scrollTo({top: 0, behavior: 'smooth'});

    const snapshot = this.currentSnapshot();
    return snapshot ? snapshot.docs.map(doc => doc.data() as ExpenseModel) : [];
  });

  ngOnInit() {
    this.resetSnapshots();
  }

  async nextPage(): Promise<void> {
    const currentSnapshot = this.currentSnapshot();
    const nextSnapshot = this.nextSnapshot();

    if (currentSnapshot && nextSnapshot) {
      const previousStartAt = currentSnapshot.docs[0];
      const startAfterLastDoc = nextSnapshot.docs[nextSnapshot.size - 1];

      this.previousSnapshotStart.update((prev) => [...prev, previousStartAt]);
      this.currentSnapshot.set(this.nextSnapshot());
      this.nextSnapshot.set(undefined);

      if (nextSnapshot.size === 10) {
        const next = await this.expenseService.getDocuments(startAfter(startAfterLastDoc), this.filter(), this.sortBy(), this.sortDirection());
        this.nextSnapshot.set(next);
      }
    }
  }

  async previousPage(): Promise<void> {
    if (this.hasPrevious()) {
      const previousRef = this.previousSnapshotStart()[this.previousSnapshotStart().length - 1];
      this.nextSnapshot.set(this.currentSnapshot());
      this.previousSnapshotStart.update((prev) => prev.slice(0, prev.length - 1));

      const previous = await this.expenseService.getDocuments(startAt(previousRef), this.filter(), this.sortBy(), this.sortDirection());
      this.currentSnapshot.set(previous);
    }
  }

  applyFilter(filter: 'all' | 'owned' | 'shared'): void {
    this.filter.set(filter); // Set the new filter
    this.resetSnapshots();
  }

  applySort(sortBy: 'created' | 'modified'): void {
    if (this.sortBy() === sortBy) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortDirection.set('asc');
      this.sortBy.set(sortBy);
    }

    this.resetSnapshots();
  }

  async createDocument(): Promise<void> {
    const docId = await this.expenseService.createDocument();
    this.router.navigate(['/expense-tracker', docId]);
  }

  private async resetSnapshots(): Promise<void> {
    this.previousSnapshotStart.set([]);
    this.currentSnapshot.set(undefined);
    this.nextSnapshot.set(undefined);

    const currentSnapshot = await this.expenseService.getDocuments(null, this.filter(), this.sortBy(), this.sortDirection());
    this.currentSnapshot.set(currentSnapshot);

    if (currentSnapshot.size === 10) {
      const startAfterLastDoc = currentSnapshot.docs[currentSnapshot.size - 1];
      const nextSnapshot = await this.expenseService.getDocuments(startAfter(startAfterLastDoc), this.filter(), this.sortBy(), this.sortDirection());
      this.nextSnapshot.set(nextSnapshot);
    }
  }
}
