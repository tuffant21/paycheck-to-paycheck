import { inject, Injectable } from '@angular/core';
import { toSignal } from "@angular/core/rxjs-interop";
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  or,
  orderBy,
  OrderByDirection,
  query,
  QueryNonFilterConstraint,
  QuerySnapshot,
  setDoc,
  Timestamp,
  where
} from 'firebase/firestore';
import { Observable } from "rxjs";
import { ExpenseData, ExpenseHeader, ExpenseHeaderSort, ExpenseHeaderType, ExpenseModel } from "../models/expense-model";
import { FIREBASE_FIRESTORE } from "../providers/firebase-firestore.provider";
import { RestResult } from './result.type';
import { getUser$ } from "./user.service";

@Injectable({
  providedIn: 'root',
})
export class ExpenseService {
  private EXPENSES = 'expenses';
  private firestore = inject(FIREBASE_FIRESTORE);
  private user = toSignal(getUser$());

  // Observables
  getDocument$(id: string): Observable<ExpenseModel | undefined> {
    return new Observable(observer => {
      const expenseCollectionRef = collection(this.firestore, this.EXPENSES);
      const unsubscribe = onSnapshot(doc(expenseCollectionRef, id), (doc) => {
        observer.next(doc.data() as ExpenseModel);
      }, observer.error);

      return () => {
        unsubscribe();
      };
    });
  }

  // Promises
  async createDocument(): RestResult<ExpenseModel<Date>> {
    const uid = this.user()?.uid;

    if (!uid) {
      throw new Error('User not authenticated');
    }

    const expenseCollectionRef = collection(this.firestore, this.EXPENSES);
    const docRef = doc(expenseCollectionRef);
    const id = docRef.id;
    const date = new Date();

    const defaultDocument: ExpenseModel<Date> = {
      id,
      createdBy: uid,
      created: date,
      modified: date,
      title: 'New Document',
      headers: [
        { key: 'bill', type: 'text', display: 'Bill', sort: 'asc' },
        { key: 'dueDate', type: 'text', display: 'Due Date' },
        { key: 'autoPay', type: 'checkbox', display: 'Auto Pay' },
        { key: 'due', type: 'number', display: 'Due' },
        { key: 'balance', type: 'number', display: 'Balance' },
        { key: 'creditor', type: 'text', display: 'Creditor' },
        { key: 'lastPaymentDate', type: 'date', display: 'Last Payment Date' },
      ],
      data: [
        {
          bill: 'Donate to paycheck-to-paycheck',
          dueDate: '1st day of month',
          autoPay: true,
          due: '1.00',
          creditor: 'paycheck-to-paycheck.com',
          __id: crypto.randomUUID(),
          __disabled: false
        }
      ],
      acl: {
        editors: [],
        viewers: []
      }
    };

    try {
      await setDoc(docRef, defaultDocument);
      return { success: true, data: defaultDocument };
    } catch (err) {
      console.warn(err);
      return { success: false, error: 'There was an issue creating your document. Please try again later.' };
    }
  }

  async getDocuments(startPosition: QueryNonFilterConstraint | null, filter: 'all' | 'owned' | 'shared', sortBy: 'created' | 'modified', direction: OrderByDirection): RestResult<QuerySnapshot> {
    const expenseCollectionRef = collection(this.firestore, this.EXPENSES);
    const uid = this.user()?.uid;
    const email = this.user()?.email

    if (!uid || !email) {
      throw new Error('User not authenticated');
    }

    const whereCreatedByMe = where('createdBy', '==', uid);
    const whereEditorInAcl = where('acl.editors', 'array-contains', email);
    const whereViewerInAcl = where('acl.viewers', 'array-contains', email);

    const whereFilter = filter === 'owned' ?
      or(whereCreatedByMe) :
      filter === 'shared' ?
        or(whereEditorInAcl, whereViewerInAcl) :
        or(whereCreatedByMe, whereEditorInAcl, whereViewerInAcl);

    const q = startPosition ?
      query(expenseCollectionRef, whereFilter, orderBy(sortBy, direction), startPosition, limit(10)) :
      query(expenseCollectionRef, whereFilter, orderBy(sortBy, direction), limit(10));

    try {
      const docs = await getDocs(q);
      return {
        success: true,
        data: docs
      };
    } catch (err) {
      console.warn(err);
      return {
        success: false,
        error: 'There was an issue getting your documents. Please try again later.'
      };
    }
  }
  
