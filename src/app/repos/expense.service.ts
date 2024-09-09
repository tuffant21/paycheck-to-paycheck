import { inject, Injectable, Signal } from '@angular/core';
import { Auth, user, User } from "@angular/fire/auth";
import {
  addDoc,
  collection,
  Firestore,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  startAfter,
  or, and
} from "@angular/fire/firestore";
import { ExpenseModel } from "../models/expense-model";
import { toSignal } from "@angular/core/rxjs-interop";
import { QuerySnapshot } from "@angular/fire/compat/firestore";

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {
  private EXPENSES = 'expenses';
  private auth = inject(Auth);
  private userSignal: Signal<User | null> = toSignal(user(this.auth), { initialValue: null });
  private firestore = inject(Firestore);

  // Create a new document
  async createDocument(): Promise<string | undefined> {
    const uid = this.userSignal()?.uid;

    if (!uid) {
      return;
    }

    const defaultDocument = {
      created: new Date(),
      createdBy: uid,
      modified: new Date(),
      headers: {
        bill: 'Bill',
        dueDate: 'Due Date',
        autoPay: 'Auto Pay',
        due: 'Due',
        balance: 'Balance',
        website: 'Website',
        lastPaymentDate: 'Last Payment Date',
        disabled: 'Disabled'
      },
      data: [
        {
          bill: 'Donate to paycheck-to-paycheck',
          dueDate: '1st day of month',
          autoPay: true,
          due: '1.00',
          website: 'paycheck-to-paycheck.com',
          disabled: false
        }
      ]
    };

    const expenseCollectionRef = collection(this.firestore, this.EXPENSES);
    const doc = await addDoc(expenseCollectionRef, defaultDocument);
    return doc.id;
  }

  // Get paginated documents (20 per page)
  async getDocuments(page: number, filter: 'all' | 'owned' | 'shared', sortBy: 'created' | 'modified'): Promise<QuerySnapshot<ExpenseModel>> {
    const uid = this.userSignal()?.uid;

    if (!uid) {
      throw new Error('User not authenticated');
    }

    const expenseCollectionRef = collection(this.firestore, this.EXPENSES);
    const q = query(
      expenseCollectionRef,
      and(
        filter === 'owned' ?
          where('createdBy', '==', uid) :
          filter === 'shared' ?
            where(uid, 'in', 'acl') :
            or(
              where('createdBy', '==', this.userSignal()?.uid),
              where(uid, 'in', 'acl')
            )
      ),
      orderBy(sortBy),
      limit(20),
      startAfter(page * 20)
    );

    return getDocs(q);
  }
}
