import React, { useState, useEffect } from 'react';
import { Trophy, Star, UserPlus, Eye, RotateCcw, Settings, User } from 'lucide-react';
import { LeaderboardAPI } from '../api/leaderboard';
import { useAuthStore } from '../store/authStore';
import SignupModal from './SignupModal';
import LeaderboardModal from './LeaderboardModal';
import AccountModal from './AccountModal';
import SettingsModal from './SettingsModal';
import logoImage from '../assets/Futuristic aVOID with Fiery Meteors.png';

interface GameOverScreenProps {
  score: number;
  onPlayAgain?: () => void;
}

export default function GameOverScreen({ score, onPlayAgain }: GameOverScreenProps) {
  const [playerName, setPlayerName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [verifiedRank, setVerifiedRank] = useState<number | null>(null);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [logoVisible, setLogoVisible] = useState(false);
  
  const { user } = useAuthStore();

  useEffect(() => {
    console.log('GameOverScreen mounted with score:', score);
    
    // Trigger logo animation after a short delay
    const logoTimer = setTimeout(() => {
      setLogoVisible(true);
    }, 300);
    
    const getPlayerRanks = async () => {
      // Get overall rank (including guests)
      const overallRank = await LeaderboardAPI.getPlayerRank(score);
      setPlayerRank(overallRank);
      
      // Get verified-only rank for leaderboard positioning
      const verifiedOnlyRank = await LeaderboardAPI.getVerifiedPlayerRank(score);
      setVerifiedRank(verifiedOnlyRank);
      
      console.log('Player ranks calculated - Overall:', overallRank, 'Verified:', verifiedOnlyRank);
    };
    getPlayerRanks();
    
    return () => {
      clearTimeout(logoTimer);
    };
  }, [score]);

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

  const handlePlayAgain = () => {
    console.log('Play again button clicked');
    if (onPlayAgain) {
      onPlayAgain();
    } else {
      window.location.reload();
    }
  };

  console.log('Rendering GameOverScreen');

  return (
    <>
      <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        {/* Animated Logo */}
        <div 
          className={`absolute top-8 left-1/2 transform -translate-x-1/2 transition-all duration-1000 ease-out ${
            logoVisible 
              ? 'opacity-100 translate-y-0 scale-100' 
              : 'opacity-0 -translate-y-8 scale-95'
          }`}
          style={{
            filter: 'drop-shadow(0 0 20px rgba(6, 182, 212, 0.5)) drop-shadow(0 0 40px rgba(255, 215, 0, 0.3))',
          }}
        >
          <img 
            src={logoImage} 
            alt="aVOID Logo" 
            className="h-24 w-auto object-contain"
            style={{
              animation: logoVisible ? 'logoGlow 3s ease-in-out infinite alternate' : 'none'
            }}
          />
        </div>
        
        <div className="bg-gray-900 p-8 rounded-lg shadow-xl border border-cyan-500 max-w-md w-full mx-4">
          {/* Header with Action Buttons */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Trophy className="w-12 h-12 text-yellow-500" />
              <h2 className="text-2xl font-bold text-cyan-500">Game Over!</h2>
            </div>
            
            {/* Quick Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowSettings(true)}
                className="bg-gray-600 hover:bg-gray-700 text-white p-2 rounded-lg transition-colors duration-200"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>

              {user ? (
                <button
                  onClick={() => setShowAccount(true)}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white p-2 rounded-lg transition-colors duration-200"
                  title="Account"
                >
                  <User className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setShowSignup(true)}
                  className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors duration-200"
                  title="Sign Up"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          
          <div className="text-center mb-6">
            <p className="text-xl mb-2 text-cyan-300">Final Score: {score.toLocaleString()}</p>
            {playerRank && (
              <div className="space-y-2">
                <p className="text-lg text-yellow-400 font-semibold">
                  🎯 You placed #{playerRank} globally!
                </p>
                {!user && verifiedRank && (
                  <p className="text-sm text-cyan-300 bg-cyan-900/30 border border-cyan-500/50 rounded-lg p-3">
                    💎 You would be <span className="font-bold text-yellow-400">#{verifiedRank}</span> on the verified leaderboard!
                    <br />
                    <span className="text-xs text-cyan-400">Sign up to claim your spot!</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {!scoreSaved ? (
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
                  <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4 mb-4">
                    <p className="text-yellow-300 text-sm text-center">
                      <strong>Note:</strong> Guest scores are saved but don't appear on the public leaderboard.
                      <br />
                      Sign up to compete with verified players!
                    </p>
                  </div>

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
                    onClick={() => setShowSignup(true)}
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
          ) : (
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
          )}

          <div className="space-y-3 mt-6">
            <button
              onClick={() => setShowLeaderboard(true)}
              className="w-full bg-transparent border border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black font-bold py-2 px-4 rounded transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              View Verified Leaderboard
            </button>
            
            <button
              onClick={handlePlayAgain}
              className="w-full bg-transparent border border-cyan-500 text-cyan-500 hover:bg-cyan-500 hover:text-black font-bold py-2 px-4 rounded transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Play Again
            </button>
          </div>
        </div>
      </div>

      <SignupModal
        isOpen={showSignup}
        onClose={() => setShowSignup(false)}
        playerScore={score}
        playerName={playerName}
      />

      <LeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        playerScore={score}
      />

      <AccountModal
        isOpen={showAccount}
        onClose={() => setShowAccount(false)}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
}