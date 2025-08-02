-- Feature Permissions table untuk mengatur akses fitur per pengguna
CREATE TABLE public.feature_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  can_add BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT true,
  can_delete BOOLEAN DEFAULT true,
  can_view BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, feature_name)
);

ALTER TABLE public.feature_permissions ENABLE ROW LEVEL SECURITY;

-- Policy untuk feature_permissions - hanya owner yang bisa manage
CREATE POLICY "Owner can manage all feature permissions" ON public.feature_permissions 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'owner'
    )
  );

-- Policy untuk user melihat permission mereka sendiri
CREATE POLICY "Users can view their own permissions" ON public.feature_permissions 
  FOR SELECT USING (user_id = auth.uid());

-- Function untuk mendapatkan permission user
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(
  feature_name TEXT,
  can_add BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN,
  can_view BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fp.feature_name,
    fp.can_add,
    fp.can_edit,
    fp.can_delete,
    fp.can_view
  FROM public.feature_permissions fp
  WHERE fp.user_id = p_user_id;
END;
$$;

-- Function untuk set permission user (hanya owner)
CREATE OR REPLACE FUNCTION public.set_user_permission(
  p_user_id uuid,
  p_feature_name text,
  p_can_add boolean DEFAULT true,
  p_can_edit boolean DEFAULT true,
  p_can_delete boolean DEFAULT true,
  p_can_view boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if current user is owner
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Only owner can set permissions';
  END IF;

  -- Insert or update permission
  INSERT INTO public.feature_permissions (
    user_id, feature_name, can_add, can_edit, can_delete, can_view
  ) VALUES (
    p_user_id, p_feature_name, p_can_add, p_can_edit, p_can_delete, p_can_view
  )
  ON CONFLICT (user_id, feature_name) 
  DO UPDATE SET 
    can_add = p_can_add,
    can_edit = p_can_edit,
    can_delete = p_can_delete,
    can_view = p_can_view,
    updated_at = NOW();
END;
$$;

-- Populate default permissions for existing users
INSERT INTO public.feature_permissions (user_id, feature_name, can_add, can_edit, can_delete, can_view)
SELECT 
  p.id as user_id,
  feature.name as feature_name,
  CASE 
    WHEN p.role = 'owner' THEN true
    WHEN p.role = 'admin' THEN true
    WHEN p.role = 'supervisor' THEN true
    ELSE false
  END as can_add,
  CASE 
    WHEN p.role = 'owner' THEN true
    WHEN p.role = 'admin' THEN true
    WHEN p.role = 'supervisor' THEN true
    WHEN p.role = 'cashier' THEN true
    ELSE false
  END as can_edit,
  CASE 
    WHEN p.role = 'owner' THEN true
    WHEN p.role = 'admin' THEN true
    ELSE false
  END as can_delete,
  true as can_view
FROM public.profiles p
CROSS JOIN (
  VALUES 
    ('transactions'),
    ('products'),
    ('customers'),
    ('materials'),
    ('employees'),
    ('accounts'),
    ('expenses'),
    ('advances'),
    ('quotations'),
    ('purchase_orders')
) AS feature(name)
ON CONFLICT (user_id, feature_name) DO NOTHING;