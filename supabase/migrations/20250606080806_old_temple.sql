/*
  # Global Leaderboard System

  1. New Tables
    - `leaderboard_scores`
      - `id` (uuid, primary key)
      - `player_name` (text)
      - `score` (integer)
      - `is_verified` (boolean) - true for registered users
      - `user_id` (uuid, nullable) - links to auth.users for verified players
      - `created_at` (timestamp)
      - `game_session_id` (text) - unique identifier for each game session

  2. Security
    - Enable RLS on `leaderboard_scores` table
    - Add policies for reading all scores and inserting new scores
    - Add policy for users to update their own verified scores

  3. Indexes
    - Index on score for fast leaderboard queries
    - Index on user_id for user score tracking
*/

CREATE TABLE IF NOT EXISTS leaderboard_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  is_verified boolean DEFAULT false,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  game_session_id text NOT NULL,
  CONSTRAINT valid_score CHECK (score >= 0),
  CONSTRAINT valid_name_length CHECK (char_length(player_name) >= 1 AND char_length(player_name) <= 50)
);

ALTER TABLE leaderboard_scores ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read leaderboard scores
CREATE POLICY "Anyone can read leaderboard scores"
  ON leaderboard_scores
  FOR SELECT
  TO public
  USING (true);

-- Allow anyone to insert new scores (for guest players)
CREATE POLICY "Anyone can insert scores"
  ON leaderboard_scores
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow verified users to update their own scores
CREATE POLICY "Users can update own verified scores"
  ON leaderboard_scores
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND is_verified = true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leaderboard_scores_score ON leaderboard_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_scores_user_id ON leaderboard_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_scores_created_at ON leaderboard_scores(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_scores_verified ON leaderboard_scores(is_verified, score DESC);