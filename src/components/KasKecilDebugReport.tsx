import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTransactions } from '@/hooks/useTransactions';
import { useExpenses } from '@/hooks/useExpenses';
import { useEmployeeAdvances } from '@/hooks/useEmployeeAdvances';
import { useAccounts } from '@/hooks/useAccounts';
import { format } from 'date-fns';
import { id } from 'date-fns/locale/id';

export function KasKecilDebugReport() {
  const { transactions } = useTransactions();
  const { expenses } = useExpenses();
  const { advances } = useEmployeeAdvances();
  const { accounts } = useAccounts();

  const kasKecilData = useMemo(() => {
    const kasKecilAccount = accounts?.find(a => a.name.toLowerCase() === 'kas kecil');
    if (!kasKecilAccount || !transactions || !expenses || !advances) return null;

    // Semua transaksi yang mempengaruhi kas kecil
    const kasKecilTransactions = transactions
      .filter(t => t.paymentAccountId === kasKecilAccount.id)
      .sort((a, b) => new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime());

    const kasKecilExpenses = expenses
      .filter(e => e.accountId === kasKecilAccount.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const kasKecilAdvances = advances
      .filter(a => a.accountId === kasKecilAccount.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Hitung total pemasukan, pengeluaran, dan panjar
    const totalIncome = kasKecilTransactions.reduce((sum, t) => sum + t.paidAmount, 0);
    const totalExpenses = kasKecilExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalAdvances = kasKecilAdvances.reduce((sum, a) => sum + a.amount, 0);

    // Menggabungkan semua aktivitas dan mengurutkannya berdasarkan tanggal
    const allActivities = [
      ...kasKecilTransactions.map(t => ({
        date: t.orderDate,
        type: 'Income',
        description: `Transaksi ${t.id} - ${t.customerName}`,
        amount: t.paidAmount,
        running_balance: 0 // akan dihitung
      })),
      ...kasKecilExpenses.map(e => ({
        date: e.date,
        type: 'Expense',
        description: e.description,
        amount: -e.amount,
        running_balance: 0 // akan dihitung
      })),
      ...kasKecilAdvances.map(a => ({
        date: a.date,
        type: 'Advance',
        description: `Panjar ${a.employeeName}`,
        amount: -a.amount,
        running_balance: 0 // akan dihitung
      }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Hitung running balance dari saldo awal 0 (asumsi awal)
    let runningBalance = 0; // Ini adalah saldo awal kas kecil
    allActivities.forEach(activity => {
      runningBalance += activity.amount;
      activity.running_balance = runningBalance;
    });

    // Saldo akhir yang dihitung vs saldo aktual
    const calculatedBalance = runningBalance;
    const actualBalance = kasKecilAccount.balance;
    const difference = actualBalance - calculatedBalance;

    return {
      account: kasKecilAccount,
      totalIncome,
      totalExpenses,
      totalAdvances,
      allActivities,
      calculatedBalance,
      actualBalance,
      difference,
      transactions: kasKecilTransactions,
      expenses: kasKecilExpenses,
      advances: kasKecilAdvances
    };
  }, [accounts, transactions, expenses, advances]);

  if (!kasKecilData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Debug Kas Kecil</CardTitle>
          <CardDescription>Tidak ada akun Kas Kecil ditemukan atau data belum dimuat</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Debug Report - Kas Kecil</CardTitle>
          <CardDescription>Analisis lengkap semua transaksi yang mempengaruhi akun Kas Kecil</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 border rounded">
              <p className="text-sm text-muted-foreground">Saldo Aktual</p>
              <p className="text-xl font-bold">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(kasKecilData.actualBalance)}
              </p>
            </div>
            <div className="p-4 border rounded">
              <p className="text-sm text-muted-foreground">Saldo Terhitung</p>
              <p className="text-xl font-bold">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(kasKecilData.calculatedBalance)}
              </p>
            </div>
            <div className="p-4 border rounded">
              <p className="text-sm text-muted-foreground">Selisih</p>
              <p className={`text-xl font-bold ${kasKecilData.difference === 0 ? 'text-green-600' : 'text-red-600'}`}>
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(kasKecilData.difference)}
              </p>
            </div>
            <div className="p-4 border rounded">
              <p className="text-sm text-muted-foreground">Total Aktivitas</p>
              <p className="text-xl font-bold">{kasKecilData.allActivities.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded">
              <p className="text-sm text-muted-foreground">Total Pemasukan</p>
              <p className="text-lg font-semibold text-green-600">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(kasKecilData.totalIncome)}
              </p>
              <p className="text-xs text-muted-foreground">{kasKecilData.transactions.length} transaksi</p>
            </div>
            <div className="p-4 border rounded">
              <p className="text-sm text-muted-foreground">Total Pengeluaran</p>
              <p className="text-lg font-semibold text-red-600">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(kasKecilData.totalExpenses)}
              </p>
              <p className="text-xs text-muted-foreground">{kasKecilData.expenses.length} pengeluaran</p>
            </div>
            <div className="p-4 border rounded">
              <p className="text-sm text-muted-foreground">Total Panjar</p>
              <p className="text-lg font-semibold text-orange-600">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(kasKecilData.totalAdvances)}
              </p>
              <p className="text-xs text-muted-foreground">{kasKecilData.advances.length} panjar</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kronologi Semua Aktivitas Kas Kecil</CardTitle>
          <CardDescription>Riwayat lengkap dengan running balance</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead className="text-right">Saldo Berjalan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-muted/50">
                <TableCell>-</TableCell>
                <TableCell><strong>Saldo Awal</strong></TableCell>
                <TableCell>Saldo pembukaan akun</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right font-bold">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(0)}
                </TableCell>
              </TableRow>
              {kasKecilData.allActivities.map((activity, index) => (
                <TableRow key={index} className={activity.type === 'Income' ? 'bg-green-50' : activity.type === 'Expense' ? 'bg-red-50' : 'bg-orange-50'}>
                  <TableCell>
                    {format(new Date(activity.date), 'd MMM yyyy', { locale: id })}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${
                      activity.type === 'Income' ? 'bg-green-100 text-green-800' :
                      activity.type === 'Expense' ? 'bg-red-100 text-red-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {activity.type}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{activity.description}</TableCell>
                  <TableCell className={`text-right font-medium ${activity.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {activity.amount > 0 ? '+' : ''}{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(activity.amount)}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(activity.running_balance)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted font-bold">
                <TableCell>-</TableCell>
                <TableCell><strong>Saldo Akhir (Terhitung)</strong></TableCell>
                <TableCell>Berdasarkan semua aktivitas</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(kasKecilData.calculatedBalance)}
                </TableCell>
              </TableRow>
              <TableRow className="bg-primary/10 font-bold">
                <TableCell>-</TableCell>
                <TableCell><strong>Saldo Aktual (Database)</strong></TableCell>
                <TableCell>Saldo di database</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(kasKecilData.actualBalance)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}