"use client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "./ui/use-toast"
import { Transaction } from "@/types/transaction"
import { useTransactions } from "@/hooks/useTransactions"
import { useAccounts } from "@/hooks/useAccounts"
import { Wallet } from "lucide-react"

const paymentSchema = z.object({
  amount: z.coerce.number().min(1, "Jumlah pembayaran harus lebih dari 0."),
  paymentAccountId: z.string().min(1, "Akun pembayaran harus dipilih."),
})

type PaymentFormData = z.infer<typeof paymentSchema>

interface PayReceivableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: Transaction | null
}

export function PayReceivableDialog({ open, onOpenChange, transaction }: PayReceivableDialogProps) {
  const { toast } = useToast()
  const { payReceivable } = useTransactions()
  const { accounts, updateAccountBalance } = useAccounts()
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
  })

  const remainingAmount = transaction ? transaction.total - transaction.paidAmount : 0

  const onSubmit = (data: PaymentFormData) => {
    if (!transaction) return;
    if (data.amount > remainingAmount) {
      toast({ variant: "destructive", title: "Gagal", description: "Jumlah pembayaran melebihi sisa tagihan." });
      return;
    }

    // Mutasi untuk membayar piutang (sudah termasuk update account balance)
    payReceivable.mutate({ 
      transactionId: transaction.id, 
      amount: data.amount, 
      accountId: data.paymentAccountId 
    }, {
      onSuccess: () => {
        toast({ title: "Sukses", description: "Pembayaran piutang berhasil dicatat." })
        reset()
        onOpenChange(false)
      },
      onError: (error) => {
        toast({ variant: "destructive", title: "Gagal", description: error.message })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bayar Piutang: {transaction?.customerName}</DialogTitle>
          <DialogDescription>
            No. Order: {transaction?.id}. Sisa tagihan: <strong className="text-destructive">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(remainingAmount)}</strong>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="amount">Jumlah Pembayaran</Label>
              <Input id="amount" type="number" {...register("amount")} />
              {errors.amount && <p className="text-sm text-destructive mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <Label htmlFor="paymentAccountId">Setor Ke Akun</Label>
              <Select onValueChange={(value) => setValue("paymentAccountId", value)}>
                <SelectTrigger><SelectValue placeholder="Pilih Akun..." /></SelectTrigger>
                <SelectContent>
                  {accounts?.filter(a => a.isPaymentAccount).map(acc => (
                    <SelectItem key={acc.id} value={acc.id}><Wallet className="inline-block mr-2 h-4 w-4" />{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.paymentAccountId && <p className="text-sm text-destructive mt-1">{errors.paymentAccountId.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={payReceivable.isPending}>
              {payReceivable.isPending ? "Menyimpan..." : "Simpan Pembayaran"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}