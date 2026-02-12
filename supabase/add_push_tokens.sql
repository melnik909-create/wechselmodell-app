-- Add push notification token support to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS push_token TEXT;

COMMENT ON COLUMN public.profiles.push_token IS 'Expo push notification token for this user';

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON public.profiles(push_token) WHERE push_token IS NOT NULL;
