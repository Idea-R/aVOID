import React, { useEffect, useRef, useState } from 'react';
import Engine from '../game/Engine';
import HUD from './HUD';
import GameOverScreen from './GameOverScreen';

interface GameSettings {
  volume: number;
  soundEnabled: boolean;
  showUI: boolean;
  showFPS: boolean;
  showPerformanceStats: boolean;
  showTrails: boolean;
}

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
    poolSizes: { meteors: 0, particles: 0 },
    autoScaling: { enabled: true, shadowsEnabled: true, maxParticles: 300 },
    performance: { averageFrameTime: 0, memoryUsage: 0, lastScalingEvent: 'none' },
    settings: {
      volume: 0.7,
      soundEnabled: true,
      showUI: true,
      showFPS: true,
      showPerformanceStats: true,
      showTrails: true
    } as GameSettings
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
      {gameState.settings.showUI && (
        <HUD 
          score={gameState.score} 
          time={gameState.time} 
          fps={gameState.settings.showFPS ? gameState.fps : 0}
          meteors={gameState.settings.showPerformanceStats ? gameState.meteors : 0}
          particles={gameState.settings.showPerformanceStats ? gameState.particles : 0}
          poolSizes={gameState.settings.showPerformanceStats ? gameState.poolSizes : undefined}
          autoScaling={gameState.autoScaling}
          performance={gameState.performance}
          isGameOver={gameState.isGameOver}
        />
      )}
      {gameState.isGameOver && (
        <GameOverScreen 
          score={gameState.score} 
          onPlayAgain={handlePlayAgain}
        />
      )}
    </>
  );
}