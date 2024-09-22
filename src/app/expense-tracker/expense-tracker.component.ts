import { DecimalPipe, KeyValuePipe, TitleCasePipe } from "@angular/common";
import { Component, computed, ElementRef, inject, signal, Signal, ViewChild, WritableSignal } from '@angular/core';
import { toSignal } from "@angular/core/rxjs-interop";
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { User } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import { ButtonComponent } from "../button/button.component";
import { DropdownComponent } from "../dropdown/dropdown.component";
import { ModalComponent } from "../modal/modal.component";
import { ExpenseData, ExpenseHeader, ExpenseHeaderSort, ExpenseModel, isExpenseJson } from "../models/expense-model";
import { ExpenseService } from "../services/expense.service";
import { getUser$ } from "../services/user.service";
import { BillTableComponent } from "./bill-table/bill-table.component";
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
    KeyValuePipe,
    BillTableComponent
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
  public headers: Signal<ExpenseHeader[]> = computed(() => {
    return this.document()?.headers ?? [];
  });
  public enabledBills: Signal<ExpenseData[]> = computed(() => {
    return this.document()?.data.filter(d => !d.__disabled) ?? [];
  });
  public disabledBills: Signal<ExpenseData[]> = computed(() => {
    return this.document()?.data.filter(d => d.__disabled) ?? [];
  });
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
  @ViewChild('fileImportInput') fileImportInput!: ElementRef;

  getManageDocumentActions() {
    const actions = [
      { id: 'share', label: 'Share Document' },
      { id: 'export', label: 'Export Document' },
      { id: 'import', label: 'Import Document' }
    ];

    return this.isOwner()
      ? [...actions, { id: 'delete', label: 'Delete Document' }]
      : actions;
  }

  private exportDocument() {
    const toExport: Partial<ExpenseModel> = {
      headers: this.document()?.headers,
      data: this.document()?.data,
      title: this.document()?.title
    };

    const jsonContent = JSON.stringify(toExport, null, 2);

    // Create a Blob object for the JSON file
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    
    // Create a download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'exported_data.json');
    link.style.visibility = 'hidden';
    
    // Append link to the body and trigger click
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  importDocument(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.[0];
    const document = this.document();
  
    // Early return if file or document is not present
    if (!file || !document) {
      return;
    }
  
    const reader = new FileReader();
  
    reader.onload = async (e: ProgressEvent<FileReader>) => {
      const result = e.target?.result;
  
      // Early return if no result from reader
      if (!result) {
        return window.alert('Sorry, there was an error opening your input file.');
      }
  
      try {
        this.importingFile.set(true);
        const jsonContent = JSON.parse(result as string);
  
        // Validate JSON structure
        if (!isExpenseJson(jsonContent)) {
          return window.alert('Sorry, there was an error opening your input file.');
        }
  
        // Update document with JSON content
        const resp = await this.expenseService.updateDocument({
          ...document,
          ...jsonContent,
        });
  
        // Handle response
        if (!resp.success) {
          return window.alert(resp.error);
        }
      } catch (err) {
        return window.alert('Sorry, there was an error opening your input file.');
      } finally {
        this.importingFile.set(false);
        this.closeImportModal();
      }
  
      // Reset the file input to allow re-triggering the change event later
      inputElement.value = '';
    };
  
    reader.readAsText(file);
  }

  handleManageDocumentActions(eventId: string) {
    if (eventId === 'share') {
      this.openShareModal();
    } else if (eventId === 'export') {
      this.exportDocument()
    } else if (eventId === 'import') {
      this.openImportModal();
    } else if (eventId === 'delete') {
      this.openDeleteDocumentModal();
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
  addingNewBill: WritableSignal<boolean> = signal(false);

  async saveCell({ bill, key, value }: { bill: ExpenseData, key: string, value: any }) {
    const document = this.document();
    if (!document) return;

    const data = document.data.filter(d => d !== bill);

    const resp = await this.expenseService.updateDocument({
      ...document,
      data: [
        ...data,
        { ...bill, [key]: value }
      ]
    });

    if (!resp.success) {
      window.alert(resp.error);
    }
  }

  async sortTable(headerKey: string) {
    const document = this.document();
    if (!document) return;

    // Reset all other headers' sort states to undefined
    const headers = document.headers.map(h => {
      const header = { ...h }

      if (header.key !== headerKey) {
        delete header.sort;
      }

      return header;
    });
  
    // Find the header that corresponds to the clicked column
    const header = headers.find(h => h.key === headerKey);
    if (!header) return;
  
    // Toggle the sort state: 'asc' -> 'desc' -> 'asc'
    if (!header.sort) {
      header.sort = 'asc';
    } else {
      header.sort = header.sort === 'asc' ? 'desc' : 'asc';
    }
    
    const resp = await this.expenseService.updateDocument({
      ...document,
      headers
    });

    if (!resp.success) {
      window.alert(resp.error);
    }
  }

  async addNewBill() {
    const document = this.document();
    if (!document) return;

    let newBill = { __disabled: false, __id: crypto.randomUUID() };

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

  async toggleDisabled(data: ExpenseData) {
    const document = this.document();
    if (!document) return;

    const otherItems = document.data.filter(d => d !== data);

    const resp = await this.expenseService.updateDocument({
      ...document,
      data: [
        ...otherItems,
        { ...data, __disabled: !data.__disabled }
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
    const role = this.newUserRole() === 'viewer' ? 'viewers' : 'editors';
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

  // Import Modal
  showImportModal: WritableSignal<boolean> = signal(false);
  importingFile: WritableSignal<boolean> = signal(false);

  openImportModal() {
    this.showImportModal.set(true);
  }

  importModalConfirmAction() {
    this.fileImportInput.nativeElement.click();
  }

  closeImportModal() {
    this.showImportModal.set(false);
  }
}
