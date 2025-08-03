-- Manual migration untuk menambahkan field stock management
-- JALANKAN DI SUPABASE SQL EDITOR

-- 1. Tambah kolom baru ke tabel products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Stock' CHECK (type IN ('Stock', 'Beli')),
ADD COLUMN IF NOT EXISTS current_stock NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT 0;

-- 2. Update existing products untuk set default values
UPDATE public.products 
SET 
  type = 'Stock',
  current_stock = 0,
  min_stock = 0
WHERE type IS NULL OR current_stock IS NULL OR min_stock IS NULL;

-- 3. Buat tabel stock_movements (jika belum ada)
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT')),
  reason TEXT NOT NULL CHECK (reason IN ('PURCHASE', 'PRODUCTION', 'SALES', 'ADJUSTMENT', 'RETURN')),
  quantity NUMERIC NOT NULL,
  previous_stock NUMERIC NOT NULL,
  new_stock NUMERIC NOT NULL,
  notes TEXT,
  reference_id TEXT,
  reference_type TEXT,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Foreign key constraints
  CONSTRAINT fk_stock_movement_product 
    FOREIGN KEY (product_id) 
    REFERENCES public.products(id) 
    ON DELETE CASCADE,
    
  CONSTRAINT fk_stock_movement_user 
    FOREIGN KEY (user_id) 
    REFERENCES public.users(id) 
    ON DELETE CASCADE,
    
  -- Ensure positive quantity
  CONSTRAINT positive_quantity CHECK (quantity > 0)
);

-- 4. Enable RLS untuk stock_movements
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- 5. Create policies
CREATE POLICY IF NOT EXISTS "Authenticated users can view stock movements" 
ON public.stock_movements FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Authenticated users can create stock movements" 
ON public.stock_movements FOR INSERT 
USING (auth.role() = 'authenticated');

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_user ON public.stock_movements(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at DESC);

-- 7. Test query untuk memastikan tabel siap
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND table_schema = 'public'
ORDER BY ordinal_position;