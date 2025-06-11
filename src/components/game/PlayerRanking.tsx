import React from 'react';

interface PlayerRankingProps {
  playerRank: number | null;
  verifiedRank: number | null;
  isUser: boolean;
}

function PlayerRanking({ playerRank, verifiedRank, isUser }: PlayerRankingProps) {
  if (!playerRank) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-lg text-yellow-400 font-semibold">
        🎯 You placed #{playerRank} globally!
      </p>
      {!isUser && verifiedRank && (
        <p className="text-sm text-cyan-300 bg-cyan-900/30 border border-cyan-500/50 rounded-lg p-3">
          💎 You would be <span className="font-bold text-yellow-400">#{verifiedRank}</span> on the verified leaderboard!
          <br />
          <span className="text-xs text-cyan-400">Sign up to claim your spot!</span>
        </p>
      )}
    </div>
  );
}

// Export memoized component to prevent unnecessary re-renders
export default React.memo(PlayerRanking);