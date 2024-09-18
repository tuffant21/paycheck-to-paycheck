import { inject, Injectable } from '@angular/core';
import { ExpenseModel } from "../models/expense-model";
import { Observable } from "rxjs";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  FieldValue,
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
  where
} from 'firebase/firestore';
import { FIREBASE_FIRESTORE } from "../providers/firebase-firestore.provider";
import { getUser$ } from "./user.service";
import { toSignal } from "@angular/core/rxjs-interop";

@Injectable({
  providedIn: 'root',
})
export class ExpenseService {
  private EXPENSES = 'expenses';
  private firestore = inject(FIREBASE_FIRESTORE);
  private user = toSignal(getUser$());

  // Create a new document
  async createDocument(): Promise<string> {
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
        { key: 'bill', type: 'text', display: 'Bill' },
        { key: 'dueDate', type: 'text', display: 'Due Date' },
        { key: 'autoPay', type: 'boolean', display: 'Auto Pay' },
        { key: 'due', type: 'currency', display: 'Due' },
        { key: 'balance', type: 'currency', display: 'Balance' },
        { key: 'website', type: 'text', display: 'Website' },
        { key: 'lastPaymentDate', type: 'date', display: 'Last Payment Date' },
      ],
      data: [
        {
          bill: 'Donate to paycheck-to-paycheck',
          dueDate: '1st day of month',
          autoPay: true,
          due: '1.00',
          website: 'paycheck-to-paycheck.com',
          __disabled: false
        }
      ],
      acl: {
        editors: [],
        viewers: []
      }
    };

    await setDoc(docRef, defaultDocument);
    return id;
  }

  getDocument$(id: string): Observable<ExpenseModel | undefined> {
    return new Observable(observer => {
      const expenseCollectionRef = collection(this.firestore, this.EXPENSES);
      const unsubscribe = onSnapshot(doc(expenseCollectionRef, id), (doc) => {
        observer.next(doc.data() as ExpenseModel);
      });

      return () => {
        unsubscribe();
      };
    });
  }

  // Get paginated documents (10 per page)
  async getDocuments(startPosition: QueryNonFilterConstraint | null, filter: 'all' | 'owned' | 'shared', sortBy: 'created' | 'modified', direction: OrderByDirection): Promise<QuerySnapshot> {
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

    return getDocs(q);
  }

  async addToAcl(document: ExpenseModel, aclKey: 'editors' | 'viewers', email: string): Promise<{ success: boolean, error?: string }> {
    const expenseCollectionRef = collection(this.firestore, this.EXPENSES);
    const docRef = doc(expenseCollectionRef, document.id);
    let update;

    // do nothing if user is already in acl
    if (document.acl[aclKey].includes(email)) {
      return { success: true };
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

      return { success: true };
    } catch (err) {
      console.warn(err);
      return { success: false, error: 'Apologies! There was an error updating your document. Please try again later.' }
    }
  }

  async removeFromAcl(document: ExpenseModel, aclKey: 'editors' | 'viewers', email: string): Promise<{ success: boolean, error?: string }> {
    const expenseCollectionRef = collection(this.firestore, this.EXPENSES);
    const docRef = doc(expenseCollectionRef, document.id);

    try {
      await setDoc(docRef, {
        acl: {
          [aclKey]: arrayRemove(email)
        },
        modified: new Date()
      }, {merge: true});

      return { success: true };
    } catch (err) {
      console.warn(err);
      return { success: false, error: 'Apologies! There was an error updating your document. Please try again later.' }
    }
  }
}
