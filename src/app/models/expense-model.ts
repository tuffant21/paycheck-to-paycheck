import { Timestamp } from "firebase/firestore";

export type ExpenseHeaderType = 'text' | 'checkbox' | 'number' | 'date';
export type ExpenseHeaderSort = 'asc' | 'desc';
export type ExpenseHeader = { 
  key: string,
  type: ExpenseHeaderType,
  display: string,
  sort?: ExpenseHeaderSort
};
export type ExpenseData = {
  [key: string]: any,
  __id: string,
  __disabled: boolean
};

export type ExpenseModel<DATE_TYPE = Timestamp> = {
  id: string;
  created: DATE_TYPE;
  modified: DATE_TYPE;
  createdBy: string;
  title: string;
  headers: ExpenseHeader[];
  data: ExpenseData[];
  acl: {
    editors: string[];
    viewers: string[];
  };
}
