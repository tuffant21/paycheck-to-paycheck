export type PUBLIC_KEY = 'public';
export type HeaderType = 'text' | 'boolean' | 'currency' | 'date';

export type ExpenseModel = {
  id: string;
  created: string;
  modified: string;
  createdBy: string;
  headers?: [
    { key: string, type: HeaderType , display: string }
  ];
  data?: {
    [key: string]: any;
  }[];
  acl: {
    // 'user': 'role'
    [key: string | PUBLIC_KEY]: string;
  };
}
