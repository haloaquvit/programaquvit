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
import { useEmployeeAdvances } from '@/hooks/useEmployeeAdvances';
import { useEmployees } from '@/hooks/useEmployees';
import { useAuthContext } from '@/contexts/AuthContext';
import { Employee } from '@/types/employee';
import { toast } from 'sonner';

const advanceSchema = z.object({
  employeeId: z.string().min(1, 'Pilih karyawan'),
  amount: z.number().min(1, 'Jumlah harus lebih dari 0'),
  accountId: z.string().min(1, 'Pilih akun sumber dana'),
  notes: z.string().optional(),
});

type AdvanceFormData = z.infer<typeof advanceSchema>;

interface AddAdvanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedEmployee?: Employee | null;
}

export function AddAdvanceDialog({ open, onOpenChange, preSelectedEmployee }: AddAdvanceDialogProps) {
  const { accounts } = useAccounts();
  const { employees } = useEmployees();
  const { addAdvance } = useEmployeeAdvances();
  const { user } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AdvanceFormData>({
    resolver: zodResolver(advanceSchema),
    defaultValues: {
      employeeId: preSelectedEmployee?.id || '',
      amount: 0,
      accountId: '',
      notes: '',
    },
  });

  const selectedAccountId = form.watch('accountId');
  const selectedAccount = accounts?.find(acc => acc.id === selectedAccountId);

  const onSubmit = async (data: AdvanceFormData) => {
    setIsLoading(true);
    try {
      const selectedEmployee = employees?.find(emp => emp.id === data.employeeId);
      const selectedAccount = accounts?.find(acc => acc.id === data.accountId);
      
      if (!selectedEmployee || !selectedAccount) {
        toast.error('Data karyawan atau akun tidak ditemukan');
        return;
      }

      await addAdvance.mutateAsync({
        employeeId: data.employeeId,
        employeeName: selectedEmployee.name,
        amount: data.amount,
        date: new Date(),
        notes: data.notes,
        accountId: data.accountId,
        accountName: selectedAccount.name,
      });

      toast.success('Panjar karyawan berhasil ditambahkan');
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Gagal menambahkan panjar karyawan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Tambah Panjar Karyawan</DialogTitle>
          <DialogDescription>
            Berikan panjar kepada karyawan untuk keperluan operasional.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!preSelectedEmployee && (
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Karyawan</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih karyawan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees?.filter(emp => emp.status === 'Aktif').map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name} - {employee.role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {preSelectedEmployee && (
              <div className="space-y-2">
                <FormLabel>Karyawan</FormLabel>
                <div className="p-3 bg-muted rounded-md">
                  <p className="font-medium">{preSelectedEmployee.name}</p>
                  <p className="text-sm text-muted-foreground">{preSelectedEmployee.role}</p>
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Akun Sumber Dana</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih akun sumber dana" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts?.filter(acc => acc.type === 'Aset').map((account) => (
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
                  <FormLabel>Jumlah Panjar</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  {selectedAccount && (
                    <p className="text-sm text-muted-foreground">
                      Saldo tersedia: {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR'
                      }).format(selectedAccount.balance)}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catatan (Opsional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Masukkan catatan untuk panjar ini..."
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
                {isLoading ? 'Memproses...' : 'Tambah Panjar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}