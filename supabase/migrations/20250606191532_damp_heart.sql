/*
  # Add game statistics increment function

  1. Functions
    - `increment_game_stats` - Safely increment user game statistics
*/

CREATE OR REPLACE FUNCTION increment_game_stats(
  user_id uuid,
  games_increment integer DEFAULT 0,
  meteors_increment integer DEFAULT 0,
  survival_increment numeric DEFAULT 0
)
RETURNS void AS $$
BEGIN
  UPDATE user_profiles
  SET 
    total_games_played = total_games_played + games_increment,
    total_meteors_destroyed = total_meteors_destroyed + meteors_increment,
    total_survival_time = total_survival_time + survival_increment,
    updated_at = now()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;