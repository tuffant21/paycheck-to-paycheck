import { FirebaseOptions } from "firebase/app";

export type Environment = {
  firebaseConfig: FirebaseOptions;
  fiveDollarLink: string;
  tenDollarLink: string;
  twentyDollarLink: string;
  fiftyDollarLink: string;
  customAmountLink: string;
}
