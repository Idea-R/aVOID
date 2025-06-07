/*
  # Fix current_time column name conflict

  1. Column Rename
    - Rename `current_time` to `current_survival_time` in user_profiles table
    - Update any existing data references
    
  2. Function Updates
    - Update the update_game_statistics function to use the new column name
    - Ensure all parameter mappings are correct
    
  3. Notes
    - `current_time` is a reserved PostgreSQL keyword
    - This migration fixes the naming conflict
*/

-- First, check if the problematic column exists and rename it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'current_time'
  ) THEN
    ALTER TABLE user_profiles RENAME COLUMN current_time TO current_survival_time;
  END IF;
END $$;

-- Add the column if it doesn't exist at all
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'current_survival_time'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN current_survival_time NUMERIC DEFAULT 0;
  END IF;
END $$;

-- Create or replace the update_game_statistics function with correct parameter names
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
  -- Update user profile statistics
  UPDATE user_profiles 
  SET 
    total_games_played = total_games_played + games_increment,
    total_meteors_destroyed = total_meteors_destroyed + meteors_increment,
    total_survival_time = total_survival_time + survival_increment,
    total_distance_traveled = total_distance_traveled + distance_increment,
    
    -- Update best game records if current game is better
    best_game_score = GREATEST(best_game_score, current_score),
    best_game_meteors = GREATEST(best_game_meteors, current_meteors),
    best_game_time = GREATEST(best_game_time, current_survival_time),
    best_game_distance = GREATEST(best_game_distance, current_distance),
    
    updated_at = now()
  WHERE id = user_id;
  
  -- Create profile if it doesn't exist
  IF NOT FOUND THEN
    INSERT INTO user_profiles (
      id,
      total_games_played,
      total_meteors_destroyed,
      total_survival_time,
      total_distance_traveled,
      best_game_score,
      best_game_meteors,
      best_game_time,
      best_game_distance
    ) VALUES (
      user_id,
      games_increment,
      meteors_increment,
      survival_increment,
      distance_increment,
      current_score,
      current_meteors,
      current_survival_time,
      current_distance
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;