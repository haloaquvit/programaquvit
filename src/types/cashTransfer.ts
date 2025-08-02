export interface CashTransfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description?: string;
  transferredBy?: string;
  transferredByName?: string;
  transferDate: Date;
  createdAt: Date;
}