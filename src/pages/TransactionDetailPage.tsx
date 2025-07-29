"use client"
import { useState } from "react"
import { useParams, Link } from "react-router-dom"
import { useTransactionById } from "@/hooks/useTransactions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, User, Calendar, Hash, Download, FileText, Receipt } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { id } from "date-fns/locale/id"
import { PrintReceiptDialog } from "@/components/PrintReceiptDialog"

export default function TransactionDetailPage() {
  const { id: transactionId } = useParams<{ id:string }>()
  const { transaction, isLoading } = useTransactionById(transactionId || "")
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [printTemplate, setPrintTemplate] = useState<'receipt' | 'invoice'>('receipt')

  const handlePrintClick = (template: 'receipt' | 'invoice') => {
    setPrintTemplate(template);
    setIsPrintDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Card><CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader><CardContent className="space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-1/3" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader><CardContent><Skeleton className="h-32 w-full" /></CardContent></Card>
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold">Transaksi tidak ditemukan</h2>
        <Button asChild className="mt-4"><Link to="/transactions"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar Transaksi</Link></Button>
      </div>
    )
  }

  const orderDate = transaction.orderDate ? new Date(transaction.orderDate) : null;

  return (
    <>
      <PrintReceiptDialog 
        open={isPrintDialogOpen} 
        onOpenChange={setIsPrintDialogOpen} 
        transaction={transaction}
        template={printTemplate}
      />
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Detail Transaksi</h1>
            <p className="text-muted-foreground">Lihat rincian lengkap untuk pesanan <Badge variant="outline">{transaction.id}</Badge></p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline"><Link to="/transactions"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Link></Button>
            <Button onClick={() => handlePrintClick('invoice')} variant="outline"><FileText className="mr-2 h-4 w-4" /> Cetak Invoice (A4)</Button>
            <Button onClick={() => handlePrintClick('receipt')}><Receipt className="mr-2 h-4 w-4" /> Cetak Nota Thermal</Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader><CardTitle>Item Pesanan</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Produk</TableHead><TableHead>Jumlah</TableHead><TableHead>File Desain</TableHead><TableHead className="text-right">Harga</TableHead><TableHead className="text-right">Subtotal</TableHead></TableRow></TableHeader>
                <TableBody>
                  {transaction.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.product.name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        {item.designFileName ? (
                          <div className="flex items-center gap-2 text-xs">
                            <Download className="h-3 w-3" />
                            {item.designFileName}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Tidak ada file</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(item.price)}</TableCell>
                      <TableCell className="text-right">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(item.price * item.quantity)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Informasi</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /> <span>{transaction.customerName}</span></div>
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /> <span>{orderDate ? format(orderDate, "d MMM yyyy, HH:mm", { locale: id }) : 'N/A'}</span></div>
                <div className="flex items-center gap-2"><Hash className="h-4 w-4 text-muted-foreground" /> <span>Kasir: {transaction.cashierName}</span></div>
                <div className="flex items-center gap-2"><Badge>{transaction.status}</Badge></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}