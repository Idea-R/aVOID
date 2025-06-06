import React, { useEffect, useRef, useState } from 'react';
import Engine from '../game/Engine';
import HUD from './HUD';
import GameOverScreen from './GameOverScreen';

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [gameState, setGameState] = useState({ 
    score: 0, 
    time: 0, 
    isGameOver: false, 
    fps: 0,
    meteors: 0,
    particles: 0,
    poolSizes: { meteors: 0, particles: 0 }
  });

  useEffect(() => {
    if (!canvasRef.current) return;
    
    console.log('Initializing game engine...');
    const engine = new Engine(canvasRef.current);
    engineRef.current = engine;
    
    engine.onStateUpdate = (state) => {
      console.log('State update received:', state);
      setGameState(state);
    };
    
    engine.start();
    console.log('Game engine started');

    return () => {
      console.log('Cleaning up game engine...');
      engine.stop();
    };
  }, []);

  const handlePlayAgain = () => {
    console.log('Play again clicked');
    if (engineRef.current) {
      engineRef.current.resetGame();
      setGameState(prev => ({ ...prev, isGameOver: false, score: 0, time: 0 }));
    }
  };

  console.log('Rendering Game component, isGameOver:', gameState.isGameOver);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="w-full h-full absolute inset-0"
        style={{ cursor: gameState.isGameOver ? 'default' : 'none' }}
      />
      <HUD 
        score={gameState.score} 
        time={gameState.time} 
        fps={gameState.fps}
        meteors={gameState.meteors}
        particles={gameState.particles}
        poolSizes={gameState.poolSizes}
        isGameOver={gameState.isGameOver}
      />
      {gameState.isGameOver && (
        <GameOverScreen 
          score={gameState.score} 
          onPlayAgain={handlePlayAgain}
        />
      )}
    </>
  );
}