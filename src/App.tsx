import React, { useState, useEffect } from 'react';
import Game from './components/Game';
import StartScreen from './components/StartScreen';
import { useAuthStore } from './store/authStore';

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <div className="min-h-screen bg-black text-cyan-500 flex items-center justify-center relative overflow-hidden">
      {!isPlaying ? (
        <StartScreen onStart={() => setIsPlaying(true)} />
      ) : (
        <Game />
      )}
    </div>
  );
}

export default App;