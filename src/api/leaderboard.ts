import { supabase, LeaderboardScore } from '../lib/supabase';

export class LeaderboardAPI {
  static async getTopScores(limit: number = 10): Promise<LeaderboardScore[]> {
    // Use the new function to get unique top scores (one per user)
    const { data, error } = await supabase.rpc('get_top_unique_verified_scores', {
      limit_count: limit
    });

    if (error) {
      console.error('Error fetching leaderboard:', error);
      // Fallback to original method if new function fails
      return this.getTopScoresAllUsers(limit);
    }

    return data || [];
  }

  static async getTopScoresAllUsers(limit: number = 50): Promise<LeaderboardScore[]> {
    // Original function for getting all scores (multiple per user)
    const { data, error } = await supabase
      .from('leaderboard_scores')
      .select('*')
      .eq('is_verified', true)
      .order('score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching all leaderboard scores:', error);
      return [];
    }

    return data || [];
  }

  static async getPlayerRank(score: number): Promise<number> {
    // Get rank among ALL scores (including guests) for accurate positioning
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

  static async getVerifiedPlayerRank(score: number): Promise<number> {
    // Get rank among only verified scores for leaderboard positioning
    const { count, error } = await supabase
      .from('leaderboard_scores')
      .select('*', { count: 'exact', head: true })
      .eq('is_verified', true)
      .gt('score', score);

    if (error) {
      console.error('Error getting verified player rank:', error);
      return 0;
    }

    return (count || 0) + 1;
  }

  static async submitGuestScore(playerName: string, score: number): Promise<{ success: boolean; data?: any }> {
    const gameSessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('Submitting guest score:', { playerName, score, gameSessionId });
    
    const { data, error } = await supabase
      .from('leaderboard_scores')
      .insert({
        player_name: playerName,
        score,
        is_verified: false,
        user_id: null,
        game_session_id: gameSessionId
      })
      .select();

    if (error) {
      console.error('Error submitting guest score:', error);
      return { success: false };
    }

    console.log('Guest score submitted successfully:', data);
    return { success: true, data: data?.[0] };
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

  static async getUserLeaderboardPosition(userId: string): Promise<number> {
    const { data, error } = await supabase.rpc('get_user_leaderboard_position', {
      user_uuid: userId
    });

    if (error) {
      console.error('Error getting user leaderboard position:', error);
      return 0;
    }

    return data || 0;
  }

  static async getUserScoreHistory(userId: string, limit: number = 5): Promise<any[]> {
    const { data, error } = await supabase.rpc('get_user_score_history', {
      user_uuid: userId,
      limit_count: limit
    });

    if (error) {
      console.error('Error fetching user score history:', error);
      return [];
    }

    return data || [];
  }

  static async getGuestScoresSummary(): Promise<{ total: number; topScore: number }> {
    const { data, error } = await supabase
      .from('leaderboard_scores')
      .select('score')
      .eq('is_verified', false)
      .order('score', { ascending: false });

    if (error) {
      console.error('Error fetching guest scores:', error);
      return { total: 0, topScore: 0 };
    }

    return {
      total: data.length,
      topScore: data.length > 0 ? data[0].score : 0
    };
  }

  static subscribeToLeaderboard(callback: (scores: LeaderboardScore[]) => void) {
    let debounceTimer: NodeJS.Timeout | null = null;
    
    const debouncedCallback = async () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      debounceTimer = setTimeout(async () => {
        const scores = await this.getTopScores();
        callback(scores);
      }, 500); // 500ms debounce to prevent rapid updates
    };

    const subscription = supabase
      .channel('leaderboard_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Only listen for new scores, not all changes
          schema: 'public',
          table: 'leaderboard_scores',
          filter: 'is_verified=eq.true' // Only verified scores affect leaderboard
        },
        debouncedCallback
      )
      .subscribe();

    return subscription;
  }
}