export type AccountType = 'Aset' | 'Kewajiban' | 'Modal' | 'Pendapatan' | 'Beban';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  isPaymentAccount: boolean; // Menandai akun yang bisa menerima pembayaran
  createdAt: Date;
}