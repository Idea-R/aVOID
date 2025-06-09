/*
  # CONSOLIDATED MANUAL MIGRATION FOR aVOID GAME
  # Run this entire script in your Supabase SQL Editor
  
  This consolidates all essential migrations:
  - RLS Performance Optimization
  - Function Security Fixes
  - Enhanced Leaderboard System
  - Duplicate Score Cleanup
  
  Execute this as a single script in Supabase Dashboard > SQL Editor
*/

-- ==============================================================================
-- STEP 1: CREATE BACKUP TABLES FOR SAFETY
-- ==============================================================================

-- Backup existing leaderboard scores
CREATE TABLE IF NOT EXISTS leaderboard_scores_backup_manual AS 
SELECT * FROM leaderboard_scores;

-- Backup existing user profiles  
CREATE TABLE IF NOT EXISTS user_profiles_backup_manual AS 
SELECT * FROM user_profiles;

-- ==============================================================================
-- STEP 2: OPTIMIZE RLS POLICIES FOR PERFORMANCE
-- ==============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view public profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Anyone can view leaderboard scores" ON leaderboard_scores;
DROP POLICY IF EXISTS "Authenticated users can insert scores" ON leaderboard_scores;

-- Create optimized RLS policies with (select auth.uid()) for better performance
CREATE POLICY "Users can view public profiles" ON user_profiles
  FOR SELECT USING (is_public = true OR id = (select auth.uid()));

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (id = (select auth.uid()));

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Anyone can view leaderboard scores" ON leaderboard_scores
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert scores" ON leaderboard_scores
  FOR INSERT WITH CHECK (
    CASE 
      WHEN is_verified = true THEN (select auth.uid()) IS NOT NULL
      ELSE true
    END
  );

-- ==============================================================================
-- STEP 3: ADD MISSING USER PROFILE COLUMNS
-- ==============================================================================

-- Add personal best tracking columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'best_score') THEN
    ALTER TABLE public.user_profiles ADD COLUMN best_score integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'games_played') THEN
    ALTER TABLE public.user_profiles ADD COLUMN games_played integer DEFAULT 0;
  END IF;
END $$;

-- ==============================================================================
-- STEP 4: CREATE ENHANCED LEADERBOARD FUNCTIONS WITH SECURITY FIXES
-- ==============================================================================

-- Function to get user's best verified score position on leaderboard
CREATE OR REPLACE FUNCTION public.get_user_leaderboard_position(user_uuid UUID)
RETURNS INTEGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_best_score INTEGER;
  user_position INTEGER;
BEGIN
  -- Get user's best score
  SELECT COALESCE(MAX(score), 0) INTO user_best_score
  FROM leaderboard_scores 
  WHERE user_id = user_uuid AND is_verified = true;
  
  -- If user has no verified scores, return 0
  IF user_best_score = 0 THEN
    RETURN 0;
  END IF;
  
  -- Get position based on unique users with better scores
  SELECT COUNT(DISTINCT ls.user_id) + 1 INTO user_position
  FROM leaderboard_scores ls
  INNER JOIN (
    SELECT user_id, MAX(score) as best_score
    FROM leaderboard_scores
    WHERE is_verified = true AND user_id IS NOT NULL
    GROUP BY user_id
  ) best_scores ON ls.user_id = best_scores.user_id AND ls.score = best_scores.best_score
  WHERE best_scores.best_score > user_best_score;
  
  RETURN user_position;
END;
$$ LANGUAGE plpgsql;

