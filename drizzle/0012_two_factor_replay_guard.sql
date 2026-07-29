-- Tracks the last TOTP time-step counter each user successfully verified with,
-- so a 2FA code cannot be replayed within its 30-second validity window.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "two_factor_last_used_counter" integer;
