// Extracted from GameOverScreen.tsx on January 7, 2025
// Part of Phase 2: Component optimization to stay under 500-line limit
// Updated: Simplified for compact modal design

import React from 'react';
import { Star } from 'lucide-react';
import { ScoreBreakdown, ComboInfo } from '../../game/systems/ScoreSystem';

interface ScoreDisplayProps {
  score: number;
  scoreBreakdown: ScoreBreakdown;
  comboInfo: ComboInfo;
}

// Memoized icon components to prevent re-creation
const MemoizedStar = React.memo(Star);

function ScoreDisplay({ score, comboInfo }: ScoreDisplayProps) {
  return (
    <div className="text-center mb-4">
      {/* Main Score */}
      <div className="mb-3">
        <p className="text-3xl sm:text-4xl font-bold text-cyan-300 mb-1">
          {score.toLocaleString()}
        </p>
        <p className="text-sm text-gray-400">Final Score</p>
      </div>
      
      {/* Combo Achievement - Only if significant */}
      {comboInfo.highestCombo >= 3 && (
        <div className="bg-gradient-to-r from-green-900/30 to-yellow-900/30 border border-green-500/50 rounded-lg p-2 mb-3">
          <div className="flex items-center justify-center gap-2">
            <MemoizedStar className="w-4 h-4 text-yellow-400" />
            <span className="text-green-300 font-semibold text-sm">
              Best Combo: {comboInfo.highestCombo}x
            </span>
            <MemoizedStar className="w-4 h-4 text-yellow-400" />
          </div>
          {comboInfo.highestCombo >= 7 && (
            <p className="text-yellow-300 text-xs text-center mt-1">🔥 COMBO MASTER! 🔥</p>
          )}
          {comboInfo.highestCombo >= 5 && comboInfo.highestCombo < 7 && (
            <p className="text-green-300 text-xs text-center mt-1">⚡ Great combos! ⚡</p>
          )}
        </div>
      )}
    </div>
  );
}

// Export memoized component to prevent unnecessary re-renders
export default React.memo(ScoreDisplay);