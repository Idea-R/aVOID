/*
  # Fix database migration - Remove current_time reserved keyword

  1. Column Management
    - Safely rename any existing 'current_time' column to 'current_survival_time'
    - Add 'current_survival_time' column if it doesn't exist
    - Ensure all other required columns exist

  2. Function Update
    - Create/replace update_game_statistics function
    - Use only non-reserved parameter names
    - Handle profile creation and updates

  3. Security
    - Function runs with SECURITY DEFINER
    - Proper error handling for missing profiles
*/

-- First, check if the problematic column exists and rename it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'current_survival_time'
  ) THEN
    ALTER TABLE user_profiles RENAME COLUMN current_time TO current_survival_time;
  END IF;
END $$;

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Add current_survival_time column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'current_survival_time'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN current_survival_time NUMERIC DEFAULT 0;
  END IF;

  -- Add total_distance_traveled if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'total_distance_traveled'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN total_distance_traveled NUMERIC DEFAULT 0;
  END IF;

  -- Add best_game_score if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'best_game_score'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN best_game_score INTEGER DEFAULT 0;
  END IF;

  -- Add best_game_meteors if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'best_game_meteors'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN best_game_meteors INTEGER DEFAULT 0;
  END IF;

  -- Add best_game_time if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'best_game_time'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN best_game_time NUMERIC DEFAULT 0;
  END IF;

  -- Add best_game_distance if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'best_game_distance'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN best_game_distance NUMERIC DEFAULT 0;
  END IF;
END $$;

-- Create or replace the update_game_statistics function with safe parameter names
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