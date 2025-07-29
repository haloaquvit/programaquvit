import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Expense } from '@/types/expense'
import { supabase } from '@/integrations/supabase/client'
import { useAccounts } from './useAccounts'

// Helper to map from DB (snake_case) to App (camelCase)
const fromDbToApp = (dbExpense: any): Expense => ({
  id: dbExpense.id,
  description: dbExpense.description,
  amount: dbExpense.amount,
  accountId: dbExpense.account_id,
  accountName: dbExpense.account_name,
  date: new Date(dbExpense.date),
  category: dbExpense.category,
  createdAt: new Date(dbExpense.created_at),
});

// Helper to map from App (camelCase) to DB (snake_case)
const fromAppToDb = (appExpense: Partial<Omit<Expense, 'id' | 'createdAt'>>) => {
  const { accountId, accountName, ...rest } = appExpense;
  const dbData: any = { ...rest };
  if (accountId !== undefined) dbData.account_id = accountId;
  if (accountName !== undefined) dbData.account_name = accountName;
  return dbData;
};

export const useExpenses = () => {
  const queryClient = useQueryClient();
  const { updateAccountBalance } = useAccounts();

  const { data: expenses, isLoading } = useQuery<Expense[]>({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
      if (error) throw new Error(error.message);
      return data ? data.map(fromDbToApp) : [];
    }
  });

  const addExpense = useMutation({
    mutationFn: async (newExpenseData: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> => {
      const dbData = fromAppToDb(newExpenseData);
      const { data, error } = await supabase
        .from('expenses')
        .insert({ ...dbData, id: `exp-${Date.now()}` })
        .select()
        .single();
      if (error) throw new Error(error.message);
      
      // Kurangi saldo akun yang digunakan
      updateAccountBalance.mutate({ accountId: newExpenseData.accountId, amount: -newExpenseData.amount });
      return fromDbToApp(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (expenseId: string): Promise<Expense> => {
      const { data: deletedExpense, error: deleteError } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)
        .select()
        .single();
      
      if (deleteError) throw new Error(deleteError.message);
      if (!deletedExpense) throw new Error("Pengeluaran tidak ditemukan");
      
      const appExpense = fromDbToApp(deletedExpense);
      // Kembalikan saldo ke akun yang digunakan
      updateAccountBalance.mutate({ accountId: appExpense.accountId, amount: appExpense.amount });
      
      return appExpense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  return {
    expenses,
    isLoading,
    addExpense,
    deleteExpense,
  }
}