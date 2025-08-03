-- Check if stock_movements table exists and has data
SELECT COUNT(*) as total_movements FROM public.stock_movements;

-- If table doesn't exist, you may need to run the original migration
-- Check table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'stock_movements' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Sample query to see if there are any movements
SELECT 
  product_name,
  type,
  reason,
  quantity,
  created_at
FROM public.stock_movements 
ORDER BY created_at DESC 
LIMIT 5;