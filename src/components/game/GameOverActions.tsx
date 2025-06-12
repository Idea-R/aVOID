import React, { useState, useCallback, useEffect } from 'react';
import { Eye, RotateCcw, Settings, UserCircle, UserPlus, HelpCircle, Music, Star, Users } from 'lucide-react';
import { LeaderboardAPI } from '../../api/leaderboard';

interface GameOverActionsProps {
  user: any;
  score: number;
  onPlayAgain: () => void;
  onModalOpen: (modalType: string) => void;
  audioManager?: any;
}

// Memoized icon components to prevent re-creation
const MemoizedEye = React.memo(Eye);
const MemoizedRotateCcw = React.memo(RotateCcw);
const MemoizedSettings = React.memo(Settings);
const MemoizedUserCircle = React.memo(UserCircle);
const MemoizedUserPlus = React.memo(UserPlus);
const MemoizedHelpCircle = React.memo(HelpCircle);
const MemoizedMusic = React.memo(Music);
const MemoizedStar = React.memo(Star);
const MemoizedUsers = React.memo(Users);

function GameOverActions({ user, score, onPlayAgain, onModalOpen, audioManager }: GameOverActionsProps) {
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [rankLoading, setRankLoading] = useState(false);

  // Store score in sessionStorage for guest-to-user conversion
  React.useEffect(() => {
    if (score > 0) {
      sessionStorage.setItem('pendingScore', score.toString());
      sessionStorage.setItem('pendingScoreTimestamp', Date.now().toString());
    }
  }, [score]);

  // Get overall rank for guests only
  useEffect(() => {
    if (!user && score > 0) {
      const getPlayerRank = async () => {
        setRankLoading(true);
        try {
          const overallRank = await LeaderboardAPI.getPlayerRank(score);
          setPlayerRank(overallRank);
        } catch (error) {
          console.error('Error calculating player rank:', error);
        } finally {
          setRankLoading(false);
        }
      };
      getPlayerRank();
    }
  }, [user, score]);

  const handleSignupClick = useCallback(() => {
    onModalOpen('signup');
  }, [onModalOpen]);

  const handleSignInClick = useCallback(() => {
    onModalOpen('signup');
  }, [onModalOpen]);

  const handleLeaderboardClick = useCallback(() => {
    onModalOpen('leaderboard');
  }, [onModalOpen]);

  const handleSettingsClick = useCallback(() => {
    onModalOpen('settings');
  }, [onModalOpen]);

  const handleProfileClick = useCallback(() => {
    onModalOpen('profile');
  }, [onModalOpen]);

  const handleHelpClick = useCallback(() => {
    onModalOpen('help');
  }, [onModalOpen]);

  const handleMusicClick = useCallback(() => {
    onModalOpen('music');
  }, [onModalOpen]);

  return (
    <div className="space-y-3">
      {/* Score Action Section for Guests */}
      {!user && (
        <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-500/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <MemoizedStar className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-300 font-semibold text-sm">Save Your Score</span>
          </div>
          
          {/* Rank Display for Guests */}
          {rankLoading ? (
            <div className="flex items-center gap-2 mb-2">
              <MemoizedUsers className="w-3 h-3 text-gray-400" />
              <span className="text-gray-400 text-xs">Calculating rank...</span>
            </div>
          ) : playerRank && (
            <div className="flex items-center gap-2 mb-2">
              <MemoizedUsers className="w-3 h-3 text-gray-400" />
              <span className="text-gray-300 text-xs">
                You placed <span className="text-cyan-400 font-semibold">#{playerRank}</span> overall
              </span>
            </div>
          )}
          
          <p className="text-cyan-200 text-xs mb-3">
            Create an account to save your score of {score.toLocaleString()} points and compete on the verified leaderboard!
          </p>
          <button
            onClick={handleSignupClick}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-2 px-3 rounded transition-all duration-200 transform hover:scale-105 shadow-lg text-sm"
          >
            <div className="flex items-center justify-center gap-2">
              <MemoizedUserPlus className="w-4 h-4" />
              <span>Sign Up & Save Score</span>
            </div>
          </button>
        </div>
      )}

      {/* Top Action Bar - Settings and Sign In/Profile */}
      <div className="flex gap-2">
        {/* Settings and Help */}
        <div className="flex gap-2 flex-1">
          {audioManager && (
            <button
              onClick={handleMusicClick}
              className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg transition-colors duration-200 flex items-center justify-center"
              title="Music Controls"
            >
              <MemoizedMusic className="w-4 h-4" />
            </button>
          )}
          
          <button
            onClick={handleHelpClick}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors duration-200 flex items-center justify-center"
            title="Help & Instructions"
          >
            <MemoizedHelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={handleSettingsClick}
            className="bg-gray-600 hover:bg-gray-700 text-white p-2 rounded-lg transition-colors duration-200 flex items-center justify-center"
            title="Settings"
          >
            <MemoizedSettings className="w-4 h-4" />
          </button>
        </div>

        {/* Sign In or Profile Button */}
        {user ? (
          <button
            onClick={handleProfileClick}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
            title="Profile"
          >
            <MemoizedUserCircle className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">Profile</span>
          </button>
        ) : (
          <button
            onClick={handleSignInClick}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
            title="Sign In"
          >
            <MemoizedUserPlus className="w-4 h-4" />
            <span className="text-sm">Sign In</span>
          </button>
        )}
      </div>

      {/* Main Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={handleLeaderboardClick}
          className="w-full bg-transparent border border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black font-bold py-2 px-4 rounded transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
        >
          <MemoizedEye className="w-4 h-4" />
          View Leaderboard
        </button>
        
        <button
          onClick={onPlayAgain}
          className="w-full bg-transparent border border-cyan-500 text-cyan-500 hover:bg-cyan-500 hover:text-black font-bold py-2 px-4 rounded transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
        >
          <MemoizedRotateCcw className="w-4 h-4" />
          Play Again
        </button>
      </div>
    </div>
  );
}

export default React.memo(GameOverActions); 