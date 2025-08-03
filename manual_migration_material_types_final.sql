-- Manual migration untuk menambahkan jenis bahan ke tabel materials
-- JALANKAN DI SUPABASE SQL EDITOR

-- 1. Tambah kolom type ke tabel materials
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Stock' CHECK (type IN ('Stock', 'Beli'));

-- 2. Update existing materials untuk set default type
UPDATE public.materials 
SET type = 'Stock'
WHERE type IS NULL;

-- 3. Tambah comment untuk kolom baru
COMMENT ON COLUMN public.materials.type IS 'Jenis bahan: Stock (produksi menurunkan stock), Beli (produksi menambah stock)';

-- 4. Buat tabel material_stock_movements untuk tracking pergerakan stock bahan
CREATE TABLE IF NOT EXISTS public.material_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL,
  material_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT')),
  reason TEXT NOT NULL CHECK (reason IN ('PURCHASE', 'PRODUCTION_CONSUMPTION', 'PRODUCTION_ACQUISITION', 'ADJUSTMENT', 'RETURN')),
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
  CONSTRAINT fk_material_stock_movement_material 
    FOREIGN KEY (material_id) 
    REFERENCES public.materials(id) 
    ON DELETE CASCADE,
    
  CONSTRAINT fk_material_stock_movement_user 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE,
    
  -- Ensure positive quantity
  CONSTRAINT positive_quantity CHECK (quantity > 0)
);

-- 5. Enable RLS untuk material_stock_movements
ALTER TABLE public.material_stock_movements ENABLE ROW LEVEL SECURITY;

-- 6. Create policies
CREATE POLICY IF NOT EXISTS "Authenticated users can view material stock movements" 
ON public.material_stock_movements FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Authenticated users can create material stock movements" 
ON public.material_stock_movements FOR INSERT 
USING (auth.role() = 'authenticated');

-- 7. Create indexes
CREATE INDEX IF NOT EXISTS idx_material_stock_movements_material ON public.material_stock_movements(material_id);
CREATE INDEX IF NOT EXISTS idx_material_stock_movements_user ON public.material_stock_movements(user_id);
CREATE INDEX IF NOT EXISTS idx_material_stock_movements_created_at ON public.material_stock_movements(created_at DESC);

-- 8. Test query untuk memastikan tabel siap
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'materials' 
AND table_schema = 'public'
ORDER BY ordinal_position;