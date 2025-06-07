import React, { useEffect, useRef, useState } from 'react';
import Engine from '../game/Engine';
import HUD from './HUD';
import GameOverScreen from './GameOverScreen';
import GameIntro from './GameIntro';
import { ScoreBreakdown, ComboInfo } from '../game/systems/ScoreSystem';
import BoltBadge from './BoltBadge';

interface GameSettings {
  volume: number;
  soundEnabled: boolean;
  showUI: boolean;
  showFPS: boolean;
  showPerformanceStats: boolean;
  showTrails: boolean;
  performanceMode: boolean;
}

interface GameProps {
  autoStart?: boolean;
}

export default function Game({ autoStart = false }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [engineInitialized, setEngineInitialized] = useState(false);
  const [gameState, setGameState] = useState({ 
    score: 0, 
    scoreBreakdown: { survival: 0, meteors: 0, combos: 0, total: 0 } as ScoreBreakdown,
    comboInfo: { count: 0, isActive: false, lastKnockbackTime: 0, highestCombo: 0 } as ComboInfo,
    powerUpCharges: 0,
    maxPowerUpCharges: 3,
    time: 0, 
    isGameOver: false, 
    fps: 0,
    meteors: 0,
    particles: 0,
    poolSizes: { meteors: 0, particles: 0 },
    autoScaling: { enabled: true, shadowsEnabled: true, maxParticles: 300, adaptiveTrailsActive: true },
    performance: { averageFrameTime: 0, memoryUsage: 0, lastScalingEvent: 'none' },
    settings: {
      volume: 0.7,
      soundEnabled: true,
      showUI: true,
      showFPS: true,
      showPerformanceStats: true,
      showTrails: true,
      performanceMode: false
    } as GameSettings
  });

  useEffect(() => {
    if (!canvasRef.current) return;
    
    console.log('Initializing game engine...');
    const engine = new Engine(canvasRef.current);
    engineRef.current = engine;
    setEngineInitialized(true);
    
    engine.onStateUpdate = (state) => {
      console.log('State update received:', state);
      setGameState(state);
    };
    
    // Monitor pause state
    const checkPauseState = () => {
      if (engine) {
        setIsPaused(engine.isPausedState());
      }
    };
    
    const pauseInterval = setInterval(checkPauseState, 100);
    
    // Listen for engine initialization trigger during countdown
    const handleEngineInit = () => {
      if (engineRef.current && !engineRef.current.isStarted()) {
        console.log('🚀 Pre-initializing game engine during countdown');
        // Pre-warm the engine without starting the game loop
        engineRef.current.preWarm();
      }
    };

    window.addEventListener('startEngineInit', handleEngineInit);

    // Listen for auto-performance mode activation
    const handleAutoPerformanceMode = (event: CustomEvent) => {
      console.log('Auto Performance Mode activated:', event.detail);
      // Update local state to reflect the change
      setGameState(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          performanceMode: true
        }
      }));
    };

    window.addEventListener('autoPerformanceModeActivated', handleAutoPerformanceMode as EventListener);

    return () => {
      console.log('Cleaning up game engine...');
      window.removeEventListener('startEngineInit', handleEngineInit);
      window.removeEventListener('autoPerformanceModeActivated', handleAutoPerformanceMode as EventListener);
      clearInterval(pauseInterval);
      engine.stop();
    };
  }, []);

  useEffect(() => {
    if (autoStart && engineRef.current && !engineRef.current.isStarted()) {
      engineRef.current.start();
    }
  }, [autoStart]);

  const handlePlayAgain = () => {
    console.log('Play again clicked');
    if (engineRef.current) {
      engineRef.current.resetGame();
      setGameState(prev => ({ ...prev, isGameOver: false, score: 0, time: 0 }));
      setShowIntro(false); // Skip intro on replay
    }
  };

  const handleIntroComplete = React.useCallback(() => {
    console.log('Intro completed, hiding intro and starting engine');
    setShowIntro(false);
    if (engineRef.current && engineInitialized && !engineRef.current.isStarted()) {
      console.log('Starting engine after intro');
      engineRef.current.start();
    }
  }, [engineInitialized]);

  const handleCanvasClick = () => {
    if (isPaused && engineRef.current) {
      engineRef.current.resume();
    }
  };
  console.log('Rendering Game component, isGameOver:', gameState.isGameOver);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="w-full h-full absolute inset-0"
       style={{ cursor: gameState.isGameOver || isPaused ? 'default' : 'none' }}
       onClick={handleCanvasClick}
      />
      
      {/* Game Intro Overlay */}
      {showIntro && autoStart && engineInitialized && (
        <GameIntro onComplete={handleIntroComplete} />
      )}
      
      {gameState.settings.showUI && (
        <HUD 
          score={gameState.score} 
          comboInfo={gameState.comboInfo}
          powerUpCharges={gameState.powerUpCharges}
          maxPowerUpCharges={gameState.maxPowerUpCharges}
          time={gameState.time} 
          fps={gameState.settings.showFPS ? gameState.fps : 0}
          meteors={gameState.settings.showPerformanceStats ? gameState.meteors : 0}
          particles={gameState.settings.showPerformanceStats ? gameState.particles : 0}
          poolSizes={gameState.settings.showPerformanceStats ? gameState.poolSizes : undefined}
          autoScaling={gameState.autoScaling}
          performance={gameState.performance}
          settings={gameState.settings}
          isGameOver={gameState.isGameOver}
          showIntro={showIntro}
          isPaused={isPaused}
        />
      )}
      {gameState.isGameOver && (
        <GameOverScreen 
          score={gameState.score} 
          scoreBreakdown={gameState.scoreBreakdown}
          comboInfo={gameState.comboInfo}
          onPlayAgain={handlePlayAgain}
        />
      )}
      
      {/* Bolt.new Badge with Defense System */}
      <BoltBadge />
    </>
  );
}