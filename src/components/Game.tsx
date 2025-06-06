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
    if (!canvasRef.current) {
      console.error('Canvas ref is null!');
      return;
    }
    
    console.log('Initializing game engine...');
    console.log('Canvas element:', canvasRef.current);
    console.log('Canvas dimensions:', canvasRef.current.offsetWidth, 'x', canvasRef.current.offsetHeight);
    
    try {
      const engine = new Engine(canvasRef.current);
      engineRef.current = engine;
      
      engine.onStateUpdate = (state) => {
        console.log('State update received:', state);
        setGameState(state);
      };
      
      engine.start();
      console.log('Game engine started successfully');
      
      // Force initial state update
      setTimeout(() => {
        console.log('Forcing initial state update...');
        setGameState(prev => ({ ...prev, fps: 60 }));
      }, 100);
      
    } catch (error) {
      console.error('Error initializing game engine:', error);
    }

    return () => {
      console.log('Cleaning up game engine...');
      if (engineRef.current) {
        engineRef.current.stop();
      }
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
    <div className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full absolute inset-0 bg-black"
        style={{ 
          cursor: gameState.isGameOver ? 'default' : 'none',
          display: 'block'
        }}
        width={window.innerWidth}
        height={window.innerHeight}
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
    </div>
  );
}