// Extracted from GameOverScreen.tsx on January 7, 2025
// Part of Phase 2: Component optimization to stay under 500-line limit

import React, { useState } from 'react';
import { Star, UserPlus } from 'lucide-react';
import { LeaderboardAPI } from '../../api/leaderboard';

interface ScoreSavingProps {
  score: number;
  user: any;
  verifiedRank: number | null;
  onShowSignup: () => void;
}

// Memoized icon components to prevent re-creation
const MemoizedStar = React.memo(Star);
const MemoizedUserPlus = React.memo(UserPlus);

function ScoreSaving({ score, user, verifiedRank, onShowSignup }: ScoreSavingProps) {
  const [playerName, setPlayerName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);

  const handleSaveGuestScore = async () => {
    if (!playerName.trim() || isSaving) return;
    
    setIsSaving(true);
    const result = await LeaderboardAPI.submitGuestScore(playerName.trim(), score);
    
    if (result.success) {
      setScoreSaved(true);
      console.log('Guest score saved successfully:', result.data);
    } else {
      console.error('Failed to save guest score');
    }
    setIsSaving(false);
  };

  const handleSaveVerifiedScore = async () => {
    if (!user || isSaving) return;
    
    setIsSaving(true);
    const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Player';
    const success = await LeaderboardAPI.submitVerifiedScore(displayName, score, user.id);
    
    if (success) {
      setScoreSaved(true);
    }
    setIsSaving(false);
  };

  if (scoreSaved) {
    return (
      <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-4 mb-4">
        <p className="text-green-300 text-center font-semibold">
          ✅ Score saved successfully!
        </p>
        {user && verifiedRank && (
          <p className="text-green-200 text-center text-sm mt-2">
            You're now #{verifiedRank} on the verified leaderboard!
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {user ? (
        // Verified user flow
        <div className="bg-cyan-900/30 border border-cyan-500/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <MemoizedStar className="w-5 h-5 text-cyan-400" />
            <span className="text-cyan-300 font-semibold">Verified Player</span>
          </div>
          <p className="text-sm text-cyan-200 mb-3">
            Save your score as {user.user_metadata?.display_name || user.email?.split('@')[0]}
          </p>
          <button
            onClick={handleSaveVerifiedScore}
            disabled={isSaving}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isSaving ? 'Saving...' : 'Save Verified Score'}
          </button>
        </div>
      ) : (
        // Guest user flow - Removed guest saving, only signup option
        <div className="bg-orange-900/30 border border-orange-500/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <MemoizedUserPlus className="w-5 h-5 text-orange-400" />
            <span className="text-orange-300 font-semibold">Account Required</span>
          </div>
          <p className="text-orange-200 text-sm mb-3">
            To save your score and compete on the leaderboard, you need to create an account.
          </p>
          <button
            onClick={onShowSignup}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-3 px-4 rounded transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            <div className="flex items-center justify-center gap-2">
              <MemoizedUserPlus className="w-5 h-5" />
              <span>Sign Up & Save Score</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

// Export memoized component to prevent unnecessary re-renders
export default React.memo(ScoreSaving);