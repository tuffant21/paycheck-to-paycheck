import { DecimalPipe, KeyValuePipe, TitleCasePipe } from "@angular/common";
import { Component, computed, inject, signal, Signal, WritableSignal } from '@angular/core';
import { toSignal } from "@angular/core/rxjs-interop";
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { User } from "firebase/auth";
import { ButtonComponent } from "../button/button.component";
import { DropdownComponent } from "../dropdown/dropdown.component";
import { ModalComponent } from "../modal/modal.component";
import { ExpenseData, ExpenseModel } from "../models/expense-model";
import { ExpenseService } from "../services/expense.service";
import { getUser$ } from "../services/user.service";
import { InputComponent } from "./input/input.component";

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
    ButtonComponent,
    InputComponent,
    KeyValuePipe
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

  // title
  async saveTitle(title: string) {
    const document = this.document();
    if (!document) return;

    const resp = await this.expenseService.updateDocument({
      ...document,
      title
    });

    if (!resp.success) {
      window.alert(resp.error);
    }
  }

  // table state
  sortBy: string | null = null;
  sortDirection: 'asc' | 'desc' | null = null;
  addingNewBill: WritableSignal<boolean> = signal(false);

  async saveCell() {
  }

  sortTable(column: string | undefined) {
    if (!column) return;

    const document = this.document();
    if (!document) return;

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

  async addNewBill() {
    const document = this.document();
    if (!document) return;

    let newBill = { __disabled: false };

    for(const header of document.headers) {
      newBill = { ...newBill, [header.key]: '' }
    }

    this.addingNewBill.set(true);
    const resp = await this.expenseService.updateDocument({
      ...document,
      data: [
        ...document.data,
        newBill
      ]
    });
    this.addingNewBill.set(false);

    if (!resp.success) {
      window.alert(resp.error);
    }
  }

  async disableBill(data: ExpenseData) {
    const document = this.document();
    if (!document) return;

    const otherItems = document.data.filter(d => d !== data);

    const resp = await this.expenseService.updateDocument({
      ...document,
      data: [
        ...otherItems,
        { ...data, __disabled: true }
      ]
    });

    if (!resp.success) {
      window.alert(resp.error);
    }
  }

  async enableBill(data: ExpenseData) {
    const document = this.document();
    if (!document) return;

    const otherItems = document.data.filter(d => d !== data);

    const resp = await this.expenseService.updateDocument({
      ...document,
      data: [
        ...otherItems,
        { ...data, __disabled: false }
      ]
    });

    if (!resp.success) {
      window.alert(resp.error);
    }
  }

  // delete bill modal
  pendingDeleteBill: WritableSignal<ExpenseData | null> = signal(null);
  deletingBill: WritableSignal<boolean> = signal(false);

  openDeleteBillModal(data: ExpenseData) {
    this.pendingDeleteBill.set(data);
  }

  closeDeleteBillModal() {
    this.pendingDeleteBill.set(null);
  }

  getHeaderForBillKey(key: string) {
    return this.document()?.headers.find(h => h.key === key)?.display;
  }

  async confirmDeleteBill() {
    const document = this.document();
    const deleteBill = this.pendingDeleteBill();
    if (!document || !deleteBill) return;

    const otherItems = document.data.filter(d => d !== deleteBill);

    this.deletingBill.set(true);
    const resp = await this.expenseService.updateDocument({
      ...document,
      data: [
        ...otherItems
      ]
    });
    this.deletingBill.set(false);

    if (resp.success) {
      this.closeDeleteBillModal();
    } else {
      window.alert(resp.error);
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
