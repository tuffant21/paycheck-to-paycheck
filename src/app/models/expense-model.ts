import { Timestamp } from "firebase/firestore";

export const ExpenseHeaderTypes = ['text', 'checkbox', 'number', 'date'] as const;
export type ExpenseHeaderType = typeof ExpenseHeaderTypes[number];
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

// Helper function to check if an object matches the expected structure
export function isExpenseJson(json: any): json is { headers: ExpenseHeader[], data: ExpenseData[] } {
  if (
    typeof json !== 'object' || 
    !json.hasOwnProperty('headers') || 
    !json.hasOwnProperty('data') ||
    !json.hasOwnProperty('title')
  ) {
    return false;
  }

  const { headers, data, title } = json;

  // Validate that headers is an array and each item matches ExpenseHeader
  if (!Array.isArray(headers) || !headers.every(isExpenseHeader)) {
    return false;
  }

  // Validate that data is an array and each item matches ExpenseData
  if (!Array.isArray(data) || !data.every(isExpenseData)) {
    return false;
  }

  // Validate that title is a string
  if (typeof title !== 'string') {
    return false;
  }

  return true;
}

// Helper function to validate if an item is a valid ExpenseHeader
function isExpenseHeader(item: any): item is ExpenseHeader {
  return (
    typeof item === 'object' &&
    typeof item.key === 'string' &&
    ['text', 'checkbox', 'number', 'date'].includes(item.type) &&
    typeof item.display === 'string' &&
    (item.sort === undefined || ['asc', 'desc'].includes(item.sort))
  );
}

// Helper function to validate if an item is a valid ExpenseData
function isExpenseData(item: any): item is ExpenseData {
  return (
    typeof item === 'object' &&
    typeof item.__id === 'string' &&
    typeof item.__disabled === 'boolean'
  );
}