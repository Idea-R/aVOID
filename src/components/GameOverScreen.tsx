import React, { useState, useEffect } from 'react';
import { Trophy, Star, UserPlus, Eye, RotateCcw, Settings, UserCircle, Target, Zap, HelpCircle, Music } from 'lucide-react';
import { LeaderboardAPI } from '../api/leaderboard';
import { useAuthStore } from '../store/authStore';
import { ScoreBreakdown, ComboInfo } from '../game/systems/ScoreSystem';
import SignupModal from './SignupModal';
import LeaderboardModal from './LeaderboardModal';
import AccountModal from './AccountModal';
import SettingsModal from './SettingsModal';
import ProfileModal from './ProfileModal';
import HelpModal from './HelpModal';
import MusicControls from './MusicControls';
import logoImage from '../assets/Futuristic aVOID with Fiery Meteors.png';

interface GameOverScreenProps {
  score: number;
  scoreBreakdown: ScoreBreakdown;
  comboInfo: ComboInfo;
  onPlayAgain?: () => void;
  audioManager?: any;
}

export default function GameOverScreen({ score, scoreBreakdown, comboInfo, onPlayAgain, audioManager }: GameOverScreenProps) {
  const [playerName, setPlayerName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [verifiedRank, setVerifiedRank] = useState<number | null>(null);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [logoVisible, setLogoVisible] = useState(false);
  const [logoEnlarged, setLogoEnlarged] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showMusicControls, setShowMusicControls] = useState(false);
  
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

  const toggleLogoSize = () => {
    setLogoEnlarged(!logoEnlarged);
  };

  console.log('Rendering GameOverScreen');

  return (
    <>
      <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        {/* Animated Logo */}
        <div 
          onClick={toggleLogoSize}
          className={`absolute cursor-pointer transition-all duration-700 ease-out ${
            logoEnlarged 
              ? 'inset-4 z-[60] flex items-center justify-center' 
              : 'top-8 left-1/2 transform -translate-x-1/2 z-50'
          } ${
            logoVisible 
              ? 'opacity-100 translate-y-0 scale-100' 
              : 'opacity-0 -translate-y-8 scale-95'
          }`}
        >
          <div className={`${logoEnlarged ? 'bg-black/95 rounded-2xl p-8' : ''} transition-all duration-700`}>
            <img 
              src={logoImage} 
              alt="aVOID Logo" 
              className={`object-contain border border-cyan-500 rounded-lg p-2 bg-black/20 transition-all duration-700 ${
                logoEnlarged 
                  ? 'h-[60vh] sm:h-[70vh] md:h-[80vh] w-auto max-w-[90vw] shadow-2xl shadow-cyan-500/50' 
                  : 'h-16 sm:h-24 md:h-32 lg:h-48 w-auto'
              }`}
            />
            {logoEnlarged && (
              <div className="text-center mt-6">
                <p className="text-cyan-300 text-sm sm:text-base md:text-lg font-semibold mb-2">Click to close</p>
                <p className="text-cyan-500 text-xs sm:text-sm opacity-80 mb-4">aVOID - Browser Dodge Game</p>
                
                {/* Developer Social Media */}
                <div className="border-t border-cyan-500/30 pt-4 mt-4">
                  <p className="text-cyan-400 text-sm font-medium mb-3">Follow the Developer</p>
                  <div className="flex justify-center gap-4 flex-wrap">
                    <a
                      href="https://twitter.com/Xentrilo"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 hover:text-blue-300 px-3 py-2 rounded-lg transition-all duration-200 text-sm"
                    >
                      <span>🐦</span>
                      <span>@Xentrilo</span>
                    </a>
                    <a
                      href="https://twitch.tv/MadXent"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 hover:text-purple-300 px-3 py-2 rounded-lg transition-all duration-200 text-sm"
                    >
                      <span>📺</span>
                      <span>MadXent</span>
                    </a>
                    <a
                      href="https://github.com/Idea-R"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-gray-600/20 hover:bg-gray-600/40 text-gray-400 hover:text-gray-300 px-3 py-2 rounded-lg transition-all duration-200 text-sm"
                    >
                      <span>💻</span>
                      <span>Idea-R</span>
                    </a>
                  </div>
                  <p className="text-cyan-500/60 text-xs mt-3">Made with ❤️ by MadXent</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className={`bg-gray-900 p-8 rounded-lg shadow-xl border border-cyan-500 max-w-md w-full mx-4 transition-all duration-700 ${
          logoEnlarged ? 'opacity-20 pointer-events-none' : 'opacity-100'
        }`}>
          {/* Header with Action Buttons */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Trophy className="w-12 h-12 text-yellow-500" />
              <h2 className="text-2xl font-bold text-cyan-500">Game Over!</h2>
            </div>
            
            {/* Quick Action Buttons */}
            <div className="flex gap-2">
              {/* Music Controls Button */}
              {audioManager && (
                <button
                  onClick={() => setShowMusicControls(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg transition-colors duration-200"
                  title="Music Controls"
                >
                  <Music className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => setShowHelp(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors duration-200"
                title="Help & Instructions"
              >
                <HelpCircle className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowSettings(true)}
                className="bg-gray-600 hover:bg-gray-700 text-white p-2 rounded-lg transition-colors duration-200"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>

              {user ? (
                <button
                  onClick={() => setShowProfile(true)}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white p-2 rounded-lg transition-colors duration-200"
                  title="Profile"
                >
                  <UserCircle className="w-4 h-4" />
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
            <div className="mb-4">
              <p className="text-2xl mb-2 text-cyan-300 font-bold">Final Score: {score.toLocaleString()}</p>
              
              {/* Score Breakdown */}
              <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                <h4 className="text-lg font-semibold text-cyan-300 mb-3 flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Score Breakdown
                </h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Target className="w-4 h-4 text-blue-400" />
                      <span className="text-blue-300">Survival</span>
                    </div>
                    <p className="text-white font-semibold">{scoreBreakdown.survival.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Zap className="w-4 h-4 text-orange-400" />
                      <span className="text-orange-300">Meteors</span>
                    </div>
                    <p className="text-white font-semibold">{scoreBreakdown.meteors.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Star className="w-4 h-4 text-green-400" />
                      <span className="text-green-300">Combos</span>
                    </div>
                    <p className="text-white font-semibold">{scoreBreakdown.combos.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              {/* Combo Achievement */}
              {comboInfo.highestCombo > 0 && (
                <div className="bg-gradient-to-r from-green-900/30 to-yellow-900/30 border border-green-500/50 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400" />
                    <span className="text-green-300 font-semibold">
                      Highest Combo: {comboInfo.highestCombo}x
                    </span>
                    <Star className="w-5 h-5 text-yellow-400" />
                  </div>
                  {comboInfo.highestCombo >= 7 && (
                    <p className="text-yellow-300 text-sm text-center mt-1">🔥 INCREDIBLE COMBO MASTER! 🔥</p>
                  )}
                  {comboInfo.highestCombo >= 5 && comboInfo.highestCombo < 7 && (
                    <p className="text-green-300 text-sm text-center mt-1">⚡ Great combo skills! ⚡</p>
                  )}
                </div>
              )}
            </div>
            
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

      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
      />

      <HelpModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />

      {/* Music Controls Modal */}
      {audioManager && (
        <MusicControls 
          audioManager={audioManager} 
          isVisible={showMusicControls}
          onClose={() => setShowMusicControls(false)}
        />
      )}
    </>
  );
}