import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import GameEngine from '../game/core/GameEngine';
import HUD from './HUD';
import GameOverScreen from './GameOverScreen';
import GameIntro from './GameIntro';
import { ScoreBreakdown, ComboInfo } from '../game/systems/ScoreSystem';
import BoltBadge from './BoltBadge';
import MusicControls from './MusicControls';
import { RenderProfiler } from '../react-performance-monitor';

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
  const engineRef = useRef<GameEngine | null>(null);
  const [showIntro, setShowIntro] = useState(false);
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
      volume: 0.5,
      soundEnabled: true,
      showUI: true,
      showFPS: true,
      showPerformanceStats: true,
      showTrails: true,
      performanceMode: false
    } as GameSettings
  });

  // Direct state update - throttling now handled at engine level
  const handleStateUpdate = useCallback((state: any) => {
    setGameState(state);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    console.log('[GAME] Initializing game engine...');
    const engine = new GameEngine(canvasRef.current);
    engineRef.current = engine;
    setEngineInitialized(true);
    console.log('[GAME] Game engine initialized');
    
    // Use direct state update - throttling now handled at engine level
    engine.onStateUpdate = handleStateUpdate;
    
    // Reduce pause state polling frequency
    const checkPauseState = () => {
      if (engine) {
        const isPausedNow = engine.isPausedState();
        setIsPaused(prevPaused => {
          // Only update if state actually changed
          return prevPaused !== isPausedNow ? isPausedNow : prevPaused;
        });
      }
    };
    
    // Poll pause state less frequently (500ms instead of 100ms)
    const pauseInterval = setInterval(checkPauseState, 500);
    
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
      
      // Enable performance mode through engine - let engine handle state updates via throttling
      if (engineRef.current) {
        engineRef.current.setPerformanceMode(true);
        // Removed direct setGameState() call - engine will handle via throttled updates
        // Removed manual gameSettingsChanged dispatch - engine handles internally
      }
    };

    // Listen for settings changes and validate engine sync
    const handleSettingsChange = (event: CustomEvent) => {
      if (engineRef.current && event.detail.performanceMode !== undefined) {
        // Ensure engine state matches UI settings
        const currentEngineState = engineRef.current.getSettings().performanceMode;
        if (currentEngineState !== event.detail.performanceMode) {
          console.log(`🔧 [Game] Syncing engine performance mode: ${event.detail.performanceMode}`);
          engineRef.current.setPerformanceMode(event.detail.performanceMode);
        }
      }
    };

    window.addEventListener('autoPerformanceModeActivated', handleAutoPerformanceMode as EventListener);
    window.addEventListener('gameSettingsChanged', handleSettingsChange as EventListener);

    return () => {
      console.log('Cleaning up game engine...');
      window.removeEventListener('startEngineInit', handleEngineInit);
      window.removeEventListener('autoPerformanceModeActivated', handleAutoPerformanceMode as EventListener);
      window.removeEventListener('gameSettingsChanged', handleSettingsChange as EventListener);
      clearInterval(pauseInterval);
      engine.stop();
    };
  }, [handleStateUpdate]);

  useEffect(() => {
    if (autoStart && engineRef.current && !engineRef.current.isStarted()) {
      engineRef.current.start();
    }
  }, [autoStart]);

  const handlePlayAgain = useCallback(() => {
    console.log('Play again clicked');
    if (engineRef.current) {
      engineRef.current.resetGame();
      setGameState(prev => ({ ...prev, isGameOver: false, score: 0, time: 0 }));
      setShowIntro(false); // Skip intro on replay
    }
  }, []);

  const handleIntroComplete = useCallback(() => {
    console.log('Intro completed, hiding intro and starting engine');
    setShowIntro(false);
    if (engineRef.current && engineInitialized && !engineRef.current.isStarted()) {
      console.log('Starting engine after intro');
      engineRef.current.start();
    }
  }, [engineInitialized]);

  const handleCanvasClick = useCallback(() => {
    if (isPaused && engineRef.current) {
      engineRef.current.resume();
    }
  }, [isPaused]);

  // Memoize audio manager to prevent unnecessary re-creation
  const audioManager = useMemo(() => {
    return engineRef.current?.getAudioManager();
  }, [engineInitialized]);

  // Memoize canvas style to prevent re-creation
  const canvasStyle = useMemo(() => ({
    cursor: gameState.isGameOver || isPaused ? 'default' : 'none',
    touchAction: 'none' as const,
    userSelect: 'none' as const
  }), [gameState.isGameOver, isPaused]);

  // Memoize HUD props with minimal dependencies to prevent re-renders
  const hudProps = useMemo(() => ({
    score: gameState.score,
    comboInfo: gameState.comboInfo,
    powerUpCharges: gameState.powerUpCharges,
    maxPowerUpCharges: gameState.maxPowerUpCharges,
    time: gameState.time,
    fps: gameState.settings.showFPS ? gameState.fps : 0,
    meteors: gameState.settings.showPerformanceStats ? gameState.meteors : 0,
    particles: gameState.settings.showPerformanceStats ? gameState.particles : 0,
    poolSizes: gameState.settings.showPerformanceStats ? gameState.poolSizes : undefined,
    autoScaling: gameState.autoScaling,
    performance: gameState.performance,
    settings: gameState.settings,
    isGameOver: gameState.isGameOver,
    showIntro: showIntro,
    isPaused: isPaused,
    audioManager: audioManager
  }), [
    // Only core UI state that actually needs immediate updates
    gameState.score,
    gameState.isGameOver,
    gameState.powerUpCharges,
    gameState.settings.performanceMode, // Only performance mode from settings
    showIntro,
    isPaused,
    audioManager
  ]);

  // Memoize GameOverScreen props to prevent unnecessary re-renders
  const gameOverProps = useMemo(() => ({
    score: gameState.score,
    scoreBreakdown: gameState.scoreBreakdown,
    comboInfo: gameState.comboInfo,
    onPlayAgain: handlePlayAgain,
    audioManager: audioManager
  }), [
    gameState.score,
    gameState.scoreBreakdown,
    gameState.comboInfo,
    handlePlayAgain,
    audioManager
  ]);

  console.log('Rendering Game component, isGameOver:', gameState.isGameOver);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="w-full h-full absolute inset-0"
        style={canvasStyle}
        onClick={handleCanvasClick}
      />
      
      {/* Game Intro Overlay */}
      {showIntro && autoStart && engineInitialized && (
        <RenderProfiler id="GameIntro">
          <GameIntro onComplete={handleIntroComplete} />
        </RenderProfiler>
      )}
      
      {gameState.settings.showUI && (
        <RenderProfiler id="HUD">
          <HUD {...hudProps} />
        </RenderProfiler>
      )}
      {gameState.isGameOver && (
        <RenderProfiler id="GameOverScreen">
          <GameOverScreen {...gameOverProps} />
        </RenderProfiler>
      )}
      
      {/* Bolt.new Badge with Defense System */}
      <RenderProfiler id="BoltBadge">
        <BoltBadge />
      </RenderProfiler>
    </>
  );
}