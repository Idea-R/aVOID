/*
  # Enhanced User Profile Statistics

  1. New Columns
    - `total_distance_traveled` (numeric) - Total distance traveled across all games
    - `best_game_score` (integer) - Highest score achieved in a single game
    - `best_game_meteors` (integer) - Most meteors destroyed in best scoring game
    - `best_game_time` (numeric) - Survival time in best scoring game
    - `best_game_distance` (numeric) - Distance traveled in best scoring game

  2. Enhanced Function
    - `update_game_statistics` - Updates both cumulative and best game statistics
    - Handles personal bests tracking
    - Includes proper error handling

  3. Performance
    - Added indexes for common queries on best scores and totals
*/

-- Add new columns for enhanced statistics
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS total_distance_traveled numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS best_game_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS best_game_meteors integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS best_game_time numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS best_game_distance numeric DEFAULT 0;

-- Drop the old function if it exists
DROP FUNCTION IF EXISTS public.increment_game_stats(uuid, integer, integer, numeric);

-- Create enhanced game statistics update function
CREATE OR REPLACE FUNCTION public.update_game_statistics(
  user_id UUID,
  games_increment INTEGER DEFAULT 0,
  meteors_increment INTEGER DEFAULT 0,
  survival_increment NUMERIC DEFAULT 0,
  distance_increment NUMERIC DEFAULT 0,
  game_score INTEGER DEFAULT 0,
  game_meteors INTEGER DEFAULT 0,
  game_survival_time NUMERIC DEFAULT 0,
  game_distance NUMERIC DEFAULT 0
)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_game_statistics(UUID, INTEGER, INTEGER, NUMERIC, NUMERIC, INTEGER, INTEGER, NUMERIC, NUMERIC) TO authenticated;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_best_score ON public.user_profiles(best_game_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_total_meteors ON public.user_profiles(total_meteors_destroyed DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_total_time ON public.user_profiles(total_survival_time DESC);