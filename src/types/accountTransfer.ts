export interface AccountTransfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description: string;
  userId: string;
  userName: string;
  createdAt: Date;
}

export interface CreateAccountTransferData {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description: string;
  userId: string;
  userName: string;
}