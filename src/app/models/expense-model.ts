import { Timestamp } from "firebase/firestore";

export type HeaderType = 'text' | 'boolean' | 'currency' | 'date';

export type ExpenseModel<DATE_TYPE = Timestamp> = {
  id: string;
  created: DATE_TYPE;
  modified: DATE_TYPE;
  createdBy: string;
  title: string;
  headers: { key: string, type: HeaderType, display: string }[];
  data: {
    [key: string]: any;
    __disabled: boolean;
  }[];
  acl: {
    editors: string[];
    viewers: string[];
  };
}
