/*
  # Fix update_game_statistics function

  1. Function Updates
    - Create or replace the `update_game_statistics` function with correct parameter names
    - Fix the logic for updating best game records
    - Ensure all column references use `current_survival_time` instead of `current_time`
    - Add proper error handling and upsert logic

  2. Security
    - Grant execute permissions to authenticated users
    - Use SECURITY DEFINER for controlled access

  3. Performance
    - Maintain existing indexes for optimal query performance
*/

-- Create or replace the update_game_statistics function with corrected logic
CREATE OR REPLACE FUNCTION public.update_game_statistics(
  user_id UUID,
  games_increment INTEGER DEFAULT 0,
  meteors_increment INTEGER DEFAULT 0,
  survival_increment NUMERIC DEFAULT 0,
  distance_increment NUMERIC DEFAULT 0,
  current_score INTEGER DEFAULT 0,
  current_meteors INTEGER DEFAULT 0,
  current_survival_time NUMERIC DEFAULT 0,
  current_distance NUMERIC DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  -- Update cumulative statistics and best records in a single operation
  UPDATE public.user_profiles
  SET 
    -- Update cumulative totals
    total_games_played = total_games_played + games_increment,
    total_meteors_destroyed = total_meteors_destroyed + meteors_increment,
    total_survival_time = total_survival_time + survival_increment,
    total_distance_traveled = total_distance_traveled + distance_increment,
    
    -- Update personal bests if current game values are better
    best_game_score = GREATEST(best_game_score, current_score),
    best_game_meteors = CASE 
      WHEN current_score > best_game_score THEN current_meteors 
      ELSE GREATEST(best_game_meteors, current_meteors)
    END,
    best_game_time = CASE 
      WHEN current_score > best_game_score THEN current_survival_time 
      ELSE GREATEST(best_game_time, current_survival_time)
    END,
    best_game_distance = CASE 
      WHEN current_score > best_game_score THEN current_distance 
      ELSE GREATEST(best_game_distance, current_distance)
    END,
    
    updated_at = now()
  WHERE id = user_id;
  
  -- If no profile exists, create one with the current game data
  IF NOT FOUND THEN
    INSERT INTO public.user_profiles (
      id,
      total_games_played,
      total_meteors_destroyed,
      total_survival_time,
      total_distance_traveled,
      best_game_score,
      best_game_meteors,
      best_game_time,
      best_game_distance,
      created_at,
      updated_at
    ) VALUES (
      user_id,
      games_increment,
      meteors_increment,
      survival_increment,
      distance_increment,
      current_score,
      current_meteors,
      current_survival_time,
      current_distance,
      now(),
      now()
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_game_statistics(UUID, INTEGER, INTEGER, NUMERIC, NUMERIC, INTEGER, INTEGER, NUMERIC, NUMERIC) TO authenticated;

-- Ensure all necessary indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_best_score ON public.user_profiles(best_game_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_total_meteors ON public.user_profiles(total_meteors_destroyed DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_total_time ON public.user_profiles(total_survival_time DESC);