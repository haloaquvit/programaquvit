import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AccountTransfer, CreateAccountTransferData } from '@/types/accountTransfer'
import { supabase } from '@/integrations/supabase/client'

// Helper to map from DB (snake_case) to App (camelCase)
const fromDbToApp = (dbTransfer: any): AccountTransfer => ({
  id: dbTransfer.id,
  fromAccountId: dbTransfer.from_account_id,
  toAccountId: dbTransfer.to_account_id,
  amount: dbTransfer.amount,
  description: dbTransfer.description,
  userId: dbTransfer.user_id,
  userName: dbTransfer.user_name,
  createdAt: new Date(dbTransfer.created_at),
});

// Helper to map from App (camelCase) to DB (snake_case)
const fromAppToDb = (appTransfer: CreateAccountTransferData) => ({
  from_account_id: appTransfer.fromAccountId,
  to_account_id: appTransfer.toAccountId,
  amount: appTransfer.amount,
  description: appTransfer.description,
  user_id: appTransfer.userId,
  user_name: appTransfer.userName,
});

export const useAccountTransfers = () => {
  const queryClient = useQueryClient()

  const { data: transfers, isLoading } = useQuery({
    queryKey: ['accountTransfers'],
    queryFn: async (): Promise<AccountTransfer[]> => {
      const { data, error } = await supabase
        .from('account_transfers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transfers:', error);
        throw new Error(error.message);
      }
      return data ? data.map(fromDbToApp) : [];
    }
  });

  const createTransfer = useMutation({
    mutationFn: async (transferData: CreateAccountTransferData): Promise<AccountTransfer> => {
      const dbData = fromAppToDb(transferData);
      const { data, error } = await supabase
        .from('account_transfers')
        .insert(dbData)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating transfer:', error);
        throw new Error(error.message);
      }
      return fromDbToApp(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accountTransfers'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  const getTransfersByDateRange = async (from: Date, to: Date): Promise<AccountTransfer[]> => {
    const { data, error } = await supabase
      .from('account_transfers')
      .select('*')
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data ? data.map(fromDbToApp) : [];
  };

  return {
    transfers,
    isLoading,
    createTransfer,
    getTransfersByDateRange,
  }
}