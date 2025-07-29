import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Account } from '@/types/account'
import { supabase } from '@/integrations/supabase/client'

// Helper to map from DB (snake_case) to App (camelCase)
const fromDbToApp = (dbAccount: any): Account => ({
  id: dbAccount.id,
  name: dbAccount.name,
  type: dbAccount.type,
  balance: dbAccount.balance,
  isPaymentAccount: dbAccount.is_payment_account,
  createdAt: new Date(dbAccount.created_at),
});

// Helper to map from App (camelCase) to DB (snake_case)
const fromAppToDb = (appAccount: Partial<Omit<Account, 'id' | 'createdAt'>>) => {
  const { isPaymentAccount, ...rest } = appAccount as any;
  const dbData: any = { ...rest };
  if (isPaymentAccount !== undefined) {
    dbData.is_payment_account = isPaymentAccount;
  }
  return dbData;
};

export const useAccounts = () => {
  const queryClient = useQueryClient()

  const { data: accounts, isLoading } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('accounts').select('*');
      if (error) throw new Error(error.message);
      return data ? data.map(fromDbToApp) : [];
    }
  })

  const addAccount = useMutation({
    mutationFn: async (newAccountData: Omit<Account, 'id' | 'createdAt'>): Promise<Account> => {
      const dbData = fromAppToDb(newAccountData);
      const { data, error } = await supabase
        .from('accounts')
        .insert({ ...dbData, id: `acc-${Date.now()}` })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return fromDbToApp(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  const updateAccountBalance = useMutation({
    mutationFn: async ({ accountId, amount }: { accountId: string, amount: number }) => {
      const { data: currentAccount, error: fetchError } = await supabase.from('accounts').select('balance').eq('id', accountId).single();
      if (fetchError) throw fetchError;

      const newBalance = currentAccount.balance + amount;
      const { error: updateError } = await supabase.from('accounts').update({ balance: newBalance }).eq('id', accountId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    }
  })

  const updateAccount = useMutation({
    mutationFn: async ({ accountId, newData }: { accountId: string, newData: Partial<Account> }) => {
      const dbData = fromAppToDb(newData);
      const { data, error } = await supabase.from('accounts').update(dbData).eq('id', accountId).select().single();
      if (error) throw error;
      return fromDbToApp(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    }
  })

  const deleteAccount = useMutation({
    mutationFn: async (accountId: string): Promise<void> => {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', accountId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  return {
    accounts,
    isLoading,
    addAccount,
    updateAccountBalance,
    updateAccount,
    deleteAccount,
  }
}