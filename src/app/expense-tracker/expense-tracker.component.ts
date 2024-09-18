import { Component, computed, inject, signal, Signal, WritableSignal } from '@angular/core';
import { ExpenseModel } from "../models/expense-model";
import { ActivatedRoute } from "@angular/router";
import { DecimalPipe, TitleCasePipe } from "@angular/common";
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { ExpenseService } from "../services/expense.service";
import { toSignal } from "@angular/core/rxjs-interop";
import { ModalComponent } from "../modal/modal.component";
import { DropdownComponent } from "../dropdown/dropdown.component";
import { ButtonComponent } from "../button/button.component";
import { getUser$ } from "../services/user.service";
import { User } from "firebase/auth";

@Component({
  selector: 'app-expense-tracker',
  standalone: true,
  imports: [
    DecimalPipe,
    FormsModule,
    ModalComponent,
    DropdownComponent,
    TitleCasePipe,
    ReactiveFormsModule,
    ButtonComponent
  ],
  templateUrl: './expense-tracker.component.html',
  styleUrl: './expense-tracker.component.scss'
})
export class ExpenseTrackerComponent {
  private route: ActivatedRoute = inject(ActivatedRoute);
  private expenseService: ExpenseService = inject(ExpenseService);
  private user: Signal<User | null> = toSignal(getUser$(), { initialValue: null });

  public document: Signal<ExpenseModel | undefined> = toSignal(this.expenseService.getDocument$(this.route.snapshot.paramMap.get('id') ?? ''));
  public flatmapAcl: Signal<{ role: string, email: string }[]> = computed(() => {
    const document = this.document();
    if (!document) return [];

    const editors = document.acl.editors.map(email => ({ role: 'editor', email }));
    const viewers = document.acl.viewers.map(email => ({ role: 'viewer', email }));

    return [...editors, ...viewers];
  });
  
  // permissions
  isOwner: Signal<boolean> = computed(() => {
    const user = this.user();
    const document = this.document();
    if (!user || !user.email || !document) {
      return false;
    }

    return user.uid === document.createdBy
  });

  isEditor: Signal<boolean> = computed(() => {
    const user = this.user();
    const document = this.document();
    if (!user || !user.email || !document) {
      return false;
    }

    return document.acl.editors.includes(user.email);
  });

  isViewer: Signal<boolean> = computed(() => {
    const user = this.user();
    const document = this.document();
    if (!user || !user.email || !document) {
      return false;
    }

    return document.acl.viewers.includes(user.email);
  });

  // modals
  showDeleteDocumentModal: WritableSignal<boolean> = signal(false);
  showShareModal: WritableSignal<boolean> = signal(false);
  pendingRemoveAccess: WritableSignal<{ role: string, email: string } | null> = signal(null);
  showConfirmRemoveAccessModal: WritableSignal<boolean> = signal(false);
  shareEmail = new FormControl('', [ Validators.required, Validators.email ]);
  emailError: WritableSignal<string> = signal('');

  // state
  sortBy: string | null = null;
  sortDirection: 'asc' | 'desc' | null = null;
  newUserRole: string = 'viewer';
  editingCell: { [bill: string]: { [header: string]: boolean } } = {};
  actionBill: any;

  initializeEditingState() {
    // this.expense?.data?.forEach(bill => {
    //   this.editingCell[bill] = {};
    //   this.expense?.headers?.forEach(header => {
    //     this.editingCell[bill][header.key] = false;
    //   });
    // });
  }

  getManageDocumentActions() {
    return this.isViewer()
      ? []
      : this.isEditor()
      ? [{ id: 'share', label: 'Share Document' }]
      : [{ id: 'share', label: 'Share Document' }, { id: 'delete', label: 'Delete Document' }];
  }

  updateEmailError() {
    this.emailError.set('');

    if (this.shareEmail.hasError('required')) {
      this.emailError.set('* Email is required');
    } else if (this.shareEmail.hasError('email')) {
      this.emailError.set('Email is invalid');
    }
  }

  // Enable editing of the clicked cell
  editCell(bill?: any, headerKey?: string) {
    if (!bill || !headerKey) return;

    this.editingCell[bill][headerKey] = true;
  }

  // Save the edited value and close the input field
  async saveCell(bill: any, headerKey: string) {
    // this.editingCell[bill][headerKey] = false;
    //
    // const docRef = doc(this.firestore, `expenses/${this.expenseId}`);
    // await updateDoc(docRef, {
    //   [`data`]: this.expense?.data,
    // });
  }

