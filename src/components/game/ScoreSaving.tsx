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

export default function ScoreSaving({ score, user, verifiedRank, onShowSignup }: ScoreSavingProps) {
  const [playerName, setPlayerName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);

  const handleSaveGuestScore = async () => {
    if (!playerName.trim() || isSaving) return;
    
    setIsSaving(true);
    const success = await LeaderboardAPI.submitGuestScore(playerName.trim(), score);
    
    if (success) {
      setScoreSaved(true);
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
            <Star className="w-5 h-5 text-cyan-400" />
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
        // Guest user flow
        <>
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-cyan-500 rounded text-cyan-100 placeholder-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            maxLength={20}
          />
          
          <button
            onClick={handleSaveGuestScore}
            disabled={!playerName.trim() || isSaving}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isSaving ? 'Saving...' : 'Save as Guest'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">or</span>
            </div>
          </div>

          <button
            onClick={onShowSignup}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-3 px-4 rounded transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            <div className="flex items-center justify-center gap-2">
              <UserPlus className="w-5 h-5" />
              <span>Sign up to compete on leaderboard!</span>
            </div>
          </button>
        </>
      )}
    </div>
  );
}