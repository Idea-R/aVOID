-- SAFE MIGRATION PART 1: Add Functions and Create Backups
-- No destructive operations - safe to run

-- Create backup tables for safety
CREATE TABLE IF NOT EXISTS leaderboard_scores_backup_manual AS 
SELECT * FROM leaderboard_scores;

CREATE TABLE IF NOT EXISTS user_profiles_backup_manual AS 
SELECT * FROM user_profiles;

-- Add missing columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'best_score') THEN
    ALTER TABLE public.user_profiles ADD COLUMN best_score integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'games_played') THEN
    ALTER TABLE public.user_profiles ADD COLUMN games_played integer DEFAULT 0;
  END IF;
END $$;

-- Create all the essential functions
CREATE OR REPLACE FUNCTION public.get_user_leaderboard_position(user_uuid UUID)
RETURNS INTEGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_best_score INTEGER;
  user_position INTEGER;
BEGIN
  SELECT COALESCE(MAX(score), 0) INTO user_best_score
  FROM leaderboard_scores 
  WHERE user_id = user_uuid AND is_verified = true;
  
  IF user_best_score = 0 THEN
    RETURN 0;
  END IF;
  
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_leaderboard_position(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_top_unique_verified_scores(INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_score_history(UUID, INTEGER) TO authenticated, anon;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'SAFE MIGRATION PART 1 COMPLETED!';
  RAISE NOTICE 'Created backups and essential functions. No data was modified.';
END $$; 