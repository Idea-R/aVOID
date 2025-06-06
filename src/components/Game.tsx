import React, { useEffect, useRef, useState } from 'react';
import Engine from '../game/Engine';
import HUD from './HUD';
import GameOverScreen from './GameOverScreen';
import { PerformanceMetrics } from '../game/utils/PerformanceMonitor';

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState({ 
    score: 0, 
    time: 0, 
    isGameOver: false, 
    fps: 0,
    meteors: 0,
    particles: 0,
    poolSizes: { meteors: 0, particles: 0 },
    performance: {
      fps: 60,
      frameTime: 16.67,
      renderTime: 0,
      updateTime: 0,
      meteorCount: 0,
      particleCount: 0,
      qualityLevel: 1.0
    } as PerformanceMetrics
  });

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const engine = new Engine(canvasRef.current);
    engine.onStateUpdate = (state) => setGameState(state);
    engine.start();

    return () => engine.stop();
  }, []);

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
        performance={gameState.performance}
      />
      {gameState.isGameOver && (
        <GameOverScreen score={gameState.score} />
      )}
    </>
  );
}