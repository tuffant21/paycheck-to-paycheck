import { DatePipe, NgClass } from "@angular/common";
import { Component, computed, inject, OnInit, Signal, signal, WritableSignal } from '@angular/core';
import { Router, RouterLink } from "@angular/router";
import { OrderByDirection, QueryDocumentSnapshot, QuerySnapshot, startAfter, startAt } from "firebase/firestore";
import { ButtonComponent } from "../button/button.component";
import { ExpenseModel } from "../models/expense-model";
import { ExpenseService } from "../services/expense.service";
import { FIREBASE_ANALYTICS } from "../providers/firebase-analytics.provider";
import { logEvent } from "firebase/analytics";

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
  private analytics = inject(FIREBASE_ANALYTICS);
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
  public creatingNewDocument: WritableSignal<boolean> = signal(false);

  ngOnInit() {
    this.resetSnapshots();
  }

  async nextPage(): Promise<void> {
    const currentSnapshot = this.currentSnapshot();
    const nextSnapshot = this.nextSnapshot();

    if (currentSnapshot && nextSnapshot) {
      logEvent(this.analytics, 'next_page_documents');
      const previousStartAt = currentSnapshot.docs[0];
      const startAfterLastDoc = nextSnapshot.docs[nextSnapshot.size - 1];

      this.previousSnapshotStart.update((prev) => [...prev, previousStartAt]);
      this.currentSnapshot.set(this.nextSnapshot());
      this.nextSnapshot.set(undefined);

      // preload next result set
      if (nextSnapshot.size === 10) {
        const resp = await this.expenseService.getDocuments(startAfter(startAfterLastDoc), this.filter(), this.sortBy(), this.sortDirection());

        resp.success
          ? this.nextSnapshot.set(resp.data)
          : window.alert(resp.error);
      }
    }
  }

  async previousPage(): Promise<void> {
    if (this.hasPrevious()) {
      logEvent(this.analytics, 'previous_page_documents');
      const previousRef = this.previousSnapshotStart()[this.previousSnapshotStart().length - 1];
      this.nextSnapshot.set(this.currentSnapshot());
      this.previousSnapshotStart.update((prev) => prev.slice(0, prev.length - 1));

      const resp = await this.expenseService.getDocuments(startAt(previousRef), this.filter(), this.sortBy(), this.sortDirection());

      resp.success
        ? this.currentSnapshot.set(resp.data)
        : window.alert(resp.error);
    }
  }

  applyFilter(filter: 'all' | 'owned' | 'shared'): void {
    this.filter.set(filter); // Set the new filter
    logEvent(this.analytics, 'filter_documents', { filter });
    this.resetSnapshots();
  }

  applySort(sortBy: 'created' | 'modified'): void {
    if (this.sortBy() === sortBy) {
      const direction = this.sortDirection() === 'asc' ? 'desc' : 'asc';
      logEvent(this.analytics, 'sort_documents', { sort: sortBy, direction });
      this.sortDirection.set(direction);
    } else {
      logEvent(this.analytics, 'sort_documents', { sort: sortBy, direction: 'asc' });
      this.sortDirection.set('asc');
      this.sortBy.set(sortBy);
    }

    this.resetSnapshots();
  }

  async createDocument(): Promise<void> {
    logEvent(this.analytics, 'create_document');
    this.creatingNewDocument.set(true);
    const resp = await this.expenseService.createDocument();
    this.creatingNewDocument.set(false);

    resp.success
      ? this.router.navigate(['/expense-tracker', resp.data.id])
      : window.alert(resp.error);
  }

  private async resetSnapshots(): Promise<void> {
    this.previousSnapshotStart.set([]);
    this.currentSnapshot.set(undefined);
    this.nextSnapshot.set(undefined);

    let resp = await this.expenseService.getDocuments(null, this.filter(), this.sortBy(), this.sortDirection());

    if (!resp.success) {
      window.alert(resp.error);
      return;
    }

    this.currentSnapshot.set(resp.data);

    if (resp.data.size === 10) {
      const startAfterLastDoc = resp.data.docs[resp.data.size - 1];
      resp = await this.expenseService.getDocuments(startAfter(startAfterLastDoc), this.filter(), this.sortBy(), this.sortDirection());

      resp.success
        ? this.nextSnapshot.set(resp.data)
        : window.alert(resp.error);
    }
  }
}
