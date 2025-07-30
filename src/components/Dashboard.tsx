"use client"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuthContext } from "@/contexts/AuthContext"
import { useTransactions } from "@/hooks/useTransactions"
import { useCustomers } from "@/hooks/useCustomers"
import { useMaterials } from "@/hooks/useMaterials"
import { format, subDays, startOfDay, endOfDay, startOfMonth, isWithinInterval } from "date-fns"
import { id } from "date-fns/locale/id"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ArrowUpRight, Users, PackageWarning, DollarSign } from "lucide-react"

export function Dashboard() {
  const { user } = useAuthContext()
  const { transactions, isLoading: transactionsLoading } = useTransactions()
  const { customers, isLoading: customersLoading } = useCustomers()
  const { materials, isLoading: materialsLoading } = useMaterials()

  const today = new Date()
  const startOfToday = startOfDay(today)
  const endOfToday = endOfDay(today)
  const startOfThisMonth = startOfMonth(today)

  const todayTransactions = transactions?.filter(t => new Date(t.orderDate) >= startOfToday && new Date(t.orderDate) <= endOfToday) || []
  const todayIncome = todayTransactions.reduce((sum, t) => sum + t.total, 0)
  const newCustomersThisMonth = customers?.filter(c => new Date(c.createdAt) >= startOfThisMonth).length || 0
  const criticalStockItems = materials?.filter(m => m.stock <= m.minStock).length || 0

  const last7Days = Array.from({ length: 7 }, (_, i) => subDays(today, i)).reverse()
  const chartData = last7Days.map(date => {
    const dailyTransactions = transactions?.filter(t => isWithinInterval(new Date(t.orderDate), { start: startOfDay(date), end: endOfDay(date) })) || []
    return {
      name: format(date, 'EEE', { locale: id }),
      Pendapatan: dailyTransactions.reduce((sum, t) => sum + t.total, 0),
    }
  })

  const recentTransactions = transactions?.slice(0, 5) || []
  const isLoading = transactionsLoading || customersLoading || materialsLoading

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/4" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4"><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent><Skeleton className="h-64" /></CardContent></Card>
          <Card className="col-span-3"><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-64" /></CardContent></Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Selamat Datang, {user?.name || 'Pengguna'}!</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Pendapatan Hari Ini</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(todayIncome)}</div><p className="text-xs text-muted-foreground">{todayTransactions.length} transaksi</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Pelanggan Baru (Bulan Ini)</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">+{newCustomersThisMonth}</div><p className="text-xs text-muted-foreground">Sejak {format(startOfThisMonth, "d MMM")}</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Stok Kritis</CardTitle><PackageWarning className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{criticalStockItems} item</div><p className="text-xs text-muted-foreground">Perlu segera dipesan ulang</p></CardContent></Card>
        <Card className="bg-primary text-primary-foreground"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Buat Transaksi Baru</CardTitle></CardHeader><CardContent><Link to="/pos"><Button variant="secondary" className="w-full">Buka Kasir (POS) <ArrowUpRight className="ml-2 h-4 w-4" /></Button></Link></CardContent></Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader><CardTitle>Pendapatan 7 Hari Terakhir</CardTitle></CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${new Intl.NumberFormat("id-ID", { notation: "compact", compactDisplay: "short" }).format(value as number)}`} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} cursor={{ fill: 'hsl(var(--muted))' }} />
                <Legend />
                <Bar dataKey="Pendapatan" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader><CardTitle>Transaksi Terbaru</CardTitle><CardDescription>5 transaksi terakhir yang tercatat.</CardDescription></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Pelanggan</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
              <TableBody>
                {recentTransactions.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="font-medium">{t.customerName}</div>
                      <div className="hidden text-sm text-muted-foreground md:inline">{t.id}</div>
                    </TableCell>
                    <TableCell><Badge variant={t.paymentStatus === 'Lunas' ? 'default' : 'destructive'}>{t.paymentStatus}</Badge></TableCell>
                    <TableCell className="text-right">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(t.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}