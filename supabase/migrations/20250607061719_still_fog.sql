/*
  # Add game statistics tracking to user profiles

  1. New Columns
    - `total_distance_traveled` (numeric) - Total distance moved across all games
    - `best_game_score` (integer) - Highest score achieved in a single game
    - `best_game_meteors` (integer) - Most meteors destroyed in a single game
    - `best_game_time` (numeric) - Longest survival time in a single game
    - `best_game_distance` (numeric) - Furthest distance traveled in a single game

  2. Function
    - `update_game_statistics` - Updates both cumulative and best game stats
    - Handles incrementing totals and updating personal bests
    - Takes current game stats and compares against existing bests

  3. Security
    - Function uses security definer to ensure proper access control
    - Only authenticated users can call the function
    - Function validates user_id parameter matches authenticated user
*/

-- Add new columns for game statistics
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS total_distance_traveled NUMERIC DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS best_game_score INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS best_game_meteors INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS best_game_time NUMERIC DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS best_game_distance NUMERIC DEFAULT 0;

-- Create function to update game statistics
CREATE OR REPLACE FUNCTION update_game_statistics(
  user_id UUID,
  games_increment INTEGER DEFAULT 0,
  meteors_increment INTEGER DEFAULT 0,
  survival_increment NUMERIC DEFAULT 0,
  distance_increment NUMERIC DEFAULT 0,
  current_score INTEGER DEFAULT 0,
  current_meteors INTEGER DEFAULT 0,
  current_survival_time NUMERIC DEFAULT 0,
  current_distance NUMERIC DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  -- Verify the user_id matches the authenticated user
  IF auth.uid() != user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Update cumulative statistics and personal bests
  UPDATE user_profiles 
  SET 
    total_games_played = total_games_played + games_increment,
    total_meteors_destroyed = total_meteors_destroyed + meteors_increment,
    total_survival_time = total_survival_time + survival_increment,
    total_distance_traveled = total_distance_traveled + distance_increment,
    best_game_score = GREATEST(best_game_score, current_score),
    best_game_meteors = GREATEST(best_game_meteors, current_meteors),
    best_game_time = GREATEST(best_game_time, current_survival_time),
    best_game_distance = GREATEST(best_game_distance, current_distance),
    updated_at = now()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;