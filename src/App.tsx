import React, { useState, useEffect } from 'react';
import Game from './components/Game';
import { useAuthStore } from './store/authStore';

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
    
    // Auto-start the game after a brief moment
    const autoStartTimer = setTimeout(() => {
      setGameStarted(true);
      
      // Track auto-start engagement
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'auto_start_triggered', {
          event_category: 'engagement',
          event_label: 'game_auto_started'
        });
      }
    }, 500); // Small delay to ensure smooth loading
    
    return () => clearTimeout(autoStartTimer);
  }, [initialize]);

  const handleManualStart = () => {
    setGameStarted(true);
    
    // Track manual start
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'manual_start_clicked', {
        event_category: 'engagement',
        event_label: 'start_button_clicked'
      });
    }
  };

  return (
    <div className="min-h-screen bg-black text-cyan-500 flex items-center justify-center relative overflow-hidden">
      <Game autoStart={gameStarted} />
      
      {/* Fallback manual start button */}
      {!gameStarted && (
        <button
          onClick={handleManualStart}
          className="absolute top-4 left-4 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200 z-50 opacity-80 hover:opacity-100"
        >
          Start Game
        </button>
      )}
    </div>
  );
}

export default App;