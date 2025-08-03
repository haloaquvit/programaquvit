"use client"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { useAccounts } from "@/hooks/useAccounts"
import { useAccountTransfers } from "@/hooks/useAccountTransfers"
import { useAuth } from "@/hooks/useAuth"
import { ArrowRightLeft } from "lucide-react"

const transferSchema = z.object({
  fromAccountId: z.string().min(1, "Akun asal harus dipilih."),
  toAccountId: z.string().min(1, "Akun tujuan harus dipilih."),
  amount: z.coerce.number().min(1000, "Jumlah minimal Rp 1.000."),
  description: z.string().min(1, "Keterangan harus diisi."),
}).refine((data) => data.fromAccountId !== data.toAccountId, {
  message: "Akun asal dan tujuan tidak boleh sama.",
  path: ["toAccountId"],
})

type TransferFormData = z.infer<typeof transferSchema>

interface TransferAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TransferAccountDialog({ open, onOpenChange }: TransferAccountDialogProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const { accounts, updateAccountBalance } = useAccounts()
  const { createTransfer } = useAccountTransfers()
  const [isTransferring, setIsTransferring] = useState(false)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      fromAccountId: "",
      toAccountId: "",
      amount: 0,
      description: "",
    }
  })

  const fromAccountId = watch("fromAccountId")
  const toAccountId = watch("toAccountId")
  const amount = watch("amount")

  const fromAccount = accounts?.find(acc => acc.id === fromAccountId)
  const toAccount = accounts?.find(acc => acc.id === toAccountId)

  const onSubmit = async (data: TransferFormData) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User tidak ditemukan. Silakan login ulang."
      })
      return
    }

    try {
      setIsTransferring(true)

      // Validate sufficient balance
      if (fromAccount && fromAccount.balance < data.amount) {
        toast({
          variant: "destructive",
          title: "Saldo Tidak Mencukupi",
          description: `Saldo ${fromAccount.name} hanya ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(fromAccount.balance)}`
        })
        return
      }

      // Perform transfer operations with detailed error handling
      console.log("Starting transfer process...")
      
      // Step 1: Deduct from source account
      console.log("Step 1: Deducting from source account...")
      try {
        await updateAccountBalance.mutateAsync({
          accountId: data.fromAccountId,
          amount: -data.amount // negative to deduct
        })
        console.log("Step 1 completed successfully")
      } catch (error) {
        console.error("Step 1 failed:", error)
        throw new Error(`Gagal mengurangi saldo dari akun ${fromAccount?.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      // Step 2: Add to destination account
      console.log("Step 2: Adding to destination account...")
      try {
        await updateAccountBalance.mutateAsync({
          accountId: data.toAccountId,
          amount: data.amount // positive to add
        })
        console.log("Step 2 completed successfully")
      } catch (error) {
        console.error("Step 2 failed:", error)
        // Try to rollback step 1
        try {
          await updateAccountBalance.mutateAsync({
            accountId: data.fromAccountId,
            amount: data.amount // restore the amount
          })
          console.log("Rollback completed")
        } catch (rollbackError) {
          console.error("Rollback failed:", rollbackError)
        }
        throw new Error(`Gagal menambah saldo ke akun ${toAccount?.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      // Step 3: Record transfer history after successful balance updates
      console.log("Step 3: Recording transfer history...")
      try {
        await createTransfer.mutateAsync({
          fromAccountId: data.fromAccountId,
          toAccountId: data.toAccountId,
          amount: data.amount,
          description: data.description,
          userId: user.id,
          userName: user.name,
        })
        console.log("Step 3 completed successfully")
      } catch (error) {
        console.error("Step 3 failed:", error)
        // Note: We don't rollback balance changes since they were successful
        console.warn("Transfer completed but history recording failed")
      }

      console.log("Transfer process completed successfully")

      toast({
        title: "Transfer Berhasil",
        description: `Transfer ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(data.amount)} dari ${fromAccount?.name} ke ${toAccount?.name} berhasil.`
      })

      // Reset form and close dialog
      reset()
      onOpenChange(false)

    } catch (error) {
      console.error("Transfer error:", error)
      toast({
        variant: "destructive",
        title: "Transfer Gagal",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat transfer."
      })
    } finally {
      setIsTransferring(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!isTransferring) {
      onOpenChange(newOpen)
      if (!newOpen) {
        reset()
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Transfer Antar Akun
          </DialogTitle>
          <DialogDescription>
            Transfer uang dari satu akun ke akun lain. Pastikan saldo mencukupi sebelum melakukan transfer.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromAccountId">Dari Akun</Label>
              <Select 
                onValueChange={(value) => setValue("fromAccountId", value)}
                value={fromAccountId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih akun asal..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts?.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex flex-col">
                        <span>{account.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(account.balance)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.fromAccountId && (
                <p className="text-sm text-destructive">{errors.fromAccountId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="toAccountId">Ke Akun</Label>
              <Select 
                onValueChange={(value) => setValue("toAccountId", value)}
                value={toAccountId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih akun tujuan..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts?.filter(acc => acc.id !== fromAccountId).map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex flex-col">
                        <span>{account.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(account.balance)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.toAccountId && (
                <p className="text-sm text-destructive">{errors.toAccountId.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Jumlah Transfer</Label>
            <Input
              id="amount"
              type="number"
              step="1000"
              min="1000"
              {...register("amount")}
              placeholder="Masukkan jumlah transfer..."
            />
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
            )}
            {fromAccount && amount > 0 && (
              <div className="text-xs text-muted-foreground">
                Saldo tersisa: {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(fromAccount.balance - amount)}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Keterangan</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Tujuan transfer (contoh: Modal kerja, Kas untuk operasional)"
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {fromAccount && toAccount && amount > 0 && (
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm font-medium mb-1">Ringkasan Transfer:</p>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Dari {fromAccount.name}:</span>
                  <span className="text-red-600">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(fromAccount.balance)} → {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(fromAccount.balance - amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ke {toAccount.name}:</span>
                  <span className="text-green-600">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(toAccount.balance)} → {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(toAccount.balance + amount)}</span>
                </div>
                <div className="flex justify-between font-medium pt-1 border-t">
                  <span>Jumlah Transfer:</span>
                  <span className="text-blue-600">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(amount)}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isTransferring}>
              Batal
            </Button>
            <Button type="submit" disabled={isTransferring}>
              {isTransferring ? "Memproses Transfer..." : "Transfer Sekarang"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}