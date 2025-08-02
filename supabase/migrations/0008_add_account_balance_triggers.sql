-- Function to update account balance when transaction is inserted
CREATE OR REPLACE FUNCTION update_account_balance_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Add to account balance when transaction is paid
  IF NEW.payment_account_id IS NOT NULL AND NEW.paid_amount > 0 THEN
    UPDATE accounts 
    SET balance = balance + NEW.paid_amount 
    WHERE id = NEW.payment_account_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update account balance when expense is inserted
CREATE OR REPLACE FUNCTION update_account_balance_on_expense()
RETURNS TRIGGER AS $$
BEGIN
  -- Subtract from account balance when expense is created
  IF NEW.account_id IS NOT NULL THEN
    UPDATE accounts 
    SET balance = balance - NEW.amount 
    WHERE id = NEW.account_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to revert account balance when expense is deleted
CREATE OR REPLACE FUNCTION revert_account_balance_on_expense_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Add back to account balance when expense is deleted
  IF OLD.account_id IS NOT NULL THEN
    UPDATE accounts 
    SET balance = balance + OLD.amount 
    WHERE id = OLD.account_id;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to update account balance when employee advance is inserted
CREATE OR REPLACE FUNCTION update_account_balance_on_advance()
RETURNS TRIGGER AS $$
BEGIN
  -- Subtract from account balance when advance is given
  IF NEW.account_id IS NOT NULL THEN
    UPDATE accounts 
    SET balance = balance - NEW.amount 
    WHERE id = NEW.account_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to revert account balance when advance is deleted
CREATE OR REPLACE FUNCTION revert_account_balance_on_advance_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Add back to account balance when advance is deleted
  IF OLD.account_id IS NOT NULL THEN
    UPDATE accounts 
    SET balance = balance + OLD.amount 
    WHERE id = OLD.account_id;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Update pay_receivable function to also update account balance
CREATE OR REPLACE FUNCTION public.pay_receivable(p_transaction_id text, p_amount numeric, p_account_id text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  current_paid_amount numeric;
  new_paid_amount numeric;
  total_amount numeric;
BEGIN
  SELECT paid_amount, total INTO current_paid_amount, total_amount
  FROM public.transactions
  WHERE id = p_transaction_id;

  new_paid_amount := current_paid_amount + p_amount;

  UPDATE public.transactions
  SET
    paid_amount = new_paid_amount,
    payment_status = CASE
      WHEN new_paid_amount >= total_amount THEN 'Lunas'
      ELSE 'Belum Lunas'
    END
  WHERE id = p_transaction_id;
  
  -- Update account balance if account_id is provided
  IF p_account_id IS NOT NULL THEN
    UPDATE public.accounts
    SET balance = balance + p_amount
    WHERE id = p_account_id;
  END IF;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_account_on_transaction ON transactions;
CREATE TRIGGER trigger_update_account_on_transaction
  AFTER INSERT ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_account_balance_on_transaction();

DROP TRIGGER IF EXISTS trigger_update_account_on_expense ON expenses;
CREATE TRIGGER trigger_update_account_on_expense
  AFTER INSERT ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_account_balance_on_expense();

DROP TRIGGER IF EXISTS trigger_revert_account_on_expense_delete ON expenses;
CREATE TRIGGER trigger_revert_account_on_expense_delete
  BEFORE DELETE ON expenses
  FOR EACH ROW EXECUTE FUNCTION revert_account_balance_on_expense_delete();

DROP TRIGGER IF EXISTS trigger_update_account_on_advance ON employee_advances;
CREATE TRIGGER trigger_update_account_on_advance
  AFTER INSERT ON employee_advances
  FOR EACH ROW EXECUTE FUNCTION update_account_balance_on_advance();

DROP TRIGGER IF EXISTS trigger_revert_account_on_advance_delete ON employee_advances;
CREATE TRIGGER trigger_revert_account_on_advance_delete
  BEFORE DELETE ON employee_advances
  FOR EACH ROW EXECUTE FUNCTION revert_account_balance_on_advance_delete();