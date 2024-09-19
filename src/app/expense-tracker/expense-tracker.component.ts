import { Component, computed, inject, signal, Signal, WritableSignal } from '@angular/core';
import { ExpenseModel } from "../models/expense-model";
import { ActivatedRoute, Router } from "@angular/router";
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
  private router: Router = inject(Router);
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

  // Manage Document Dropdown
  getManageDocumentActions() {
    return this.isOwner()
      ? [{ id: 'share', label: 'Share Document' }, { id: 'delete', label: 'Delete Document' }]
      : [{ id: 'share', label: 'Share Document' }];
  }

  handleManageDocumentActions(eventId: string) {
    if (this.isOwner() && eventId === 'delete') {
      this.openDeleteDocumentModal();
    } else if (this.isOwner() || this.isEditor() && eventId === 'share') {
      this.openShareModal();
    }
  }

  // state
  sortBy: string | null = null;
  sortDirection: 'asc' | 'desc' | null = null;
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

  // Confirm delete action for bills
  confirmDeleteBill(bill: any) {
    this.actionBill = bill;
  }

  confirmAction() {
    const document = this.document();
    if (this.actionBill && document) {
      document.data = document.data?.filter((b) => b !== this.actionBill);
      this.actionBill = null;
    }
  }

  // delete document modal
  showDeleteDocumentModal: WritableSignal<boolean> = signal(false);
  deletingDocument: WritableSignal<boolean> = signal(false);

  openDeleteDocumentModal() {
    this.showDeleteDocumentModal.set(true);
  }

  closeDeleteDocumentModal() {
    this.showDeleteDocumentModal.set(false);
  }

  // Delete document
  async deleteDocument() {
    const document = this.document();

    if (!document) {
      return;
    }

    this.deletingDocument.set(true);
    const resp = await this.expenseService.deleteDocument(document);
    this.deletingDocument.set(false);
    
    if (resp.success) {
      this.router.navigate(['/documents']);
    } else {
      window.alert(resp.error);
    }
  }

  // share document modal
  showShareModal: WritableSignal<boolean> = signal(false);
  pendingRemoveAccess: WritableSignal<{ role: string, email: string } | null> = signal(null);
  showConfirmRemoveAccessModal: WritableSignal<boolean> = signal(false);
  shareEmail = new FormControl('', [ Validators.required, Validators.email ]);
  newUserRole: WritableSignal<'viewer' | 'editor' | null> = signal(null);
  private newUserRoleToAclKey = computed(() => {
    const role = this.newUserRole();
    if (role === 'viewer') {
      return 'viewers';
    } else if (role === 'editor') {
      return 'editors';
    }

    return null;
  });
  emailError: WritableSignal<string> = signal('');
  sendingShareRequest: WritableSignal<boolean> = signal(false);
  updatingUserAcl: WritableSignal<{ role: string, email: string } | null> = signal(null);

  openShareModal() {
    this.showShareModal.set(true);
  }

  closeShareModal() {
    this.showShareModal.set(false);
  }

  updateEmailError() {
    this.emailError.set('');

    if (this.shareEmail.hasError('required')) {
      this.emailError.set('* Email is required');
    } else if (this.shareEmail.hasError('email')) {
      this.emailError.set('Email is invalid');
    }
  }

  updateUserRole(event: string) {
    if (event === 'viewer') {
      this.newUserRole.set('viewer');
    } else if (event === 'editor') {
      this.newUserRole.set('editor');
    }
  }

  async shareDocument() {
    const document = this.document();
    const role = this.newUserRoleToAclKey();
    const email = this.shareEmail.value;

    if (this.shareEmail.invalid || !document || !role || !email) {
      return;
    }

    this.sendingShareRequest.set(true);
    const resp = await this.expenseService.addToAcl(document, role, email);
    this.sendingShareRequest.set(false);

    if (resp.success) {
      this.newUserRole.set(null);
      this.shareEmail.reset();
    } else {
      window.alert(resp.error);
    }
  }

  getAclActions(acl: { role: string, email: string }) {
    if (acl.role === 'viewer') {
      return [
        { id: 'editor', label: 'Editor' },
        { id: 'remove', label: 'Remove Access' }
      ];
    } else {
      return [
        { id: 'viewer', label: 'Viewer' },
        { id: 'remove', label: 'Remove Access' }
      ];
    }
  }

  async handleUpdateAcl(eventId: string, acl: { role: string, email: string }) {
    const document = this.document();
    if (!document) return;

    if (eventId === 'remove') {
      this.pendingRemoveAccess.set(acl);
      this.showConfirmRemoveAccessModal.set(true);
      return;
    }

    this.updatingUserAcl.set(acl);
    const resp = await this.expenseService.addToAcl(
      document, 
      eventId === 'viewer' ? 'viewers' : 'editors',
      acl.email
    );
    this.updatingUserAcl.set(null);
    if (!resp.success) {
      window.alert(resp.error);
    }
  }

  async confirmRemoveAccess() {
    const document = this.document();
    const acl = this.pendingRemoveAccess();
    if (acl && document) {
      this.showConfirmRemoveAccessModal.set(false);
      this.updatingUserAcl.set(acl);
      const resp = await this.expenseService.removeFromAcl(document, acl.email);
      this.updatingUserAcl.set(null);
      this.pendingRemoveAccess.set(null);

      if (!resp.success) {
        window.alert(resp.error);
      }
    }
  }

  cancelRemoveAccess() {
    this.showConfirmRemoveAccessModal.set(false);
    this.pendingRemoveAccess.set(null);
  }
}
