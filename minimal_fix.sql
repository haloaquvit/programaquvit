-- MINIMAL FIX - Only fix what's absolutely necessary

-- 1. First, ensure current_stock column exists (this was the original problem)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS current_stock NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Stock';

-- 2. Update existing products to have default values
UPDATE public.products 
SET 
    current_stock = COALESCE(current_stock, 0),
    min_stock = COALESCE(min_stock, 0),
    type = COALESCE(type, 'Stock')
WHERE current_stock IS NULL OR min_stock IS NULL OR type IS NULL;

-- 3. Fix employees_view if it doesn't exist or is broken
DROP VIEW IF EXISTS public.employees_view;
CREATE VIEW public.employees_view AS
SELECT
    u.id,
    p.full_name,
    u.email,
    p.role,
    p.phone,
    p.address,
    p.status,
    p.full_name as username  -- Use full_name as username fallback
FROM
    auth.users u
JOIN
    public.profiles p ON u.id = p.id;

-- 4. Grant basic permissions (minimal)
GRANT SELECT ON public.employees_view TO authenticated;

-- 5. Check if your user profile exists
SELECT 
    u.id,
    u.email,
    p.full_name,
    p.role,
    p.status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'zakytm@gmail.com';  -- Your email from the logs