  private sortData(header: Required<ExpenseHeader>, data: ExpenseData[]) {
    return data.sort((a, b) => {
      const valueA = a[header.key];
      const valueB = b[header.key];
  
      // Handle different types of data (e.g., strings, numbers, dates)
      if (header.type === 'text') {
        return header.sort === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
      }
  
      if (header.type === 'number') {
        return header.sort === 'asc' ? valueA - valueB : valueB - valueA;
      }

      if (header.type === 'checkbox') {
        return header.sort === 'asc' ? (valueA === valueB ? 0 : valueA ? 1 : -1) : (valueA === valueB ? 0 : valueB ? 1 : -1);
      }
  
      if (header.type === 'date') {
        return header.sort === 'asc'
          ? valueA.toMillis() - valueB.toMillis()
          : valueB.toMillis() - valueA.toMillis();
      }
  
      // If data type is unknown or not comparable, leave it as is
      return 0;
    });
  }

  async updateDocument(document: ExpenseModel): RestResult {
    const expenseCollectionRef = collection(this.firestore, this.EXPENSES);
    const docRef = doc(expenseCollectionRef, document.id);

    const headerWithSort: ExpenseHeader | undefined = document.headers.find(h => h.sort);
    if (!headerWithSort) {
      return { success: false, error: 'Document did not contain a sorted header and could not be saved' };
    }

    const data = this.sortData(headerWithSort as Required<ExpenseHeader>, document.data.map(d => ({ ...d })));

    try {
      await setDoc(docRef, {
        ...document,
        data,
        modified: new Date()
      }, {merge: true});

      return { success: true, data: null };
    } catch (err) {
      console.warn(err);
      return { success: false, error: 'Apologies! There was an error updating your document. Please try again later.' }
    }
  }

  async addToAcl(document: ExpenseModel, aclKey: 'editors' | 'viewers', email: string): RestResult {
    const expenseCollectionRef = collection(this.firestore, this.EXPENSES);
    const docRef = doc(expenseCollectionRef, document.id);
    let update;

    // do nothing if user is already in acl
    if (document.acl[aclKey].includes(email) || this.user()?.email === email) {
      return { success: false, error: 'User already has access to this document' };
    }

    // if in viewers and new role is editors, remove user from viewers
    if (aclKey === 'editors' && document.acl.viewers.includes(email)) {
      update = {
        acl: {
          editors: arrayUnion(email),
          viewers: arrayRemove(email)
        }
      }
    }
    // if in editors and new role is viewers, remove user from editors
    else if (aclKey === 'viewers' && document.acl.editors.includes(email)) {
      update = {
        acl: {
          editors: arrayRemove(email),
          viewers: arrayUnion(email)
        }
      }
    }
    // otherwise add to acl
    else {
      update = {
        acl: {
          [aclKey]: arrayUnion(email)
        }
      }
    }

    try {
      await setDoc(docRef, {
        ...update,
        modified: new Date()
      }, {merge: true});

      return { success: true, data: null };
    } catch (err) {
      console.warn(err);
      return { success: false, error: 'Apologies! There was an error updating your document. Please try again later.' }
    }
  }

  async removeFromAcl(document: ExpenseModel, email: string): RestResult {
    const expenseCollectionRef = collection(this.firestore, this.EXPENSES);
    const docRef = doc(expenseCollectionRef, document.id);

    try {
      await setDoc(docRef, {
        acl: {
          editors: arrayRemove(email),
          viewers: arrayRemove(email)
        },
        modified: new Date()
      }, {merge: true});

      return { success: true, data: null };
    } catch (err) {
      console.warn(err);
      return { success: false, error: 'Apologies! There was an error updating your document. Please try again later.' }
    }
  }

  async deleteDocument(document: ExpenseModel): RestResult {
    const expenseCollectionRef = collection(this.firestore, this.EXPENSES);
    const docRef = doc(expenseCollectionRef, document.id);

    try {
      await deleteDoc(docRef);
      return { success: true, data: null };
    } catch (err) {
      console.warn(err);
      return { success: false, error: 'There was an error trying to delete the docuemnt.' };
    }
  }
}
