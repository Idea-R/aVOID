import React, { useState } from 'react';
import { Trophy } from 'lucide-react';

interface GameOverScreenProps {
  score: number;
}

export default function GameOverScreen({ score }: GameOverScreenProps) {
  const [playerName, setPlayerName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!playerName.trim()) return;
    setIsSaving(true);
    
    // TODO: Implement score saving logic here
    
    window.location.reload(); // Restart game after saving
  };

  return (
    <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center">
      <div className="bg-gray-900 p-8 rounded-lg shadow-xl border border-cyan-500 max-w-md w-full mx-4">
        <div className="flex items-center justify-center mb-6">
          <Trophy className="w-12 h-12 text-yellow-500" />
        </div>
        <h2 className="text-2xl font-bold text-center mb-4 text-cyan-500">Game Over!</h2>
        <p className="text-xl text-center mb-6 text-cyan-300">Final Score: {score}</p>
        
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-cyan-500 rounded text-cyan-100 placeholder-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            maxLength={20}
          />
          
          <button
            onClick={handleSave}
            disabled={!playerName.trim() || isSaving}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isSaving ? 'Saving...' : 'Save Score & Play Again'}
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-transparent border border-cyan-500 text-cyan-500 hover:bg-cyan-500 hover:text-black font-bold py-2 px-4 rounded transition-colors duration-200"
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}