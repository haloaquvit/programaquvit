import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { EmployeeAdvance, AdvanceRepayment } from '@/types/employeeAdvance'
import { useAccounts } from './useAccounts';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

const fromDbToApp = (dbAdvance: any): EmployeeAdvance => ({
  id: dbAdvance.id,
  employeeId: dbAdvance.employee_id,
  employeeName: dbAdvance.employee_name,
  amount: dbAdvance.amount,
  date: new Date(dbAdvance.date),
  notes: dbAdvance.notes,
  remainingAmount: dbAdvance.remaining_amount,
  repayments: (dbAdvance.advance_repayments || []).map((r: any) => ({
    id: r.id,
    amount: r.amount,
    date: new Date(r.date),
    recordedBy: r.recorded_by,
  })),
  createdAt: new Date(dbAdvance.created_at),
  accountId: dbAdvance.account_id,
  accountName: dbAdvance.account_name,
});

const fromAppToDb = (appAdvance: Partial<EmployeeAdvance>) => {
  const dbData: { [key: string]: any } = {};
  if (appAdvance.id !== undefined) dbData.id = appAdvance.id;
  if (appAdvance.employeeId !== undefined) dbData.employee_id = appAdvance.employeeId;
  if (appAdvance.employeeName !== undefined) dbData.employee_name = appAdvance.employeeName;
  if (appAdvance.amount !== undefined) dbData.amount = appAdvance.amount;
  if (appAdvance.date !== undefined) dbData.date = appAdvance.date;
  if (appAdvance.notes !== undefined) dbData.notes = appAdvance.notes;
  if (appAdvance.remainingAmount !== undefined) dbData.remaining_amount = appAdvance.remainingAmount;
  if (appAdvance.accountId !== undefined) dbData.account_id = appAdvance.accountId;
  if (appAdvance.accountName !== undefined) dbData.account_name = appAdvance.accountName;
  return dbData;
};

export const useEmployeeAdvances = () => {
  const queryClient = useQueryClient();
  const { updateAccountBalance } = useAccounts();

  const { data: advances, isLoading, isError, error } = useQuery<EmployeeAdvance[]>({
    queryKey: ['employeeAdvances'],
    queryFn: async () => {
      const { data, error } = await supabase.from('employee_advances').select('*, advance_repayments:advance_repayments(*)');
      if (error) {
        console.error("❌ Gagal mengambil data panjar:", error.message);
        throw new Error(error.message);
      }
      return data ? data.map(fromDbToApp) : [];
    }
  });

  const addAdvance = useMutation({
    mutationFn: async (newData: Omit<EmployeeAdvance, 'id' | 'createdAt' | 'remainingAmount' | 'repayments'>): Promise<EmployeeAdvance> => {
      const advanceToInsert = {
        ...newData,
        remainingAmount: newData.amount,
      };
      const dbData = fromAppToDb(advanceToInsert);
      
      const { data, error } = await supabase
        .from('employee_advances')
        .insert({ ...dbData, id: `adv-${Date.now()}` })
        .select()
        .single();

      if (error) throw new Error(error.message);
      
      return fromDbToApp({ ...data, advance_repayments: [] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeAdvances'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  const addRepayment = useMutation({
    mutationFn: async ({ advanceId, repaymentData }: { advanceId: string, repaymentData: Omit<AdvanceRepayment, 'id'> }): Promise<void> => {
      const newRepayment = {
        id: `rep-${Date.now()}`,
        advance_id: advanceId,
        amount: repaymentData.amount,
        date: repaymentData.date,
        recorded_by: repaymentData.recordedBy,
      };
      const { error: insertError } = await supabase.from('advance_repayments').insert(newRepayment);
      if (insertError) throw insertError;

      // Call RPC to update remaining amount
      const { error: rpcError } = await supabase.rpc('update_remaining_amount', {
        p_advance_id: advanceId
      });
      if (rpcError) throw new Error(rpcError.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeAdvances'] });
    }
  });

  const deleteAdvance = useMutation({
    mutationFn: async (advanceToDelete: EmployeeAdvance): Promise<void> => {
      // Delete associated repayments first
      await supabase.from('advance_repayments').delete().eq('advance_id', advanceToDelete.id);
      
      // Then delete the advance itself
      const { error } = await supabase.from('employee_advances').delete().eq('id', advanceToDelete.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeAdvances'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  // Group advances by employee
  const advancesByEmployee = useMemo(() => {
    if (!advances) return [];
    
    const grouped = advances.reduce((acc, advance) => {
      const employeeId = advance.employeeId;
      if (!acc[employeeId]) {
        acc[employeeId] = {
          employeeId,
          employeeName: advance.employeeName,
          advances: [],
          totalAmount: 0,
          totalRemaining: 0,
        };
      }
      
      acc[employeeId].advances.push(advance);
      acc[employeeId].totalAmount += advance.amount;
      acc[employeeId].totalRemaining += advance.remainingAmount;
      
      return acc;
    }, {} as Record<string, {
      employeeId: string;
      employeeName: string;
      advances: EmployeeAdvance[];
      totalAmount: number;
      totalRemaining: number;
    }>);
    
    return Object.values(grouped).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }, [advances]);

  return {
    advances,
    advancesByEmployee,
    isLoading,
    isError,
    error,
    addAdvance,
    addRepayment,
    deleteAdvance,
  }
}