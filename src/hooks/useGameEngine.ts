import { useEffect, useRef, useState } from 'react';
import { GameEngine, GameConfig, GameState } from '../game/core/GameEngine';

export interface UseGameEngineOptions extends Partial<GameConfig> {
  autoStart?: boolean;
}

export function useGameEngine(canvas: HTMLCanvasElement | null, options: UseGameEngineOptions = {}) {
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    time: 0,
    isGameOver: false,
    isPaused: false,
    fps: 0,
    meteors: 0,
    particles: 0
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize engine when canvas is available
  useEffect(() => {
    if (!canvas) return;

    const config: GameConfig = {
      canvas,
      maxMeteors: options.maxMeteors,
      maxParticles: options.maxParticles,
      enablePerformanceMode: options.enablePerformanceMode,
      audioEnabled: options.audioEnabled
    };

    engineRef.current = new GameEngine(config);
    setIsInitialized(true);

    if (options.autoStart) {
      engineRef.current.start();
    }

    // Set up state updates
    const updateInterval = setInterval(() => {
      if (engineRef.current) {
        setGameState(engineRef.current.getGameState());
      }
    }, 100); // Update every 100ms

    return () => {
      clearInterval(updateInterval);
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
      setIsInitialized(false);
    };
  }, [canvas, options.autoStart, options.maxMeteors, options.maxParticles, options.enablePerformanceMode, options.audioEnabled]);

  const start = () => {
    engineRef.current?.start();
  };

  const pause = () => {
    engineRef.current?.pause();
  };

  const resume = () => {
    engineRef.current?.resume();
  };

  const stop = () => {
    engineRef.current?.stop();
  };

  const reset = () => {
    if (engineRef.current) {
      engineRef.current.stop();
      // Reset game state
      setGameState({
        score: 0,
        time: 0,
        isGameOver: false,
        isPaused: false,
        fps: 0,
        meteors: 0,
        particles: 0
      });
    }
  };

  return {
    engine: engineRef.current,
    gameState,
    isInitialized,
    start,
    pause,
    resume,
    stop,
    reset
  };
}