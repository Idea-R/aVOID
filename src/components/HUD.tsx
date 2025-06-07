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
  powerUpCharges?: number;
  maxPowerUpCharges?: number;
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

export default function HUD({ score, comboInfo, powerUpCharges = 0, maxPowerUpCharges = 3, time, fps, meteors = 0, particles = 0, poolSizes, autoScaling, performance, settings, isGameOver = false, showIntro = false, isPaused = false }: HUDProps) {
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
            
            {/* Power-up Charges Display */}
            {maxPowerUpCharges > 0 && (
              <div className="flex items-center gap-2 bg-yellow-900/30 border border-yellow-500/50 rounded-lg px-3 py-1">
                <span className="text-yellow-300 font-semibold">⚡</span>
                <span className="text-yellow-200">
                  {powerUpCharges}/{maxPowerUpCharges}
                </span>
                {powerUpCharges > 0 && (
                  <span className="text-yellow-400 text-xs animate-pulse">CHARGED!</span>
                )}
              </div>
            )}
            
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
          
          {/* Chain Detonation Status */}
          {/* Note: Chain detonation UI is rendered directly by the ChainDetonationRenderer */}
          
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
              ? `Double-tap to use knockback power ${powerUpCharges > 0 ? `(${powerUpCharges} charges)` : '(collect power-ups)'}`
              : `Double-click to use knockback power ${powerUpCharges > 0 ? `(${powerUpCharges} charges)` : '(collect power-ups)'}`
            }
          </div>
        </div>
      )}

      {/* Top Right Controls - Hide on mobile during active gameplay, always show on desktop or when game is over */}
      {(!isMobile || isGameOver || isPaused) && !showIntro && (
        <div className="absolute top-4 right-4 flex gap-3">
          <button
            onClick={() => setShowHelp(true)}
            className="group bg-gradient-to-br from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white p-3 rounded-xl transition-all duration-300 flex items-center gap-2 text-sm font-semibold shadow-lg hover:shadow-blue-500/25 hover:scale-105 border border-blue-500/20"
            title="Help & Instructions"
          >
            <HelpCircle className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
            <span className="hidden sm:inline">Help</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-700 rounded-xl"></div>
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="group bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 text-white p-3 rounded-xl transition-all duration-300 flex items-center gap-2 text-sm font-semibold shadow-lg hover:shadow-gray-500/25 hover:scale-105 border border-gray-500/20"
            title="Settings"
          >
            <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            <span className="hidden sm:inline">Settings</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-700 rounded-xl"></div>
          </button>

          <button
            onClick={() => setShowLeaderboard(true)}
            className="group bg-gradient-to-br from-yellow-600 to-amber-700 hover:from-yellow-500 hover:to-amber-600 text-white p-3 rounded-xl transition-all duration-300 flex items-center gap-2 text-sm font-semibold shadow-lg hover:shadow-yellow-500/25 hover:scale-105 border border-yellow-500/20"
            title="Leaderboard"
          >
            <Trophy className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
            <span className="hidden sm:inline">Leaderboard</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-700 rounded-xl"></div>
          </button>

          {user ? (
            <button
              onClick={() => setShowProfile(true)}
              className="group bg-gradient-to-br from-cyan-600 to-cyan-800 hover:from-cyan-500 hover:to-cyan-700 text-white p-3 rounded-xl transition-all duration-300 flex items-center gap-2 text-sm font-semibold shadow-lg hover:shadow-cyan-500/25 hover:scale-105 border border-cyan-500/20"
              title="Profile"
            >
              <UserCircle className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
              <span className="hidden sm:inline">
                {user.user_metadata?.display_name || user.email?.split('@')[0] || 'Profile'}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-700 rounded-xl"></div>
            </button>
          ) : (
            <button
              onClick={() => setShowSignup(true)}
              className="group bg-gradient-to-br from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600 text-white p-3 rounded-xl transition-all duration-300 flex items-center gap-2 text-sm font-semibold shadow-lg hover:shadow-green-500/25 hover:scale-105 border border-green-500/20"
              title="Sign Up"
            >
              <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
              <span className="hidden sm:inline">Sign Up</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-700 rounded-xl"></div>
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