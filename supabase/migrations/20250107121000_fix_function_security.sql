/*
  # Fix Function Security Issues
  
  This migration fixes the "Function Search Path Mutable" security warnings
  by setting explicit search_path for all functions to prevent SQL injection.
  
  Reference: https://supabase.com/docs/guides/database/functions#security-definer-functions
*/

-- Fix create_user_profile function
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER 
SET search_path = public, auth
AS $$
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

-- Fix backfill_missing_profiles function
CREATE OR REPLACE FUNCTION public.backfill_missing_profiles()
RETURNS INTEGER 
SET search_path = public, auth
AS $$
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

-- Fix update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER 
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix update_game_statistics function (if it exists)
-- Note: This function may be from an old migration, but we'll recreate it safely
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
RETURNS VOID 
SET search_path = public
AS $$
BEGIN
  -- Update cumulative statistics
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

-- Add comments to document the security fixes
COMMENT ON FUNCTION public.create_user_profile() IS 
'Secure function with explicit search_path to prevent SQL injection';

COMMENT ON FUNCTION public.backfill_missing_profiles() IS 
'Secure function with explicit search_path to prevent SQL injection';

COMMENT ON FUNCTION public.update_updated_at() IS 
'Secure function with explicit search_path to prevent SQL injection';

COMMENT ON FUNCTION public.update_game_statistics(UUID, INTEGER, INTEGER, NUMERIC, NUMERIC, INTEGER, INTEGER, NUMERIC, NUMERIC) IS 
'Secure function with explicit search_path to prevent SQL injection'; 