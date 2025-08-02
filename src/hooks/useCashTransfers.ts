import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export interface CashTransfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description?: string;
  transferredBy?: string;
  transferredByName?: string;
  transferDate: Date;
  createdAt: Date;
}

const fromDbToApp = (dbTransfer: any): CashTransfer => ({
  id: dbTransfer.id,
  fromAccountId: dbTransfer.from_account_id,
  toAccountId: dbTransfer.to_account_id,
  amount: dbTransfer.amount,
  description: dbTransfer.description,
  transferredBy: dbTransfer.transferred_by,
  transferredByName: dbTransfer.transferred_by_name,
  transferDate: new Date(dbTransfer.transfer_date),
  createdAt: new Date(dbTransfer.created_at),
});

export const useCashTransfers = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  const { data: transfers, isLoading } = useQuery<CashTransfer[]>({
    queryKey: ['cash_transfers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_transfers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw new Error(error.message);
      return data ? data.map(fromDbToApp) : [];
    }
  });

  const transferCash = useMutation({
    mutationFn: async ({
      fromAccountId,
      toAccountId,
      amount,
      description
    }: {
      fromAccountId: string;
      toAccountId: string;
      amount: number;
      description?: string;
    }) => {
      const { data, error } = await supabase.rpc('transfer_cash', {
        p_from_account_id: fromAccountId,
        p_to_account_id: toAccountId,
        p_amount: amount,
        p_description: description,
        p_transferred_by_name: user?.name
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash_transfers'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  return {
    transfers,
    isLoading,
    transferCash
  };
};