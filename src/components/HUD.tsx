import React, { useState } from 'react';
import { Trophy, User, UserPlus, Settings, UserCircle, HelpCircle, Star } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { ComboInfo } from '../game/systems/ScoreSystem';
import AccountModal from './AccountModal';
import SignupModal from './SignupModal';
import LeaderboardModal from './LeaderboardModal';
import SettingsModal from './SettingsModal';
import ProfileModal from './ProfileModal';
import HelpModal from './HelpModal';

interface HUDProps {
  score: number;
  comboInfo?: ComboInfo;
  time: number;
  fps: number;
  meteors?: number;
  particles?: number;
  poolSizes?: { meteors: number; particles: number };
  autoScaling?: { enabled: boolean; shadowsEnabled: boolean; maxParticles: number; adaptiveTrailsActive?: boolean };
  performance?: { averageFrameTime: number; memoryUsage: number; lastScalingEvent: string };
  settings?: { performanceMode?: boolean };
  isGameOver?: boolean;
  showIntro?: boolean;
  isPaused?: boolean;
}

export default function HUD({ score, comboInfo, time, fps, meteors = 0, particles = 0, poolSizes, autoScaling, performance, settings, isGameOver = false, showIntro = false, isPaused = false }: HUDProps) {
  const { user } = useAuthStore();
  const [showAccount, setShowAccount] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  // Mobile detection - screen width < 768px (md breakpoint)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Update mobile state on window resize
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getFPSColor = (fps: number) => {
    if (fps >= 55) return 'text-green-400';
    if (fps >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getPerformanceColor = (current: number, max: number) => {
    const ratio = current / max;
    if (ratio < 0.5) return 'text-green-400';
    if (ratio < 0.8) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <>
      {/* Game Stats - Only show during active gameplay */}
      {!isGameOver && !showIntro && !isPaused && (
        <div className="absolute top-4 left-4 flex flex-col gap-2 text-cyan-500 font-mono text-sm">
          <div className="flex gap-6 items-center">
            <div className="text-lg font-semibold">Score: {score.toLocaleString()}</div>
            <div>Time: {Math.floor(time)}s</div>
            {fps > 0 && <div className={`${getFPSColor(fps)}`}>FPS: {fps}</div>}
          </div>
          
          {/* Active Combo Display */}
          {comboInfo && comboInfo.isActive && comboInfo.count >= 2 && (
            <div className="bg-green-900/50 border border-green-500/50 rounded-lg px-3 py-1 animate-pulse">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="text-green-300 font-bold">
                  {comboInfo.count}x COMBO ACTIVE!
                </span>
                <Star className="w-4 h-4 text-yellow-400" />
              </div>
            </div>
          )}
          
          {(meteors > 0 || particles > 0) && (
            <div className="flex gap-6 text-xs opacity-80">
              {meteors > 0 && (
                <div className={getPerformanceColor(meteors, 50)}>
                  Meteors: {meteors}/50
                </div>
              )}
              {particles > 0 && (
                <div className={getPerformanceColor(particles, autoScaling?.maxParticles || 300)}>
                  Particles: {particles}/{autoScaling?.maxParticles || 300}
                </div>
              )}
              {poolSizes && (
                <div className="text-blue-400">
                  Pool: M{poolSizes.meteors} P{poolSizes.particles}
                </div>
              )}
              {autoScaling && (
                <div className="text-purple-400">
                  Quality: {autoScaling.shadowsEnabled ? 'High' : 'Low'} | Trails: {autoScaling.adaptiveTrailsActive ? 'On' : 'Off'}
                  {settings?.performanceMode && <span className="text-orange-400"> | Performance Mode</span>}
                </div>
              )}
              {performance && performance.averageFrameTime > 0 && (
                <div className="text-orange-400">
                  Frame: {performance.averageFrameTime.toFixed(1)}ms
                </div>
              )}
            </div>
          )}
          
          {/* Show appropriate control instructions based on device */}
          <div className="text-xs text-yellow-400 opacity-80">
            {isMobile 
              ? "Double-tap to use knockback power when available"
              : "Double-click to use knockback power when available"
            }
          </div>
        </div>
      )}

      {/* Top Right Controls - Hide on mobile during active gameplay, always show on desktop or when game is over */}
      {(!isMobile || isGameOver || isPaused) && !showIntro && (
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={() => setShowHelp(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors duration-200 flex items-center gap-2 text-sm font-semibold"
            title="Help & Instructions"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Help</span>
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="bg-gray-600 hover:bg-gray-700 text-white p-2 rounded-lg transition-colors duration-200 flex items-center gap-2 text-sm font-semibold"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          <button
            onClick={() => setShowLeaderboard(true)}
            className="bg-yellow-600 hover:bg-yellow-700 text-white p-2 rounded-lg transition-colors duration-200 flex items-center gap-2 text-sm font-semibold"
          >
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Leaderboard</span>
          </button>

          {user ? (
            <button
              onClick={() => setShowProfile(true)}
              className="bg-cyan-600 hover:bg-cyan-700 text-white p-2 rounded-lg transition-colors duration-200 flex items-center gap-2 text-sm font-semibold"
            >
              <UserCircle className="w-4 h-4" />
              <span className="hidden sm:inline">
                {user.user_metadata?.display_name || user.email?.split('@')[0] || 'Profile'}
              </span>
            </button>
          ) : (
            <button
              onClick={() => setShowSignup(true)}
              className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors duration-200 flex items-center gap-2 text-sm font-semibold"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Up</span>
            </button>
          )}
        </div>
      )}

      {/* Mobile-specific notification when buttons are hidden */}
      {isMobile && !isGameOver && !showIntro && !isPaused && (
        <div className="absolute top-4 right-4 bg-black/50 text-cyan-300 px-3 py-1 rounded-lg text-xs border border-cyan-500/30">
          Menu available after game
        </div>
      )}

      <AccountModal
        isOpen={showAccount}
        onClose={() => setShowAccount(false)}
      />

      <SignupModal
        isOpen={showSignup}
        onClose={() => setShowSignup(false)}
        playerScore={score}
        playerName=""
      />

      <LeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
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
    </>
  );
}