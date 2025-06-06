import React, { useState } from 'react';
import { Trophy, User, UserPlus, Settings, Flame } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import AccountModal from './AccountModal';
import SignupModal from './SignupModal';
import LeaderboardModal from './LeaderboardModal';
import SettingsModal from './SettingsModal';

interface HUDProps {
  score: number;
  time: number;
  fps: number;
  meteors?: number;
  particles?: number;
  poolSizes?: { meteors: number; particles: number };
  isGameOver?: boolean;
  flameActive?: boolean;
  flameTimeRemaining?: number;
}

export default function HUD({ 
  score, 
  time, 
  fps, 
  meteors = 0, 
  particles = 0, 
  poolSizes, 
  isGameOver = false,
  flameActive = false,
  flameTimeRemaining = 0
}: HUDProps) {
  const { user } = useAuthStore();
  const [showAccount, setShowAccount] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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
      {!isGameOver && (
        <div className="absolute top-4 left-4 flex flex-col gap-2 text-cyan-500 font-mono text-sm">
          <div className="flex gap-6">
            <div>Score: {score}</div>
            <div>Time: {Math.floor(time)}s</div>
            {fps > 0 && <div className={`${getFPSColor(fps)}`}>FPS: {fps}</div>}
          </div>
          
          {(meteors > 0 || particles > 0) && (
            <div className="flex gap-6 text-xs opacity-80">
              {meteors > 0 && (
                <div className={getPerformanceColor(meteors, 50)}>
                  Meteors: {meteors}/50
                </div>
              )}
              {particles > 0 && (
                <div className={getPerformanceColor(particles, 300)}>
                  Particles: {particles}/300
                </div>
              )}
              {poolSizes && (
                <div className="text-blue-400">
                  Pool: M{poolSizes.meteors} P{poolSizes.particles}
                </div>
              )}
            </div>
          )}
          
          <div className="text-xs text-yellow-400 opacity-80">
            Double-click to use knockback power when available
          </div>
        </div>
      )}

      {/* Flame Power-up Timer - Only show when active and not game over */}
      {flameActive && !isGameOver && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-red-900/80 border border-red-500 rounded-lg px-4 py-2 flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-400 animate-pulse" />
            <div className="text-red-300 font-mono font-bold">
              FLAME BOOST: {Math.ceil(flameTimeRemaining)}s
            </div>
            <div className="text-red-200 text-sm">
              2x Score • 1.5x Speed
            </div>
          </div>
        </div>
      )}

      {/* Top Right Controls - Always visible */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={() => setShowSettings(true)}
          className="bg-gray-600 hover:bg-gray-700 text-white p-2 rounded-lg transition-colors duration-200 flex items-center gap-2 text-sm font-semibold"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>

        <button
          onClick={() => setShowLeaderboard(true)}
          className="bg-yellow-600 hover:bg-yellow-700 text-white p-2 rounded-lg transition-colors duration-200 flex items-center gap-2 text-sm font-semibold"
        >
          <Trophy className="w-4 h-4" />
          Leaderboard
        </button>

        {user ? (
          <button
            onClick={() => setShowAccount(true)}
            className="bg-cyan-600 hover:bg-cyan-700 text-white p-2 rounded-lg transition-colors duration-200 flex items-center gap-2 text-sm font-semibold"
          >
            <User className="w-4 h-4" />
            {user.user_metadata?.display_name || user.email?.split('@')[0] || 'Account'}
          </button>
        ) : (
          <button
            onClick={() => setShowSignup(true)}
            className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors duration-200 flex items-center gap-2 text-sm font-semibold"
          >
            <UserPlus className="w-4 h-4" />
            Sign Up
          </button>
        )}
      </div>

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
    </>
  );
}