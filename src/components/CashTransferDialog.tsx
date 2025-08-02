import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useAccounts } from '@/hooks/useAccounts';
import { useCashTransfers } from '@/hooks/useCashTransfers';
import { toast } from 'sonner';

const transferSchema = z.object({
  fromAccountId: z.string().min(1, 'Pilih akun pengirim'),
  toAccountId: z.string().min(1, 'Pilih akun penerima'),
  amount: z.number().min(1, 'Jumlah harus lebih dari 0'),
  description: z.string().optional(),
}).refine((data) => data.fromAccountId !== data.toAccountId, {
  message: 'Akun pengirim dan penerima tidak boleh sama',
  path: ['toAccountId'],
});

type TransferFormData = z.infer<typeof transferSchema>;

interface CashTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CashTransferDialog({ open, onOpenChange }: CashTransferDialogProps) {
  const { accounts } = useAccounts();
  const { transferCash } = useCashTransfers();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      fromAccountId: '',
      toAccountId: '',
      amount: 0,
      description: '',
    },
  });

  const fromAccountId = form.watch('fromAccountId');
  const selectedFromAccount = accounts?.find(acc => acc.id === fromAccountId);

  const onSubmit = async (data: TransferFormData) => {
    setIsLoading(true);
    try {
      await transferCash.mutateAsync(data);
      toast.success('Transfer kas berhasil dilakukan');
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Gagal melakukan transfer kas');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Transfer Kas Antar Akun</DialogTitle>
          <DialogDescription>
            Pindahkan dana dari satu akun ke akun lainnya.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fromAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dari Akun</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih akun pengirim" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts?.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} - {new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR'
                          }).format(account.balance)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="toAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ke Akun</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih akun penerima" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts?.filter(acc => acc.id !== fromAccountId).map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} - {new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR'
                          }).format(account.balance)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jumlah Transfer</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  {selectedFromAccount && (
                    <p className="text-sm text-muted-foreground">
                      Saldo tersedia: {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR'
                      }).format(selectedFromAccount.balance)}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Keterangan (Opsional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Masukkan keterangan transfer..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Memproses...' : 'Transfer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}