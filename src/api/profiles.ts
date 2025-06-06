import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  username: string;
  bio?: string;
  cursor_color: string;
  social_links: {
    twitter?: string;
    instagram?: string;
    youtube?: string;
    twitch?: string;
    github?: string;
  };
  is_public: boolean;
  total_games_played: number;
  total_meteors_destroyed: number;
  total_survival_time: number;
  total_distance_traveled: number;
  best_game_score: number;
  best_game_meteors: number;
  best_game_time: number;
  best_game_distance: number;
  created_at: string;
  updated_at: string;
}

export class ProfileAPI {
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  }

  static async getPublicProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .eq('is_public', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching public profile:', error);
      return null;
    }

    return data;
  }

  static async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<boolean> {
    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      console.error('Error updating profile:', error);
      return false;
    }

    return true;
  }

  static async updateGameStats(userId: string, stats: {
    gamesPlayed?: number;
    meteorsDestroyed?: number;
    survivalTime?: number;
    distanceTraveled?: number;
    gameScore?: number;
    gameMeteors?: number;
    gameSurvivalTime?: number;
    gameDistance?: number;
  }): Promise<boolean> {
    const { error } = await supabase.rpc('update_game_statistics', {
      user_id: userId,
      games_increment: stats.gamesPlayed || 0,
      meteors_increment: stats.meteorsDestroyed || 0,
      survival_increment: stats.survivalTime || 0,
      distance_increment: stats.distanceTraveled || 0,
      game_score: stats.gameScore || 0,
      game_meteors: stats.gameMeteors || 0,
      game_survival_time: stats.gameSurvivalTime || 0,
      game_distance: stats.gameDistance || 0
    });

    if (error) {
      console.error('Error updating game stats:', error);
      return false;
    }

    return true;
  }

  static async searchProfiles(query: string, limit: number = 10): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('is_public', true)
      .ilike('username', `%${query}%`)
      .limit(limit);

    if (error) {
      console.error('Error searching profiles:', error);
      return [];
    }

    return data || [];
  }

  static validateSocialLink(platform: string, handle: string): { isValid: boolean; url?: string; error?: string } {
    if (!handle.trim()) {
      return { isValid: true }; // Empty is valid (will be removed)
    }

    // Remove @ symbol if present
    const cleanHandle = handle.replace(/^@/, '');

    // Validate handle format (alphanumeric, underscores, hyphens)
    const handleRegex = /^[a-zA-Z0-9_-]+$/;
    if (!handleRegex.test(cleanHandle)) {
      return { isValid: false, error: 'Handle can only contain letters, numbers, underscores, and hyphens' };
    }

    // Generate URL based on platform
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/${cleanHandle}`,
      instagram: `https://instagram.com/${cleanHandle}`,
      youtube: `https://youtube.com/@${cleanHandle}`,
      twitch: `https://twitch.tv/${cleanHandle}`,
      github: `https://github.com/${cleanHandle}`
    };

    const url = urls[platform];
    if (!url) {
      return { isValid: false, error: 'Unsupported platform' };
    }

    return { isValid: true, url };
  }
}