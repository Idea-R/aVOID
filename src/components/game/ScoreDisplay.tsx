// Extracted from GameOverScreen.tsx on January 7, 2025
// Part of Phase 2: Component optimization to stay under 500-line limit

import React from 'react';
import { Trophy, Target, Zap, Star } from 'lucide-react';
import { ScoreBreakdown, ComboInfo } from '../../game/systems/ScoreSystem';

interface ScoreDisplayProps {
  score: number;
  scoreBreakdown: ScoreBreakdown;
  comboInfo: ComboInfo;
}

// Memoized icon components to prevent re-creation
const MemoizedTrophy = React.memo(Trophy);
const MemoizedTarget = React.memo(Target);
const MemoizedZap = React.memo(Zap);
const MemoizedStar = React.memo(Star);

function ScoreDisplay({ score, scoreBreakdown, comboInfo }: ScoreDisplayProps) {
  return (
    <div className="text-center mb-6">
      <div className="mb-4">
        <p className="text-2xl mb-2 text-cyan-300 font-bold">Final Score: {score.toLocaleString()}</p>
        
        {/* Score Breakdown */}
        <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
          <h4 className="text-lg font-semibold text-cyan-300 mb-3 flex items-center gap-2">
            <MemoizedTrophy className="w-5 h-5" />
            Score Breakdown
          </h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <MemoizedTarget className="w-4 h-4 text-blue-400" />
                <span className="text-blue-300">Survival</span>
              </div>
              <p className="text-white font-semibold">{scoreBreakdown.survival.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <MemoizedZap className="w-4 h-4 text-orange-400" />
                <span className="text-orange-300">Meteors</span>
              </div>
              <p className="text-white font-semibold">{scoreBreakdown.meteors.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <MemoizedStar className="w-4 h-4 text-green-400" />
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
              <MemoizedStar className="w-5 h-5 text-yellow-400" />
              <span className="text-green-300 font-semibold">
                Highest Combo: {comboInfo.highestCombo}x
              </span>
              <MemoizedStar className="w-5 h-5 text-yellow-400" />
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
    </div>
  );
}

// Export memoized component to prevent unnecessary re-renders
export default React.memo(ScoreDisplay);