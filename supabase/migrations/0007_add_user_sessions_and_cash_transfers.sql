-- User Sessions table untuk tracking session aktif
CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  device_info TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_activity TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  is_active BOOLEAN DEFAULT true
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Policy untuk user_sessions
CREATE POLICY "Users can view their own sessions" ON public.user_sessions 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" ON public.user_sessions 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON public.user_sessions 
  FOR UPDATE USING (auth.uid() = user_id);

-- Function untuk register session baru dan logout session lama
CREATE OR REPLACE FUNCTION public.register_user_session(
  p_session_token text,
  p_device_info text DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Nonaktifkan semua session lama untuk user ini
  UPDATE public.user_sessions 
  SET is_active = false 
  WHERE user_id = auth.uid() AND is_active = true;
  
  -- Buat session baru
  INSERT INTO public.user_sessions (
    user_id, 
    session_token, 
    device_info, 
    ip_address, 
    user_agent
  ) VALUES (
    auth.uid(), 
    p_session_token, 
    p_device_info, 
    p_ip_address, 
    p_user_agent
  );
END;
$$;

-- Function untuk logout session
CREATE OR REPLACE FUNCTION public.logout_session(p_session_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_sessions 
  SET is_active = false 
  WHERE session_token = p_session_token AND user_id = auth.uid();
END;
$$;

-- Cash Transfer table
CREATE TABLE public.cash_transfers (
  id TEXT PRIMARY KEY,
  from_account_id TEXT NOT NULL REFERENCES public.accounts(id),
  to_account_id TEXT NOT NULL REFERENCES public.accounts(id),
  amount NUMERIC NOT NULL,
  description TEXT,
  transferred_by UUID REFERENCES public.profiles(id),
  transferred_by_name TEXT,
  transfer_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.cash_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage cash transfers" ON public.cash_transfers FOR ALL USING (auth.role() = 'authenticated');

-- Function untuk transfer kas
CREATE OR REPLACE FUNCTION public.transfer_cash(
  p_from_account_id text,
  p_to_account_id text,
  p_amount numeric,
  p_description text DEFAULT NULL,
  p_transferred_by_name text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  from_account_balance numeric;
  transfer_id text;
BEGIN
  -- Cek saldo akun pengirim
  SELECT balance INTO from_account_balance 
  FROM public.accounts 
  WHERE id = p_from_account_id;
  
  IF from_account_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo tidak mencukupi untuk transfer';
  END IF;
  
  -- Generate transfer ID
  transfer_id := 'TRF-' || to_char(NOW(), 'YYYYMMDD') || '-' || LPAD(EXTRACT(EPOCH FROM NOW())::text, 10, '0');
  
  -- Kurangi saldo akun pengirim
  UPDATE public.accounts 
  SET balance = balance - p_amount 
  WHERE id = p_from_account_id;
  
  -- Tambah saldo akun penerima
  UPDATE public.accounts 
  SET balance = balance + p_amount 
  WHERE id = p_to_account_id;
  
  -- Catat transaksi transfer
  INSERT INTO public.cash_transfers (
    id,
    from_account_id,
    to_account_id,
    amount,
    description,
    transferred_by,
    transferred_by_name
  ) VALUES (
    transfer_id,
    p_from_account_id,
    p_to_account_id,
    p_amount,
    p_description,
    auth.uid(),
    p_transferred_by_name
  );
  
  RETURN transfer_id;
END;
$$;