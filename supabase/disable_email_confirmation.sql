-- Run this in Supabase SQL Editor to auto-confirm all existing unconfirmed users
-- and allow login without email verification (for industrial internal app)

-- 1. Confirm all existing unconfirmed auth users
UPDATE auth.users
SET
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  confirmed_at       = COALESCE(confirmed_at, now())
WHERE email_confirmed_at IS NULL;

-- 2. Check result
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;

