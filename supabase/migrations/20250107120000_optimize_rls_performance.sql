/*
  # Optimize RLS Policies for Performance
  
  This migration fixes the performance issues identified in Supabase:
  1. Replaces auth.uid() with (select auth.uid()) to avoid re-evaluation per row
  2. Consolidates multiple permissive policies for better performance
  
  Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
*/

-- Drop existing RLS policies that have performance issues
DROP POLICY IF EXISTS "Users can manage own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Anyone can read public profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own verified scores" ON public.leaderboard_scores;

-- Recreate user_profiles policies with optimized auth function calls
-- Single policy for authenticated users (read + write own profile)
CREATE POLICY "Users can manage own profile"
  ON public.user_profiles
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- Single policy for public access (read only public profiles)
CREATE POLICY "Public can read public profiles"
  ON public.user_profiles
  FOR SELECT
  TO public
  USING (is_public = true);

-- Recreate leaderboard_scores policy with optimized auth function call
CREATE POLICY "Users can update own verified scores"
  ON public.leaderboard_scores
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id AND is_verified = true);

-- Add comment to document the optimization
COMMENT ON POLICY "Users can manage own profile" ON public.user_profiles IS 
'Optimized RLS policy using (SELECT auth.uid()) to avoid re-evaluation per row';

COMMENT ON POLICY "Users can update own verified scores" ON public.leaderboard_scores IS 
'Optimized RLS policy using (SELECT auth.uid()) to avoid re-evaluation per row'; 