-- Function to get top unique verified players (one score per user)
CREATE OR REPLACE FUNCTION public.get_top_unique_verified_scores(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  player_name TEXT,
  score INTEGER,
  user_id UUID,
  created_at TIMESTAMPTZ,
  game_session_id TEXT,
  position INTEGER
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH ranked_scores AS (
    SELECT 
      ls.id,
      ls.player_name,
      ls.score,
      ls.user_id,
      ls.created_at,
      ls.game_session_id,
      ROW_NUMBER() OVER (ORDER BY MAX(ls.score) DESC) as position
    FROM leaderboard_scores ls
    WHERE ls.is_verified = true AND ls.user_id IS NOT NULL
    GROUP BY ls.user_id, ls.id, ls.player_name, ls.score, ls.created_at, ls.game_session_id
    HAVING ls.score = MAX(ls.score)
    ORDER BY ls.score DESC
    LIMIT limit_count
  )
  SELECT 
    rs.id,
    rs.player_name,
    rs.score,
    rs.user_id,
    rs.created_at,
    rs.game_session_id,
    rs.position::INTEGER
  FROM ranked_scores rs
  ORDER BY rs.score DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's personal score history
CREATE OR REPLACE FUNCTION public.get_user_score_history(user_uuid UUID, limit_count INTEGER DEFAULT 5)
RETURNS TABLE (
  id UUID,
  score INTEGER,
  created_at TIMESTAMPTZ,
  game_session_id TEXT,
  global_rank INTEGER
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ls.id,
    ls.score,
    ls.created_at,
    ls.game_session_id,
    (
      SELECT COUNT(*) + 1
      FROM leaderboard_scores ls2
      WHERE ls2.score > ls.score
        AND ls2.is_verified = true
    )::INTEGER as global_rank
  FROM leaderboard_scores ls
  WHERE ls.user_id = user_uuid AND ls.is_verified = true
  ORDER BY ls.score DESC, ls.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update game statistics
CREATE OR REPLACE FUNCTION public.update_game_statistics(
  user_id UUID,
  games_increment INTEGER DEFAULT 1,
  meteors_increment INTEGER DEFAULT 0,
  survival_increment NUMERIC DEFAULT 0,
  distance_increment NUMERIC DEFAULT 0,
  game_score INTEGER DEFAULT 0,
  game_meteors INTEGER DEFAULT 0,
  game_survival_time NUMERIC DEFAULT 0,
  game_distance NUMERIC DEFAULT 0
) RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update cumulative statistics
  UPDATE public.user_profiles
  SET 
    total_games_played = total_games_played + games_increment,
    total_meteors_destroyed = total_meteors_destroyed + meteors_increment,
    total_survival_time = total_survival_time + survival_increment,
    total_distance_traveled = total_distance_traveled + distance_increment,
    updated_at = now()
  WHERE id = user_id;
  
  -- Update personal bests if current game values are provided and better
  IF game_score > 0 THEN
    UPDATE public.user_profiles
    SET 
      best_game_score = GREATEST(best_game_score, game_score),
      best_game_meteors = CASE 
        WHEN game_score > best_game_score THEN game_meteors 
        ELSE GREATEST(best_game_meteors, game_meteors)
      END,
      best_game_time = CASE 
        WHEN game_score > best_game_score THEN game_survival_time 
        ELSE GREATEST(best_game_time, game_survival_time)
      END,
      best_game_distance = CASE 
        WHEN game_score > best_game_score THEN game_distance 
        ELSE GREATEST(best_game_distance, game_distance)
      END,
      updated_at = now()
    WHERE id = user_id;
  END IF;
  
  -- Check if update affected any rows
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found for user ID: %', user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update user profile stats when score is submitted
CREATE OR REPLACE FUNCTION public.update_user_stats_on_score()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only update for verified scores
  IF NEW.is_verified = true AND NEW.user_id IS NOT NULL THEN
    -- Update user profile stats
    UPDATE user_profiles 
    SET 
      best_score = GREATEST(COALESCE(best_score, 0), NEW.score),
      games_played = COALESCE(games_played, 0) + 1,
      total_games_played = COALESCE(total_games_played, 0) + 1,
      updated_at = now()
    WHERE id = NEW.user_id;
    
    -- If no profile exists, this won't update anything (profile should exist from trigger)
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up duplicate scores manually
CREATE OR REPLACE FUNCTION public.cleanup_duplicate_verified_scores()
RETURNS INTEGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  WITH user_best_scores AS (
    SELECT 
      user_id,
      MAX(score) as best_score
    FROM leaderboard_scores 
    WHERE is_verified = true AND user_id IS NOT NULL
    GROUP BY user_id
  ),
  scores_to_keep AS (
    SELECT DISTINCT ON (ls.user_id) ls.id
    FROM leaderboard_scores ls
    INNER JOIN user_best_scores ubs ON ls.user_id = ubs.user_id 
      AND ls.score = ubs.best_score
    WHERE ls.is_verified = true
    ORDER BY ls.user_id, ls.created_at ASC
  )
  DELETE FROM leaderboard_scores
  WHERE is_verified = true 
    AND user_id IS NOT NULL 
    AND id NOT IN (SELECT id FROM scores_to_keep);
    
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Cleaned up % duplicate verified scores', deleted_count;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- STEP 5: CREATE TRIGGERS
-- ==============================================================================

-- Create trigger to auto-update user stats
DROP TRIGGER IF EXISTS update_user_stats_on_score_trigger ON leaderboard_scores;
CREATE TRIGGER update_user_stats_on_score_trigger
  AFTER INSERT ON leaderboard_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_on_score();

-- ==============================================================================
-- STEP 6: CLEANUP DUPLICATE SCORES
-- ==============================================================================

-- Remove duplicate verified scores, keeping only the best score per user
WITH user_best_scores AS (
  SELECT 
    user_id,
    MAX(score) as best_score,
    MIN(created_at) as earliest_date
  FROM leaderboard_scores 
  WHERE is_verified = true AND user_id IS NOT NULL
  GROUP BY user_id
),
scores_to_keep AS (
  SELECT DISTINCT ON (ls.user_id) ls.id
  FROM leaderboard_scores ls
  INNER JOIN user_best_scores ubs ON ls.user_id = ubs.user_id 
    AND ls.score = ubs.best_score
  WHERE ls.is_verified = true
  ORDER BY ls.user_id, ls.created_at ASC
)
DELETE FROM leaderboard_scores
WHERE is_verified = true 
  AND user_id IS NOT NULL 
  AND id NOT IN (SELECT id FROM scores_to_keep);

-- ==============================================================================
-- STEP 7: BACKFILL USER PROFILE STATISTICS
-- ==============================================================================

-- Backfill user profile statistics for existing users
UPDATE user_profiles 
SET 
  best_score = COALESCE((
    SELECT MAX(score) 
    FROM leaderboard_scores 
    WHERE user_id = user_profiles.id AND is_verified = true
  ), 0),
  games_played = COALESCE((
    SELECT COUNT(*) 
    FROM leaderboard_scores 
    WHERE user_id = user_profiles.id AND is_verified = true
  ), 0),
  total_games_played = GREATEST(
    COALESCE(total_games_played, 0),
    COALESCE((
      SELECT COUNT(*) 
      FROM leaderboard_scores 
      WHERE user_id = user_profiles.id AND is_verified = true
    ), 0)
  ),
  updated_at = now()
WHERE EXISTS (
  SELECT 1 FROM leaderboard_scores 
  WHERE user_id = user_profiles.id AND is_verified = true
);

-- ==============================================================================
-- STEP 8: CREATE PERFORMANCE INDEXES
-- ==============================================================================

-- Create improved indexes for performance
CREATE INDEX IF NOT EXISTS idx_leaderboard_verified_user_score ON leaderboard_scores(user_id, score DESC) WHERE is_verified = true;
CREATE INDEX IF NOT EXISTS idx_leaderboard_verified_score_desc ON leaderboard_scores(score DESC) WHERE is_verified = true;
CREATE INDEX IF NOT EXISTS idx_user_profiles_best_score ON user_profiles(best_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_best_game_score ON user_profiles(best_game_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_total_meteors ON user_profiles(total_meteors_destroyed DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_total_time ON user_profiles(total_survival_time DESC);

-- ==============================================================================
-- STEP 9: GRANT PERMISSIONS
-- ==============================================================================

-- Grant permissions for all functions
GRANT EXECUTE ON FUNCTION public.get_user_leaderboard_position(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_top_unique_verified_scores(INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_score_history(UUID, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.update_game_statistics(UUID, INTEGER, INTEGER, NUMERIC, NUMERIC, INTEGER, INTEGER, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_duplicate_verified_scores() TO authenticated;

-- ==============================================================================
-- COMPLETION MESSAGE
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE 'MIGRATION COMPLETED SUCCESSFULLY!';
  RAISE NOTICE 'Backup tables created: leaderboard_scores_backup_manual, user_profiles_backup_manual';
  RAISE NOTICE 'All leaderboard functions, triggers, and optimizations applied.';
  RAISE NOTICE 'Duplicate scores cleaned up and user statistics backfilled.';
END $$; 