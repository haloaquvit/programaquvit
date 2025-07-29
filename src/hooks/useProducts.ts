import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Product } from '@/types/product'
import { supabase } from '@/integrations/supabase/client'

// DB to App mapping
const fromDb = (dbProduct: any): Product => ({
  id: dbProduct.id,
  name: dbProduct.name,
  category: dbProduct.category,
  basePrice: dbProduct.base_price,
  unit: dbProduct.unit,
  minOrder: dbProduct.min_order,
  description: dbProduct.description,
  specifications: dbProduct.specifications || [],
  materials: dbProduct.materials || [],
  createdAt: new Date(dbProduct.created_at),
  updatedAt: new Date(dbProduct.updated_at),
});

// App to DB mapping
const toDb = (appProduct: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>) => {
  const { basePrice, minOrder, ...rest } = appProduct;
  const dbData: any = { ...rest };
  if (basePrice !== undefined) dbData.base_price = basePrice;
  if (minOrder !== undefined) dbData.min_order = minOrder;
  return dbData;
};


export const useProducts = () => {
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw new Error(error.message);
      return data ? data.map(fromDb) : [];
    }
  })

  const upsertProduct = useMutation({
    mutationFn: async (product: Partial<Product>): Promise<Product> => {
      const dbData = toDb(product);
      const { data, error } = await supabase
        .from('products')
        .upsert(dbData)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return fromDb(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });

  const deleteProduct = useMutation({
    mutationFn: async (productId: string): Promise<void> => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });

  return {
    products,
    isLoading,
    upsertProduct,
    deleteProduct,
  }
}