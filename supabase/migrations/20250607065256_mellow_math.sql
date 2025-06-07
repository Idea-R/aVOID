/*
  # Fix current_time reserved keyword issue - CORRECTED LOGIC

  1. Problem Analysis
    - `current_time` is a PostgreSQL reserved keyword causing syntax errors
    - Previous migrations had backwards logic in the existence checks
    - Need to safely rename without breaking existing data

  2. Solution
    - Check if 'current_time' column exists (not 'current_survival_time')
    - If it exists, rename it to 'current_survival_time'
    - If 'current_survival_time' doesn't exist, create it
    - Update all functions to use the new column name

  3. Safety
    - Use proper existence checks
    - Handle both new and existing installations
    - Preserve all existing data
*/

-- Step 1: Fix the column rename with CORRECT logic
DO $$
BEGIN
  -- Check if the problematic 'current_time' column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'current_time'
  ) THEN
    -- Rename the problematic column to the safe name
    ALTER TABLE user_profiles RENAME COLUMN current_time TO current_survival_time;
    RAISE NOTICE 'Renamed current_time column to current_survival_time';
  ELSE
    RAISE NOTICE 'current_time column does not exist, no rename needed';
  END IF;
END $$;

-- Step 2: Ensure current_survival_time column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'current_survival_time'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN current_survival_time NUMERIC DEFAULT 0;
    RAISE NOTICE 'Added current_survival_time column';
  ELSE
    RAISE NOTICE 'current_survival_time column already exists';
  END IF;
END $$;

-- Step 3: Ensure all other required columns exist
DO $$
BEGIN
  -- Add total_distance_traveled if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'total_distance_traveled'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN total_distance_traveled NUMERIC DEFAULT 0;
    RAISE NOTICE 'Added total_distance_traveled column';
  END IF;

  -- Add best_game_score if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'best_game_score'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN best_game_score INTEGER DEFAULT 0;
    RAISE NOTICE 'Added best_game_score column';
  END IF;

  -- Add best_game_meteors if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'best_game_meteors'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN best_game_meteors INTEGER DEFAULT 0;
    RAISE NOTICE 'Added best_game_meteors column';
  END IF;

  -- Add best_game_time if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'best_game_time'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN best_game_time NUMERIC DEFAULT 0;
    RAISE NOTICE 'Added best_game_time column';
  END IF;

  -- Add best_game_distance if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'best_game_distance'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN best_game_distance NUMERIC DEFAULT 0;
    RAISE NOTICE 'Added best_game_distance column';
  END IF;
END $$;

-- Step 4: Create or replace the function with correct column references
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
  -- Update existing profile
  UPDATE public.user_profiles
  SET 
    total_games_played = total_games_played + games_increment,
    total_meteors_destroyed = total_meteors_destroyed + meteors_increment,
    total_survival_time = total_survival_time + survival_increment,
    total_distance_traveled = total_distance_traveled + distance_increment,
    
    -- Update personal bests
    best_game_score = GREATEST(best_game_score, current_score),
    best_game_meteors = GREATEST(best_game_meteors, current_meteors),
    best_game_time = GREATEST(best_game_time, current_survival_time),
    best_game_distance = GREATEST(best_game_distance, current_distance),
    
    updated_at = now()
  WHERE id = user_id;
  
  -- Create profile if user doesn't exist
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

-- Step 5: Grant proper permissions
GRANT EXECUTE ON FUNCTION public.update_game_statistics(UUID, INTEGER, INTEGER, NUMERIC, NUMERIC, INTEGER, INTEGER, NUMERIC, NUMERIC) TO authenticated;

-- Step 6: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_best_score ON public.user_profiles(best_game_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_total_meteors ON public.user_profiles(total_meteors_destroyed DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_total_time ON public.user_profiles(total_survival_time DESC);