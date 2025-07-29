"use client"
import { Link } from "react-router-dom"
import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileWarning, AlertTriangle, ClipboardList, ShoppingCart, ArrowRight } from "lucide-react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip } from "recharts"
import { useTransactions } from "@/hooks/useTransactions"
import { useMaterials } from "@/hooks/useMaterials"
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders"
import { format, startOfMonth } from "date-fns"
import { id } from "date-fns/locale/id"

export function Dashboard() {
  const { transactions } = useTransactions()
  const { materials } = useMaterials()
  const { purchaseOrders } = usePurchaseOrders()

  const summaryCards = useMemo(() => {
    const totalPiutang = transactions?.filter(t => t.paymentStatus === 'Belum Lunas').reduce((sum, t) => sum + (t.total - t.paidAmount), 0) || 0
    const stokKritisCount = materials?.filter(m => m.stock < m.minStock).length || 0
    const poPendingCount = purchaseOrders?.filter(po => po.status === 'Pending').length || 0
    const transaksiPendingCount = transactions?.filter(t => t.status !== 'Pesanan Selesai' && t.status !== 'Dibatalkan').length || 0
    return { totalPiutang, stokKritisCount, poPendingCount, transaksiPendingCount }
  }, [transactions, materials, purchaseOrders])

  const monthlySalesData = useMemo(() => {
    if (!transactions) return []
    const salesByMonth: { [key: string]: number } = {}
    transactions.forEach(t => {
      const month = format(startOfMonth(new Date(t.orderDate)), "MMM yyyy", { locale: id })
      salesByMonth[month] = (salesByMonth[month] || 0) + t.total
    })
    return Object.entries(salesByMonth).map(([name, total]) => ({ name, total })).slice(-6) // Ambil 6 bulan terakhir
  }, [transactions])

  const lowStockMaterials = useMemo(() => {
    return materials?.filter(m => m.stock < m.minStock).slice(0, 5) || []
  }, [materials])

  return (
    <Tabs defaultValue="summary" className="space-y-4">
      <TabsList>
        <TabsTrigger value="summary">Ringkasan</TabsTrigger>
        <TabsTrigger value="sales">Analisis Penjualan</TabsTrigger>
        <TabsTrigger value="inventory">Stok & PO</TabsTrigger>
      </TabsList>

      <TabsContent value="summary" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link to="/receivables">
            <Card className="hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Piutang</CardTitle>
                <FileWarning className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(summaryCards.totalPiutang)}</div>
              </CardContent>
            </Card>
          </Link>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Stok Kritis</CardTitle><AlertTriangle className="h-4 w-4 text-amber-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{summaryCards.stokKritisCount} Item</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">PO Pending</CardTitle><ClipboardList className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{summaryCards.poPendingCount} Permintaan</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Transaksi Berjalan</CardTitle><ShoppingCart className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{summaryCards.transaksiPendingCount}</div></CardContent></Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Transaksi Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Pelanggan</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
              <TableBody>
                {transactions?.slice(0, 5).map(t => (
                  <TableRow key={t.id} className="hover:bg-muted/50">
                    <TableCell><Link to={`/transactions/${t.id}`} className="font-medium hover:underline">{t.customerName}</Link></TableCell>
                    <TableCell><Badge>{t.status}</Badge></TableCell>
                    <TableCell className="text-right">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(t.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="sales" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Grafik Penjualan Bulanan</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={monthlySalesData}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `Rp${Number(value) / 1000000}Jt`} />
                <RechartsTooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="inventory" className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Bahan Stok Kritis</CardTitle>
            <Button asChild variant="outline" size="sm"><Link to="/materials">Lihat Semua <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Bahan</TableHead><TableHead className="text-right">Sisa Stok</TableHead></TableRow></TableHeader>
              <TableBody>
                {lowStockMaterials.map(m => (
                  <TableRow key={m.id}><TableCell>{m.name}</TableCell><TableCell className="text-right"><Badge variant="destructive">{m.stock} {m.unit}</Badge></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Purchase Order Pending</CardTitle>
            <Button asChild variant="outline" size="sm"><Link to="/purchase-orders">Lihat Semua <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Bahan</TableHead><TableHead>Pemohon</TableHead></TableRow></TableHeader>
              <TableBody>
                {purchaseOrders?.filter(po => po.status === 'Pending').slice(0, 5).map(po => (
                  <TableRow key={po.id}><TableCell>{po.materialName}</TableCell><TableCell>{po.requestedBy}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}