/*
  # Cleanup Duplicate Verified Scores
  
  This migration:
  1. Removes duplicate verified scores from the same users (keeps only best score per user)
  2. Ensures proper analytics tracking for existing users
  3. Backfills missing user profile statistics
*/

-- Step 1: Create backup table for safety
CREATE TABLE IF NOT EXISTS leaderboard_scores_backup AS 
SELECT * FROM leaderboard_scores;

-- Step 2: Remove duplicate verified scores, keeping only the best score per user
WITH user_best_scores AS (
  SELECT 
    user_id,
    MAX(score) as best_score,
    MIN(created_at) as earliest_date -- Keep the earliest occurrence of the best score
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
  ORDER BY ls.user_id, ls.created_at ASC -- Keep the earliest record
)
DELETE FROM leaderboard_scores
WHERE is_verified = true 
  AND user_id IS NOT NULL 
  AND id NOT IN (SELECT id FROM scores_to_keep);

-- Step 3: Backfill user profile statistics for existing users who might not have proper stats
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

-- Step 4: Create function to remove duplicate scores automatically in the future
CREATE OR REPLACE FUNCTION public.prevent_duplicate_verified_scores()
RETURNS TRIGGER 
SET search_path = public
AS $$
DECLARE
  existing_score INTEGER;
BEGIN
  -- Only check for verified scores with user_id
  IF NEW.is_verified = true AND NEW.user_id IS NOT NULL THEN
    -- Check if user already has a verified score
    SELECT score INTO existing_score
    FROM leaderboard_scores 
    WHERE user_id = NEW.user_id AND is_verified = true
    LIMIT 1;
    
    -- If they do, only allow if new score is better
    IF existing_score IS NOT NULL THEN
      IF NEW.score <= existing_score THEN
        -- Prevent insertion of lower or equal score
        RAISE EXCEPTION 'User already has a verified score of % (attempted: %)', existing_score, NEW.score;
      ELSE
        -- Remove the old score since new one is better
        DELETE FROM leaderboard_scores 
        WHERE user_id = NEW.user_id AND is_verified = true AND score = existing_score;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create trigger to prevent future duplicates (optional - uncomment if you want strict enforcement)
-- DROP TRIGGER IF EXISTS prevent_duplicate_verified_scores_trigger ON leaderboard_scores;
-- CREATE TRIGGER prevent_duplicate_verified_scores_trigger
--   BEFORE INSERT ON leaderboard_scores
--   FOR EACH ROW
--   EXECUTE FUNCTION prevent_duplicate_verified_scores();

-- Step 6: Add a function to clean up duplicates manually if needed
CREATE OR REPLACE FUNCTION public.cleanup_duplicate_verified_scores()
RETURNS INTEGER 
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.cleanup_duplicate_verified_scores() TO authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_duplicate_verified_scores() TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.cleanup_duplicate_verified_scores() IS 
'Manually clean up duplicate verified scores, keeping only the best score per user';

COMMENT ON FUNCTION public.prevent_duplicate_verified_scores() IS 
'Trigger function to prevent duplicate verified scores (keeps only best score per user)';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Duplicate score cleanup completed. Backup table: leaderboard_scores_backup';
END $$; 