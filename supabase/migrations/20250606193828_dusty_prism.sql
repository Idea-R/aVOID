/*
  # Fix User Profile Auto-Creation System

  This migration sets up the proper PostgreSQL functions and triggers to automatically
  create user_profiles entries when users sign up through Supabase Auth.

  1. Functions
     - `create_user_profile()` - Creates profile when new user signs up
     - `increment_game_stats()` - Updates game statistics for users
     - `backfill_missing_profiles()` - Creates profiles for existing users without them

  2. Triggers
     - `on_auth_user_created` - Automatically creates profile on user signup

  3. Security
     - Proper RLS policies for profile access
     - Error handling and logging

  4. Backfill
     - Creates profiles for any existing authenticated users
*/

-- Drop existing functions if they exist to ensure clean setup
DROP FUNCTION IF EXISTS public.create_user_profile() CASCADE;
DROP FUNCTION IF EXISTS public.increment_game_stats(uuid, integer, integer, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.backfill_missing_profiles() CASCADE;

-- Function to create user profile automatically
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  default_username TEXT;
BEGIN
  -- Generate default username from email or use 'Player' as fallback
  default_username := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    split_part(NEW.email, '@', 1),
    'Player'
  );
  
  -- Ensure username is not empty and has reasonable length
  IF default_username = '' OR LENGTH(default_username) < 1 THEN
    default_username := 'Player';
  END IF;
  
  -- Truncate username if too long
  IF LENGTH(default_username) > 30 THEN
    default_username := LEFT(default_username, 30);
  END IF;

  -- Insert new user profile with error handling
  BEGIN
    INSERT INTO public.user_profiles (
      id,
      username,
      bio,
      cursor_color,
      social_links,
      is_public,
      total_games_played,
      total_meteors_destroyed,
      total_survival_time,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      default_username,
      NULL,
      '#06b6d4',
      '{}',
      true,
      0,
      0,
      0,
      now(),
      now()
    );
    
    -- Log successful profile creation
    RAISE LOG 'Successfully created user profile for user ID: %', NEW.id;
    
  EXCEPTION
    WHEN unique_violation THEN
      -- Handle case where profile already exists
      RAISE LOG 'User profile already exists for user ID: %', NEW.id;
    WHEN OTHERS THEN
      -- Log any other errors but don't fail the user creation
      RAISE LOG 'Error creating user profile for user ID: %. Error: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment game statistics
CREATE OR REPLACE FUNCTION public.increment_game_stats(
  user_id UUID,
  games_increment INTEGER DEFAULT 0,
  meteors_increment INTEGER DEFAULT 0,
  survival_increment NUMERIC DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  -- Update user profile statistics
  UPDATE public.user_profiles
  SET 
    total_games_played = total_games_played + games_increment,
    total_meteors_destroyed = total_meteors_destroyed + meteors_increment,
    total_survival_time = total_survival_time + survival_increment,
    updated_at = now()
  WHERE id = user_id;
  
  -- Check if update affected any rows
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found for user ID: %', user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to backfill missing profiles for existing users
CREATE OR REPLACE FUNCTION public.backfill_missing_profiles()
RETURNS INTEGER AS $$
DECLARE
  user_record RECORD;
  profiles_created INTEGER := 0;
  default_username TEXT;
BEGIN
  -- Loop through all authenticated users who don't have profiles
  FOR user_record IN 
    SELECT au.id, au.email, au.raw_user_meta_data, au.created_at
    FROM auth.users au
    LEFT JOIN public.user_profiles up ON au.id = up.id
    WHERE up.id IS NULL
      AND au.email_confirmed_at IS NOT NULL
  LOOP
    -- Generate default username
    default_username := COALESCE(
      user_record.raw_user_meta_data->>'display_name',
      split_part(user_record.email, '@', 1),
      'Player'
    );
    
    -- Ensure username is valid
    IF default_username = '' OR LENGTH(default_username) < 1 THEN
      default_username := 'Player';
    END IF;
    
    -- Truncate if too long
    IF LENGTH(default_username) > 30 THEN
      default_username := LEFT(default_username, 30);
    END IF;

    -- Create the missing profile
    BEGIN
      INSERT INTO public.user_profiles (
        id,
        username,
        bio,
        cursor_color,
        social_links,
        is_public,
        total_games_played,
        total_meteors_destroyed,
        total_survival_time,
        created_at,
        updated_at
      ) VALUES (
        user_record.id,
        default_username,
        NULL,
        '#06b6d4',
        '{}',
        true,
        0,
        0,
        0,
        user_record.created_at,
        now()
      );
      
      profiles_created := profiles_created + 1;
      RAISE LOG 'Backfilled profile for user ID: %', user_record.id;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'Error backfilling profile for user ID: %. Error: %', user_record.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE LOG 'Backfill completed. Created % profiles.', profiles_created;
  RETURN profiles_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to automatically create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_profile();

-- Ensure the update_updated_at function exists for the user_profiles trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger for updating updated_at exists
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Run backfill for existing users
SELECT public.backfill_missing_profiles();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.create_user_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_game_stats(UUID, INTEGER, INTEGER, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_missing_profiles() TO service_role;

-- Ensure RLS policies are properly set up for user_profiles
-- (These should already exist based on your schema, but ensuring they're correct)

-- Policy for users to read their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Users can manage own profile'
  ) THEN
    CREATE POLICY "Users can manage own profile"
      ON public.user_profiles
      FOR ALL
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Policy for reading public profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Anyone can read public profiles'
  ) THEN
    CREATE POLICY "Anyone can read public profiles"
      ON public.user_profiles
      FOR SELECT
      TO public
      USING (is_public = true);
  END IF;
END $$;

-- Verify the setup by checking if profiles exist for all confirmed users
DO $$
DECLARE
  missing_profiles INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_profiles
  FROM auth.users au
  LEFT JOIN public.user_profiles up ON au.id = up.id
  WHERE up.id IS NULL
    AND au.email_confirmed_at IS NOT NULL;
    
  IF missing_profiles > 0 THEN
    RAISE WARNING 'Still have % users without profiles after backfill', missing_profiles;
  ELSE
    RAISE LOG 'All confirmed users now have profiles';
  END IF;
END $$;