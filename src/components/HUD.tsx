import React, { useState } from 'react';
import { Trophy, User, UserPlus } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import AccountModal from './AccountModal';
import SignupModal from './SignupModal';
import LeaderboardModal from './LeaderboardModal';

interface HUDProps {
  score: number;
  time: number;
  fps: number;
  meteors?: number;
  particles?: number;
  poolSizes?: { meteors: number; particles: number };
  isGameOver?: boolean;
}

export default function HUD({ score, time, fps, meteors = 0, particles = 0, poolSizes, isGameOver = false }: HUDProps) {
  const { user } = useAuthStore();
  const [showAccount, setShowAccount] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

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
      <div className="absolute top-4 left-4 flex flex-col gap-2 text-cyan-500 font-mono text-sm">
        <div className="flex gap-6">
          <div>Score: {score}</div>
          <div>Time: {Math.floor(time)}s</div>
          <div className={`${getFPSColor(fps)}`}>FPS: {fps}</div>
        </div>
        
        <div className="flex gap-6 text-xs opacity-80">
          <div className={getPerformanceColor(meteors, 50)}>
            Meteors: {meteors}/50
          </div>
          <div className={getPerformanceColor(particles, 300)}>
            Particles: {particles}/300
          </div>
          {poolSizes && (
            <div className="text-blue-400">
              Pool: M{poolSizes.meteors} P{poolSizes.particles}
            </div>
          )}
        </div>
        
        {!isGameOver && (
          <div className="text-xs text-yellow-400 opacity-80">
            Double-click to use knockback power when available
          </div>
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
    </>
  );
}