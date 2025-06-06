import { supabase, LeaderboardScore } from '../lib/supabase';

export class LeaderboardAPI {
  static async getTopScores(limit: number = 10): Promise<LeaderboardScore[]> {
    const { data, error } = await supabase
      .from('leaderboard_scores')
      .select('*')
      .order('score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }

    return data || [];
  }

  static async getPlayerRank(score: number): Promise<number> {
    const { count, error } = await supabase
      .from('leaderboard_scores')
      .select('*', { count: 'exact', head: true })
      .gt('score', score);

    if (error) {
      console.error('Error getting player rank:', error);
      return 0;
    }

    return (count || 0) + 1;
  }

  static async submitGuestScore(playerName: string, score: number): Promise<boolean> {
    const gameSessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const { error } = await supabase
      .from('leaderboard_scores')
      .insert({
        player_name: playerName,
        score,
        is_verified: false,
        user_id: null,
        game_session_id: gameSessionId
      });

    if (error) {
      console.error('Error submitting guest score:', error);
      return false;
    }

    return true;
  }

  static async submitVerifiedScore(playerName: string, score: number, userId: string): Promise<boolean> {
    const gameSessionId = `verified_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const { error } = await supabase
      .from('leaderboard_scores')
      .insert({
        player_name: playerName,
        score,
        is_verified: true,
        user_id: userId,
        game_session_id: gameSessionId
      });

    if (error) {
      console.error('Error submitting verified score:', error);
      return false;
    }

    return true;
  }

  static async getUserBestScore(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('leaderboard_scores')
      .select('score')
      .eq('user_id', userId)
      .eq('is_verified', true)
      .order('score', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return 0;
    }

    return data.score;
  }

  static subscribeToLeaderboard(callback: (scores: LeaderboardScore[]) => void) {
    const subscription = supabase
      .channel('leaderboard_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leaderboard_scores'
        },
        async () => {
          const scores = await this.getTopScores();
          callback(scores);
        }
      )
      .subscribe();

    return subscription;
  }
}