"use client"
import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { useTransactions } from "@/hooks/useTransactions"
import { useExpenses } from "@/hooks/useExpenses"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker"
import { addDays, startOfMonth, endOfMonth, format } from "date-fns"
import { id } from "date-fns/locale/id"
import { Download, TrendingUp, TrendingDown, Wallet, Scale, HandCoins } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { useAccounts } from "@/hooks/useAccounts"
import { useEmployeeAdvances } from "@/hooks/useEmployeeAdvances"
import { useCompanySettings } from "@/hooks/useCompanySettings"

export function FinancialReport() {
  const { transactions } = useTransactions()
  const { expenses } = useExpenses()
  const { advances } = useEmployeeAdvances()
  const { accounts } = useAccounts()
  const { settings: companyInfo } = useCompanySettings();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  })

  const filteredData = useMemo(() => {
    if (!transactions || !expenses) return { income: [], expense: [] }
    const from = dateRange?.from
    const to = dateRange?.to
    const filteredIncome = transactions.filter(t => {
      const transactionDate = new Date(t.orderDate)
      if (from && to) return transactionDate >= from && transactionDate <= to
      return true
    })
    const filteredExpense = expenses.filter(e => {
      const expenseDate = new Date(e.date)
      if (from && to) return expenseDate >= from && expenseDate <= to
      return true
    })
    return { income: filteredIncome, expense: filteredExpense }
  }, [transactions, expenses, dateRange])

  const summary = useMemo(() => {
    const totalIncome = filteredData.income.reduce((sum, t) => sum + t.total, 0)
    const totalExpense = filteredData.expense.reduce((sum, e) => sum + e.amount, 0)
    const netProfit = totalIncome - totalExpense
    return { totalIncome, totalExpense, netProfit }
  }, [filteredData])

  const accountBalancesAtDate = useMemo(() => {
    if (!accounts || !transactions || !expenses || !advances || !dateRange?.to) {
      return [];
    }

    const endDate = dateRange.to;

    return accounts.map(account => {
      let balanceAtDate = account.balance;

      const incomeAfterPeriod = transactions
        .filter(t => new Date(t.orderDate) > endDate && t.paymentAccountId === account.id)
        .reduce((sum, t) => sum + t.paidAmount, 0);
      
      balanceAtDate -= incomeAfterPeriod;

      const expensesAfterPeriod = expenses
        .filter(e => new Date(e.date) > endDate && e.accountId === account.id)
        .reduce((sum, e) => sum + e.amount, 0);

      balanceAtDate += expensesAfterPeriod;

      const advancesAfterPeriod = advances
        .filter(a => new Date(a.date) > endDate && a.accountId === account.id)
        .reduce((sum, a) => sum + a.amount, 0);
      
      balanceAtDate += advancesAfterPeriod;

      return {
        ...account,
        balanceAtDate: balanceAtDate,
      };
    });
  }, [accounts, transactions, expenses, advances, dateRange?.to]);

  const kasKecilReport = useMemo(() => {
    const kasKecilAccount = accounts?.find(a => a.name.toLowerCase() === 'kas kecil');
    if (!kasKecilAccount || !transactions || !expenses || !advances) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = addDays(today, 1);

    const isToday = (date: Date) => new Date(date) >= today && new Date(date) < tomorrow;

    const incomeToKasKecil = transactions.filter(t => t.paymentAccountId === kasKecilAccount.id && isToday(t.orderDate)).reduce((sum, t) => sum + t.total, 0);
    const expenseFromKasKecil = expenses.filter(e => e.accountId === kasKecilAccount.id && isToday(e.date)).reduce((sum, e) => sum + e.amount, 0);
    const advancesFromKasKecil = advances.filter(a => a.accountId === kasKecilAccount.id && isToday(a.date)).reduce((sum, a) => sum + a.amount, 0);
    
    const totalDailyIncome = incomeToKasKecil;
    const totalDailyExpense = expenseFromKasKecil + advancesFromKasKecil;

    const openingBalance = kasKecilAccount.balance - totalDailyIncome + totalDailyExpense;
    const closingBalance = openingBalance + totalDailyIncome - totalDailyExpense;

    return { openingBalance, incomeToKasKecil, expenseFromKasKecil, advancesFromKasKecil, closingBalance };
  }, [accounts, transactions, expenses, advances]);

  const generatePdf = () => {
    const doc = new jsPDF()
    const fromDate = dateRange?.from ? format(dateRange.from, "d MMM yyyy", { locale: id }) : 'N/A'
    const toDate = dateRange?.to ? format(dateRange.to, "d MMM yyyy", { locale: id }) : 'N/A'
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;

    if (companyInfo?.logo) {
      try { doc.addImage(companyInfo.logo, 'PNG', margin, 12, 30, 12); } catch (e) { console.error(e); }
    }
    doc.setFontSize(16).setFont("helvetica", "bold").text("Laporan Keuangan", pageWidth - margin, 25, { align: 'right' });
    doc.setFontSize(9).setFont("helvetica", "normal").text(companyInfo?.name || '', margin, 30).text(companyInfo?.address || '', margin, 35);
    doc.setFontSize(9).setFont("helvetica", "normal").text(`Periode: ${fromDate} - ${toDate}`, pageWidth - margin, 32, { align: 'right' });
    doc.setDrawColor(200).line(margin, 45, pageWidth - margin, 45);

    doc.setFontSize(12).setFont("helvetica", "bold").text("Ringkasan Keuangan", margin, 55);
    autoTable(doc, {
      startY: 60,
      head: [['Deskripsi', 'Jumlah']],
      body: [
        ['Total Pendapatan', new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(summary.totalIncome)],
        ['Total Pengeluaran', new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(summary.totalExpense)],
        ['Laba Bersih', new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(summary.netProfit)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [240, 240, 240], textColor: [50, 50, 50], fontStyle: 'bold' }
    });

    doc.setFontSize(12).setFont("helvetica", "bold").text("Ringkasan Saldo Akun", margin, (doc as any).lastAutoTable.finalY + 15);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Nama Akun', `Saldo per ${toDate}`]],
      body: accountBalancesAtDate.map(acc => [
        acc.name,
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(acc.balanceAtDate)
      ]),
      theme: 'striped',
      headStyles: { fillColor: [240, 240, 240], textColor: [50, 50, 50], fontStyle: 'bold' }
    });

    doc.setFontSize(12).setFont("helvetica", "bold").text("Rincian Pendapatan", margin, (doc as any).lastAutoTable.finalY + 15);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Tanggal', 'No. Order', 'Pelanggan', 'Total']],
      body: filteredData.income.map(t => [format(new Date(t.orderDate), "d MMM yyyy", { locale: id }), t.id, t.customerName, new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(t.total)]),
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: [50, 50, 50], fontStyle: 'bold' },
      didDrawPage: (data) => { doc.setFontSize(8).setTextColor(150).text(`Halaman ${data.pageNumber}`, pageWidth / 2, pageHeight - 10, { align: 'center' }); }
    });

    doc.setFontSize(12).setFont("helvetica", "bold").text("Rincian Pengeluaran", margin, (doc as any).lastAutoTable.finalY + 15);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Tanggal', 'Deskripsi', 'Kategori', 'Jumlah']],
      body: filteredData.expense.map(e => [format(new Date(e.date), "d MMM yyyy", { locale: id }), e.description, e.category, new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(e.amount)]),
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: [50, 50, 50], fontStyle: 'bold' },
    });

    doc.save(`laporan-keuangan-${format(new Date(), "yyyy-MM-dd")}.pdf`)
  }

  const generateKasKecilPdf = () => {
    if (!kasKecilReport) return;

    const doc = new jsPDF();
    const today = format(new Date(), "d MMMM yyyy", { locale: id });
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;

    if (companyInfo?.logo) {
      try { doc.addImage(companyInfo.logo, 'PNG', margin, 12, 30, 12); } catch (e) { console.error(e); }
    }
    doc.setFontSize(16).setFont("helvetica", "bold").text("Laporan Kas Kecil Harian", pageWidth - margin, 25, { align: 'right' });
    doc.setFontSize(9).setFont("helvetica", "normal").text(companyInfo?.name || '', margin, 30).text(companyInfo?.address || '', margin, 35);
    doc.setFontSize(9).setFont("helvetica", "normal").text(`Tanggal: ${today}`, pageWidth - margin, 32, { align: 'right' });
    doc.setDrawColor(200).line(margin, 45, pageWidth - margin, 45);

    autoTable(doc, {
      startY: 55,
      head: [['Deskripsi', 'Jumlah']],
      body: [
        ['Saldo Awal', new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(kasKecilReport.openingBalance)],
        ['Pemasukan Hari Ini', new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(kasKecilReport.incomeToKasKecil)],
        ['Pengeluaran Kantor', new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(kasKecilReport.expenseFromKasKecil)],
        ['Panjar Karyawan', new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(kasKecilReport.advancesFromKasKecil)],
        ['Saldo Akhir', new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(kasKecilReport.closingBalance)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [240, 240, 240], textColor: [50, 50, 50], fontStyle: 'bold' },
      bodyStyles: { fontStyle: 'bold' },
      columnStyles: {
        1: { halign: 'right' }
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.row.index === 4) {
          (data.cell.styles as any).fillColor = '#f1f5f9';
        }
      }
    });

    doc.save(`laporan-kas-kecil-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div><CardTitle>Laporan Keuangan</CardTitle><CardDescription>Analisis pendapatan, pengeluaran, dan laba bersih perusahaan.</CardDescription></div>
          <div className="flex items-center gap-2">
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
            <Button onClick={generatePdf}><Download className="mr-2 h-4 w-4" /> Unduh Laporan Keuangan</Button>
            <Button onClick={generateKasKecilPdf} variant="outline" disabled={!kasKecilReport}><Download className="mr-2 h-4 w-4" /> Cetak Kas Kecil</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <a href="#pendapatan-details" className="block">
              <Card className="hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(summary.totalIncome)}</div></CardContent></Card>
            </a>
            <a href="#pengeluaran-details" className="block">
              <Card className="hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle><TrendingDown className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(summary.totalExpense)}</div></CardContent></Card>
            </a>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Laba Bersih</CardTitle><Scale className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(summary.netProfit)}</div></CardContent></Card>
          </div>
        </CardContent>
      </Card>

      {accounts?.find(a => a.name.toLowerCase() === 'kas kecil') ? (
        kasKecilReport && (
          <Card>
            <CardHeader>
              <CardTitle>Laporan Kas Kecil Harian</CardTitle>
              <CardDescription>Ringkasan arus kas untuk akun Kas Kecil pada hari ini, {format(new Date(), "d MMMM yyyy", { locale: id })}.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-5">
              <div className="border p-4 rounded-lg"><p className="text-sm text-muted-foreground">Saldo Awal</p><p className="font-bold">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(kasKecilReport.openingBalance)}</p></div>
              <div className="border p-4 rounded-lg"><p className="text-sm text-muted-foreground">Pemasukan</p><p className="font-bold text-green-600">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(kasKecilReport.incomeToKasKecil)}</p></div>
              <div className="border p-4 rounded-lg"><p className="text-sm text-muted-foreground">Pengeluaran Kantor</p><p className="font-bold text-red-600">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(kasKecilReport.expenseFromKasKecil)}</p></div>
              <div className="border p-4 rounded-lg"><p className="text-sm text-muted-foreground">Panjar Karyawan</p><p className="font-bold text-red-600">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(kasKecilReport.advancesFromKasKecil)}</p></div>
              <div className="border p-4 rounded-lg bg-muted"><p className="text-sm text-muted-foreground">Saldo Akhir</p><p className="font-bold">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(kasKecilReport.closingBalance)}</p></div>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Laporan Kas Kecil Harian</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Untuk melihat laporan kas kecil, silakan buat akun keuangan dengan nama persis "Kas Kecil" di halaman <Link to="/accounts" className="text-primary underline">Akun Keuangan</Link>.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Saldo Akun</CardTitle>
          <CardDescription>
            Estimasi saldo akun pada akhir periode yang dipilih ({dateRange?.to ? format(dateRange.to, "d MMM yyyy", { locale: id }) : ''}).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Akun</TableHead>
                <TableHead className="text-right">Perkiraan Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accountBalancesAtDate.map(acc => (
                <TableRow key={acc.id}>
                  <TableCell>{acc.name}</TableCell>
                  <TableCell className="text-right font-medium">
                    {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(acc.balanceAtDate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card id="pendapatan-details"><CardHeader><CardTitle>Rincian Pendapatan</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Pelanggan</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{filteredData.income.map(t => <TableRow key={t.id}><TableCell>{format(new Date(t.orderDate), "d MMM yyyy")}</TableCell><TableCell>{t.customerName}</TableCell><TableCell className="text-right">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(t.total)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
        <Card id="pengeluaran-details"><CardHeader><CardTitle>Rincian Pengeluaran</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Deskripsi</TableHead><TableHead className="text-right">Jumlah</TableHead></TableRow></TableHeader><TableBody>{filteredData.expense.map(e => <TableRow key={e.id}><TableCell>{format(new Date(e.date), "d MMM yyyy")}</TableCell><TableCell>{e.description}</TableCell><TableCell className="text-right">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(e.amount)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
      </div>
    </div>
  )
}