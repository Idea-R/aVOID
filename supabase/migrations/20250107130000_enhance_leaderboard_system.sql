/*
  # Enhanced Leaderboard System
  
  This migration adds:
  1. Personal score history tracking
  2. User score limit enforcement (one verified score per user on top leaderboard)
  3. Performance improvements for ranking queries
  4. Personal best tracking in user profiles
*/

-- Add personal best tracking to user profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'best_score') THEN
    ALTER TABLE public.user_profiles ADD COLUMN best_score integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'games_played') THEN
    ALTER TABLE public.user_profiles ADD COLUMN games_played integer DEFAULT 0;
  END IF;
END $$;

-- Create function to get user's best verified score position on leaderboard
CREATE OR REPLACE FUNCTION public.get_user_leaderboard_position(user_uuid UUID)
RETURNS INTEGER 
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get top unique verified players (one score per user)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user's personal score history
CREATE OR REPLACE FUNCTION public.get_user_score_history(user_uuid UUID, limit_count INTEGER DEFAULT 5)
RETURNS TABLE (
  id UUID,
  score INTEGER,
  created_at TIMESTAMPTZ,
  game_session_id TEXT,
  global_rank INTEGER
) 
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update user profile stats when score is submitted
CREATE OR REPLACE FUNCTION public.update_user_stats_on_score()
RETURNS TRIGGER 
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-update user stats
DROP TRIGGER IF EXISTS update_user_stats_on_score_trigger ON leaderboard_scores;
CREATE TRIGGER update_user_stats_on_score_trigger
  AFTER INSERT ON leaderboard_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_on_score();

-- Create improved indexes for performance
CREATE INDEX IF NOT EXISTS idx_leaderboard_verified_user_score ON leaderboard_scores(user_id, score DESC) WHERE is_verified = true;
CREATE INDEX IF NOT EXISTS idx_leaderboard_verified_score_desc ON leaderboard_scores(score DESC) WHERE is_verified = true;
CREATE INDEX IF NOT EXISTS idx_user_profiles_best_score ON user_profiles(best_score DESC);

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_leaderboard_position(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_top_unique_verified_scores(INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_score_history(UUID, INTEGER) TO authenticated, anon;

-- Add comments
COMMENT ON FUNCTION public.get_user_leaderboard_position(UUID) IS 
'Gets a user''s position on the leaderboard based on their best verified score, with one position per unique user';

COMMENT ON FUNCTION public.get_top_unique_verified_scores(INTEGER) IS 
'Gets top verified scores with only one score per user (their best score)';

COMMENT ON FUNCTION public.get_user_score_history(UUID, INTEGER) IS 
'Gets a user''s personal score history with global ranking for each score'; 