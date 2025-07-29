import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Transaction } from '@/types/transaction'
import { supabase } from '@/integrations/supabase/client'

// Helper to map from DB (snake_case) to App (camelCase)
const fromDb = (dbTransaction: any): Transaction => ({
  id: dbTransaction.id,
  customerId: dbTransaction.customer_id,
  customerName: dbTransaction.customer_name,
  cashierId: dbTransaction.cashier_id,
  cashierName: dbTransaction.cashier_name,
  designerId: dbTransaction.designer_id,
  operatorId: dbTransaction.operator_id,
  paymentAccountId: dbTransaction.payment_account_id,
  orderDate: new Date(dbTransaction.order_date),
  finishDate: dbTransaction.finish_date ? new Date(dbTransaction.finish_date) : null,
  items: dbTransaction.items || [],
  total: dbTransaction.total,
  paidAmount: dbTransaction.paid_amount,
  paymentStatus: dbTransaction.payment_status,
  status: dbTransaction.status,
  createdAt: new Date(dbTransaction.created_at),
});

// Helper to map from App (camelCase) to DB (snake_case)
const toDb = (appTransaction: Partial<Omit<Transaction, 'createdAt'>>) => ({
  id: appTransaction.id,
  customer_id: appTransaction.customerId,
  customer_name: appTransaction.customerName,
  cashier_id: appTransaction.cashierId,
  cashier_name: appTransaction.cashierName,
  designer_id: appTransaction.designerId || null,
  operator_id: appTransaction.operatorId || null,
  payment_account_id: appTransaction.paymentAccountId || null,
  order_date: appTransaction.orderDate,
  finish_date: appTransaction.finishDate || null,
  items: appTransaction.items,
  total: appTransaction.total,
  paid_amount: appTransaction.paidAmount,
  payment_status: appTransaction.paymentStatus,
  status: appTransaction.status,
});

export const useTransactions = () => {
  const queryClient = useQueryClient()

  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data ? data.map(fromDb) : [];
    }
  })

  const addTransaction = useMutation({
    mutationFn: async ({ newTransaction, quotationId }: { newTransaction: Omit<Transaction, 'createdAt'>, quotationId?: string | null }): Promise<Transaction> => {
      const dbData = toDb(newTransaction);
      const { data: savedTransaction, error } = await supabase
        .from('transactions')
        .insert([dbData])
        .select()
        .single();
      if (error) throw new Error(error.message);

      // If it came from a quotation, update the quotation
      if (quotationId) {
        const { error: quotationError } = await supabase
          .from('quotations')
          .update({ transaction_id: savedTransaction.id, status: 'Disetujui' })
          .eq('id', quotationId);
        if (quotationError) console.error("Failed to update quotation:", quotationError.message);
      }

      return fromDb(savedTransaction);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
    }
  })

  const payReceivable = useMutation({
    mutationFn: async ({ transactionId, amount }: { transactionId: string, amount: number }): Promise<void> => {
      const { error } = await supabase.rpc('pay_receivable', {
        p_transaction_id: transactionId,
        p_amount: amount
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
    }
  });

  const updateTransactionStatus = useMutation({
    mutationFn: async ({ transactionId, status }: { transactionId: string, status: string }) => {
      const { error } = await supabase
        .from('transactions')
        .update({ status })
        .eq('id', transactionId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['transactions'], (oldData: Transaction[] | undefined) => {
        return oldData ? oldData.map(t => t.id === variables.transactionId ? { ...t, status: variables.status } : t) : [];
      });
    }
  });

  const deductMaterials = useMutation({
    mutationFn: async (transactionId: string) => {
      const { error } = await supabase.rpc('deduct_materials_for_transaction', {
        p_transaction_id: transactionId,
      });
      if (error) throw new Error(`Gagal mengurangi stok: ${error.message}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });

  return { transactions, isLoading, addTransaction, payReceivable, updateTransactionStatus, deductMaterials }
}

export const useTransactionById = (id: string) => {
  const { data: transaction, isLoading } = useQuery<Transaction | undefined>({
    queryKey: ['transaction', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        console.error(error.message);
        return undefined;
      };
      return fromDb(data);
    },
    enabled: !!id,
  });
  return { transaction, isLoading };
}

export const useTransactionsByCustomer = (customerId: string) => {
    const { data: transactions, isLoading } = useQuery<Transaction[]>({
        queryKey: ['transactions', 'customer', customerId],
        queryFn: async () => {
            const { data, error } = await supabase
              .from('transactions')
              .select('*')
              .eq('customer_id', customerId);
            if (error) throw new Error(error.message);
            return data ? data.map(fromDb) : [];
        },
        enabled: !!customerId,
    });
    return { transactions, isLoading };
}