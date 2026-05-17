-- Referral mechanic: track who brought each user to the platform
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invited_by_user_id UUID REFERENCES auth.users(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_bonus_unlocked BOOLEAN NOT NULL DEFAULT FALSE;
-- Prevents double-counting: set to true after referrer is credited on first trip creation
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_counted BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for counting referrals by inviter
CREATE INDEX IF NOT EXISTS idx_profiles_invited_by ON profiles(invited_by_user_id) WHERE invited_by_user_id IS NOT NULL;