  // async getExpenseDocument(id: string) {
  //   const docRef = doc(this.firestore, `expenses/${id}`);
  //   const docSnap = await getDoc(docRef);
  //
  //   if (docSnap.exists()) {
  //     this.expense = docSnap.data() as ExpenseModel;
  //     this.initializeEditingState();
  //   }
  // }

  // Sorting logic for table columns
  sortTable(column: string | undefined) {
    if (!column) return;

    const document = this.document();
    if (!document || !document.data) return;

    if (this.sortBy === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : this.sortDirection === 'desc' ? null : 'asc';
    } else {
      this.sortBy = column;
      this.sortDirection = 'asc';
    }

    if (this.sortDirection) {
      document.data.sort((a, b) =>
        this.sortDirection === 'asc' ? (a[column] > b[column] ? 1 : -1) : (a[column] < b[column] ? 1 : -1)
      );
    }
  }

  // Add a new bill (you can extend this logic as needed)
  addNewBill() {
    const document = this.document();
    if (!document || !document.data) return;

    const newBill = {
      bill: 'New Bill',
      dueDate: '',
      autoPay: false,
      due: '',
      balance: '',
      website: '',
      lastPaymentDate: '',
      disabled: false,
    };

    document.data.push(newBill);
  }

  // Disable a bill
  disableBill(bill: any) {
    const document = this.document();
    if (!document) return;
    bill.disabled = true;
  }

  // Enable a bill
  enableBill(bill: any) {
    const document = this.document();
    if (!document) return;
    bill.disabled = false;
  }

  // Open the delete document modal
  openDeleteDocumentModal() {
    this.showDeleteDocumentModal.set(true);
  }

  // Close the delete document modal
  closeDeleteDocumentModal() {
    this.showDeleteDocumentModal.set(false);
  }

  // Open the share document modal
  openShareModal() {
    this.showShareModal.set(true);
  }

  // Close the share document modal
  closeShareModal() {
    this.showShareModal.set(false);
  }

  // Share or manage document access
  async shareDocument() {
    // if (!this.shareEmail || !this.expenseId) return;

    // const docRef = doc(this.firestore, `expenses/${this.expenseId}`);
    // if (this.newUserRole === 'editor') {
    //   await updateDoc(docRef, {
    //     'acl.editors': arrayUnion(this.shareEmail),
    //   });
    // } else {
    //   await updateDoc(docRef, {
    //     'acl.viewers': arrayUnion(this.shareEmail),
    //   });
    // }
  }

  // Delete document
  async deleteDocument() {
  }

  // Confirm delete action for bills
  confirmDelete(bill: any) {
    this.actionBill = bill;
  }

  confirmAction() {
    const document = this.document();
    if (this.actionBill && document) {
      document.data = document.data?.filter((b) => b !== this.actionBill);
      this.actionBill = null;
    }
  }

  handleManageDocumentActions($event: string) {
    if ($event === 'delete') {
      this.openDeleteDocumentModal();
    } else if ($event === 'share') {
      this.openShareModal();
    }
  }

  handleUpdateAcl(acl: { role: string, email: string }, newRole: string ) {
    // const docRef = doc(this.firestore, `expenses/${this.expenseId}`);
    // if ($event.role === 'editor') {
    //   updateDoc(docRef, {
    //     'acl.editors': arrayUnion($event.email),
    //     'acl.viewers': arrayRemove($event.email),
    //   });
    // } else {
    //   updateDoc(docRef, {
    //     'acl.viewers': arrayUnion($event.email),
    //     'acl.editors': arrayRemove($event.email),
    //   });
    // }
    if (newRole === 'remove') {
      this.pendingRemoveAccess.set(acl);
      this.showConfirmRemoveAccessModal.set(true);
    }
  }

  confirmRemoveAccess() {
    const acl = this.pendingRemoveAccess();
    if (acl) {
      // const docRef = doc(this.firestore, `expenses/${this.expenseId}`);
      // if (acl.role === 'editor') {
      //   updateDoc(docRef, {
      //     'acl.editors': arrayRemove(acl.email),
      //   });
      // } else {
      //   updateDoc(docRef, {
      //     'acl.viewers': arrayRemove(acl.email),
      //   });
      // }
      this.showConfirmRemoveAccessModal.set(false);
      this.pendingRemoveAccess.set(null);
    }
  }

  cancelRemoveAccess() {
    this.showConfirmRemoveAccessModal.set(false);
    this.pendingRemoveAccess.set(null);
  }
}
