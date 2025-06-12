import React, { useState, useEffect } from 'react';
import { Trophy, Users } from 'lucide-react';
import { LeaderboardAPI } from '../../api/leaderboard';

interface PlayerRankingProps {
  score: number;
  isUser: boolean;
}

// Memoized icon components to prevent re-creation
const MemoizedTrophy = React.memo(Trophy);
const MemoizedUsers = React.memo(Users);

function PlayerRanking({ score, isUser }: PlayerRankingProps) {
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [verifiedRank, setVerifiedRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getPlayerRanks = async () => {
      setLoading(true);
      try {
        // Get overall rank (including guests)
        const overallRank = await LeaderboardAPI.getPlayerRank(score);
        setPlayerRank(overallRank);
        
        // Get verified-only rank for leaderboard positioning
        const verifiedOnlyRank = await LeaderboardAPI.getVerifiedPlayerRank(score);
        setVerifiedRank(verifiedOnlyRank);
        
        console.log('Player ranks calculated - Overall:', overallRank, 'Verified:', verifiedOnlyRank);
      } catch (error) {
        console.error('Error calculating player ranks:', error);
      } finally {
        setLoading(false);
      }
    };

    if (score > 0) {
      getPlayerRanks();
    }
  }, [score]);

  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-3 sm:p-4 mb-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-3 sm:p-4 mb-4">
      <div className="space-y-2">
        {/* Overall Ranking */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MemoizedUsers className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300 text-sm">Overall Rank:</span>
          </div>
          <span className="text-cyan-400 font-semibold text-sm">
            {playerRank ? `#${playerRank}` : 'Calculating...'}
          </span>
        </div>

        {/* Verified Ranking */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MemoizedTrophy className="w-4 h-4 text-yellow-500" />
            <span className="text-gray-300 text-sm">Verified Rank:</span>
          </div>
          <span className="text-yellow-400 font-semibold text-sm">
            {verifiedRank ? `#${verifiedRank}` : 'Calculating...'}
          </span>
        </div>

        {/* User Status Indicator */}
        {isUser ? (
          <div className="text-center pt-2 border-t border-gray-600">
            <span className="text-green-400 text-xs font-medium">✓ Verified Player</span>
          </div>
        ) : (
          <div className="text-center pt-2 border-t border-gray-600">
            <span className="text-orange-400 text-xs">Create account to save verified rank</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(PlayerRanking);