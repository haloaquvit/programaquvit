"use client"
import { useParams, Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useAccounts } from "@/hooks/useAccounts"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/hooks/useAuth"
import { ArrowLeft } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useState, useEffect } from "react"

export default function AccountDetailPage() {
  const { id: accountId } = useParams<{ id: string }>()
  const { accounts, isLoading, updateAccount } = useAccounts()
  const { toast } = useToast()
  const { user } = useAuth()
  
  const account = accounts?.find(a => a.id === accountId)
  const isAdminOrOwner = user?.role === 'admin' || user?.role === 'owner'

  const [initialBalance, setInitialBalance] = useState(account?.balance || 0)
  const [isPaymentAccount, setIsPaymentAccount] = useState(account?.isPaymentAccount || false)

  useEffect(() => {
    if (account) {
      setInitialBalance(account.balance)
      setIsPaymentAccount(account.isPaymentAccount)
    }
  }, [account])

  const handleUpdateInitialBalance = () => {
    if (!accountId) return;
    updateAccount.mutate({
      accountId: accountId,
      newData: { balance: initialBalance }
    }, {
      onSuccess: () => {
        toast({ title: "Sukses", description: "Saldo awal berhasil diupdate." })
      },
      onError: (error) => {
        toast({ variant: "destructive", title: "Gagal", description: error.message })
      }
    })
  }

  const handlePaymentAccountChange = (checked: boolean) => {
    if (!accountId) return;
    setIsPaymentAccount(checked);
    updateAccount.mutate({
      accountId: accountId,
      newData: { isPaymentAccount: checked }
    }, {
      onSuccess: () => {
        toast({ title: "Sukses", description: "Status akun pembayaran berhasil diupdate." })
      },
      onError: (error) => {
        toast({ variant: "destructive", title: "Gagal", description: error.message })
      }
    })
  }

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  if (!account) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold">Akun tidak ditemukan</h2>
        <Button asChild className="mt-4">
          <Link to="/accounts"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar Akun</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Detail Akun: {account.name}</h1>
        <Button asChild variant="outline">
          <Link to="/accounts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Daftar Akun
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Akun</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Tipe Akun</p>
              <p className="text-lg font-medium">{account.type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saldo Saat Ini</p>
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat("id-ID", { 
                  style: "currency", 
                  currency: "IDR" 
                }).format(account.balance)}
              </p>
            </div>
          </div>

          {isAdminOrOwner && (
            <>
              <div className="pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isPaymentAccount"
                    checked={isPaymentAccount}
                    onCheckedChange={handlePaymentAccountChange}
                  />
                  <Label htmlFor="isPaymentAccount" className="text-base">
                    Jadikan Akun Pembayaran
                  </Label>
                </div>
                <CardDescription className="mt-1 ml-6">
                  Aktifkan jika akun ini bisa digunakan untuk menerima pembayaran di kasir (POS).
                </CardDescription>
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-2">Update Saldo Awal</h3>
                <CardDescription className="mb-2">
                  Gunakan ini hanya untuk koreksi atau penyesuaian saldo. Transaksi normal harus dicatat melalui menu Pengeluaran atau Kasir.
                </CardDescription>
                <div className="flex gap-2 items-center max-w-sm">
                  <Label htmlFor="initialBalance" className="sr-only">Saldo Awal</Label>
                  <Input 
                    id="initialBalance"
                    type="number" 
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(Number(e.target.value))}
                  />
                  <Button onClick={handleUpdateInitialBalance} disabled={updateAccount.isPending}>
                    {updateAccount.isPending ? "Menyimpan..." : "Simpan Saldo"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}