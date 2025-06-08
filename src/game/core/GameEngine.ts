// Refactored from Engine.ts on January 7, 2025
// Original Engine.ts: 887 lines -> Reduced to modular architecture under 400 lines

import { GameLoop } from './GameLoop';
import { PerformanceManager } from './PerformanceManager';
import { SystemManager } from './SystemManager';
import { InputSystem } from '../systems/InputSystem';
import { GameState, GameStateData } from '../state/GameState';
import { ScoreBreakdown, ComboInfo } from '../systems/ScoreSystem';
import { GameSettings, GameStats } from '../GameLogic';

/**
 * GameEngine coordinates all game systems through a modular architecture.
 * Refactored from the original 887-line Engine.ts to maintain separation of concerns.
 */
export default class GameEngine {
  private canvas: HTMLCanvasElement;
  
  // Core system managers - initialized in constructor
  private gameLoop!: GameLoop;
  private performanceManager!: PerformanceManager;
  private systemManager!: SystemManager;
  private inputSystem!: InputSystem;
  private gameState!: GameState;
  
  // State callbacks
  onStateUpdate: (state: GameStateData) => void = () => {};

  constructor(canvas: HTMLCanvasElement) {
    console.log('[ENGINE] GameEngine constructor called');
    this.canvas = canvas;
    
    this.initializeSystems();
    this.setupEventHandlers();
    
    console.log('[ENGINE] GameEngine initialized successfully');
  }
  
  /**
   * Initialize all modular systems
   */
  private initializeSystems(): void {
    // Initialize system manager first (handles core engine and audio)
    this.systemManager = new SystemManager(this.canvas);
    
    // Initialize game loop
    this.gameLoop = new GameLoop();
    
    // Initialize performance manager
    this.performanceManager = new PerformanceManager();
    
    // Initialize input system with required dependencies
    const engineCore = this.systemManager.getEngineCore();
    this.inputSystem = new InputSystem(
      this.canvas,
      engineCore.getInputHandler(),
      engineCore.getCollisionSystem(),
      engineCore.getParticleSystem(),
      engineCore.getPowerUpManager(),
      engineCore.getGameLogic(),
      engineCore.getMeteorPool()
    );
    
    // Initialize game state manager
    this.gameState = new GameState();
    
    console.log('[ENGINE] All systems initialized');
  }
  
  /**
   * Setup event handlers and system callbacks
   */
  private setupEventHandlers(): void {
    // Setup game loop callbacks
    this.gameLoop.setCallbacks(
      this.update.bind(this),
      this.render.bind(this),
      this.updateFPS.bind(this)
    );
    
    // Setup performance manager callbacks
    this.performanceManager.setCallbacks(
      this.handleAutoScalingChange.bind(this),
      this.handlePerformanceModeChange.bind(this)
    );
    
    // Setup game state callbacks
    this.gameState.setCallbacks(
      (state: GameStateData) => this.onStateUpdate(state),
      this.handleGameOver.bind(this),
      this.handleStatsUpdate.bind(this)
    );
    
    // Setup system manager event handlers
    this.systemManager.setEventHandlers({
      onSettingsChange: this.handleSettingsChange.bind(this),
      onDefenseEffect: this.handleDefenseEffect.bind(this),
      onChainDetonationComplete: this.handleChainDetonationComplete.bind(this),
      onKnockbackActivation: this.handleKnockbackActivation.bind(this)
    });
    
    // Setup game logic callbacks
    const gameLogic = this.systemManager.getEngineCore().getGameLogic();
    gameLogic.onGameOver = this.gameState.handleGameOver.bind(this.gameState);
    gameLogic.onStatsUpdate = this.gameState.handleStatsUpdate.bind(this.gameState);
  }
  
  /**
   * Main update loop
   */
  private update(deltaTime: number): void {
    if (this.gameLoop.isPausedState()) return;
    
    // Update all systems
    this.systemManager.update(deltaTime);
    this.inputSystem.update(deltaTime);
    
    // Always update state during normal gameplay
    this.triggerStateUpdate();
  }
  
  /**
   * Main render loop
   */
  private render(): void {
    if (this.gameLoop.isPausedState()) {
      this.renderPauseOverlay();
      return;
    }
    
    // Render all systems
    this.systemManager.render();
  }
  
  /**
   * Update FPS and performance tracking
   */
  private updateFPS(timestamp: number): void {
    const engineCore = this.systemManager.getEngineCore();
    const performanceSettings = engineCore.getPerformanceSettings();
    const gameSettings = engineCore.getSettings();
    
    this.performanceManager.updateFPS(
      timestamp,
      performanceSettings,
      engineCore.getGameLogic().getMeteorCount(),
      engineCore.getParticleSystem().getParticleCount(),
      gameSettings.autoPerformanceModeEnabled || false
    );
  }
  
  /**
   * Render pause overlay
   */
  private renderPauseOverlay(): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Pause text
    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    ctx.fillText('GAME PAUSED', centerX, centerY - 30);
    
    // Subtitle
    ctx.fillStyle = '#67e8f9';
    ctx.font = '24px Arial';
    ctx.fillText('Click here to resume', centerX, centerY + 30);
    
    // Add glow effect
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#06b6d4';
    ctx.fillText('GAME PAUSED', centerX, centerY - 30);
    ctx.shadowBlur = 0;
  }
  
  /**
   * Event Handlers
   */
  private handleSettingsChange = (event: Event) => {
    const customEvent = event as CustomEvent;
    const newSettings = customEvent.detail;
    this.systemManager.getEngineCore().updateSettings(newSettings);
  };
  
  private handleDefenseEffect = (event: Event) => {
    // Defense effects are handled by DefenseSystem
  };
  
  private handleChainDetonationComplete = (event: Event) => {
    const customEvent = event as CustomEvent;
    console.log('🔗💥 Chain Detonation Complete!', customEvent.detail);
    
    if (!customEvent.detail) {
      console.warn('🔗⚠️ Chain detonation event missing detail');
      return;
    }
    
    const engineCore = this.systemManager.getEngineCore();
    const activeMeteors = engineCore.getGameLogic().getActiveMeteors();
    const meteorsDestroyed = activeMeteors.length;
    
    // Create enhanced visual effects
    const meteorData = activeMeteors.map(meteor => ({
      x: meteor.x, y: meteor.y, color: meteor.color, isSuper: meteor.isSuper
    }));
    
    const centerX = customEvent.detail.centerX || this.canvas.width / 2;
    const centerY = customEvent.detail.centerY || this.canvas.height / 2;
    
    try {
      engineCore.getParticleSystem().createEnhancedChainDetonation(meteorData, centerX, centerY);
    } catch (error) {
      console.error('🔗❌ Error creating enhanced visual effects:', error);
      activeMeteors.forEach(meteor => {
        if (meteor && meteor.active) {
          engineCore.getParticleSystem().createExplosion(meteor.x, meteor.y, meteor.color, meteor.isSuper);
        }
      });
    }
    
    // Process chain detonation through game logic
    const actualMeteorsDestroyed = engineCore.getGameLogic().processChainDetonationScreenClear();
    engineCore.getScoreSystem().processChainDetonationScore(meteorsDestroyed, centerX, centerY);
    engineCore.getGameLogic().setScreenShake({ x: 0, y: 0, intensity: 30, duration: 1500 });
    
    console.log(`🔗💥 Chain Detonation completed - destroyed ${actualMeteorsDestroyed} meteors!`);
  };
  
  private handleKnockbackActivation = () => {
    this.inputSystem.handleKnockbackActivation();
  };
  
  private handleAutoScalingChange(event: string): void {
    const engineCore = this.systemManager.getEngineCore();
    const performanceSettings = engineCore.getPerformanceSettings();
    
    // Update particle system with new limits
    engineCore.getParticleSystem().setMaxParticles(performanceSettings.dynamicMaxParticles);
    
    // Update render system shadow settings
    engineCore.getRenderSystem().setShadowsEnabled(performanceSettings.shadowsEnabled);
  }
  
  private handlePerformanceModeChange(enabled: boolean): void {
    const performanceSettings = this.systemManager.getEngineCore().getPerformanceSettings();
    this.performanceManager.applyPerformanceMode(enabled, performanceSettings);
  }
  
  private handleGameOver = () => {
    // Update user statistics
    const engineCore = this.systemManager.getEngineCore();
    const gameStats = engineCore.getGameLogic().getGameStats();
    const totalScore = engineCore.getScoreSystem().getTotalScore();
    this.gameState.updateUserStatisticsWithData(gameStats, totalScore);
    
    // Force immediate state update
    this.triggerStateUpdate(true);
  };
  
  private handleStatsUpdate = (stats: GameStats) => {
    // Stats are handled within the main state update
  };
  
  /**
   * Trigger state update
   */
  private triggerStateUpdate(isGameOver: boolean = false): void {
    const engineCore = this.systemManager.getEngineCore();
    const performanceStats = this.performanceManager.getPerformanceStats(engineCore.getPerformanceSettings());
    
    const stateData: GameStateData = {
      score: engineCore.getScoreSystem().getTotalScore(),
      scoreBreakdown: engineCore.getScoreSystem().getScoreBreakdown(),
      comboInfo: engineCore.getScoreSystem().getComboInfo(),
      powerUpCharges: engineCore.getPowerUpManager().getCharges(),
      maxPowerUpCharges: engineCore.getPowerUpManager().getMaxCharges(),
      time: engineCore.getGameLogic().getGameTime(),
      isGameOver: isGameOver || engineCore.getGameLogic().isGameOverState(),
      fps: performanceStats.fps,
      meteors: engineCore.getGameLogic().getMeteorCount(),
      particles: engineCore.getParticleSystem().getParticleCount(),
      poolSizes: {
        meteors: engineCore.getMeteorPool().getPoolSize(),
        particles: engineCore.getParticleSystem().getPoolSize()
      },
      autoScaling: {
        enabled: engineCore.getAutoScalingEnabled(),
        shadowsEnabled: performanceStats.shadowsEnabled,
        maxParticles: performanceStats.maxParticles,
        adaptiveTrailsActive: performanceStats.adaptiveTrailsActive
      },
      performance: {
        averageFrameTime: performanceStats.averageFrameTime,
        memoryUsage: performanceStats.memoryUsage,
        lastScalingEvent: performanceStats.lastScalingEvent
      },
      settings: engineCore.getSettings()
    };
    
    this.onStateUpdate(stateData);
  }
  
  // Public API methods (maintaining compatibility with original Engine)
  start(): void {
    console.log('[ENGINE] Start method called');
    this.gameLoop.start();
    this.systemManager.startBackgroundMusic();
    console.log('[ENGINE] Game started successfully');
  }
  
  preWarm(): void {
    console.log('🔥 Pre-warming game engine systems');
    this.gameLoop.preWarm();
    this.systemManager.preWarm();
    console.log('🔥 Engine pre-warming complete');
  }
  
  stop(): void {
    this.gameLoop.stop();
    this.systemManager.cleanup();
  }
  
  resetGame(): void {
    this.gameLoop.reset();
    this.performanceManager.reset();
    this.systemManager.reset();
    this.gameState.reset();
    console.log('Game reset completed');
  }
  
  pause(): void {
    this.gameLoop.pause();
    this.systemManager.getAudioManager().pause();
  }
  
  resume(): void {
    this.gameLoop.resume();
    this.systemManager.getAudioManager().resume();
  }
  
  // Getters and setters (maintaining API compatibility)
  isStarted(): boolean {
    return this.gameLoop.isStarted();
  }
  
  isPausedState(): boolean {
    return this.gameLoop.isPausedState();
  }
  
  getGameOverState(): boolean {
    return this.systemManager.getEngineCore().getGameLogic().isGameOverState();
  }
  
  getSettings(): GameSettings {
    return { ...this.systemManager.getEngineCore().getSettings() };
  }
  
  setPerformanceMode(enabled: boolean): void {
    const engineCore = this.systemManager.getEngineCore();
    engineCore.updateSettings({ performanceMode: enabled });
    this.handlePerformanceModeChange(enabled);
  }
  
  getPerformanceMode(): boolean {
    return this.systemManager.getEngineCore().getPerformanceSettings().performanceModeActive;
  }
  
  setAutoPerformanceModeEnabled(enabled: boolean): void {
    this.systemManager.getEngineCore().updateSettings({ autoPerformanceModeEnabled: enabled });
  }
  
  getAutoPerformanceModeEnabled(): boolean {
    return this.systemManager.getEngineCore().getSettings().autoPerformanceModeEnabled || false;
  }
  
  setAutoScalingEnabled(enabled: boolean): void {
    this.systemManager.getEngineCore().setAutoScalingEnabled(enabled);
    if (!enabled) {
      this.performanceManager.setScalingEvent('auto-scaling-disabled');
    }
  }
  
  getAutoScalingEnabled(): boolean {
    return this.systemManager.getEngineCore().getAutoScalingEnabled();
  }
  
  getPerformanceStats() {
    return this.performanceManager.getPerformanceStats(
      this.systemManager.getEngineCore().getPerformanceSettings()
    );
  }
  
  // Audio control methods
  getAudioManager() {
    return this.systemManager.getAudioManager();
  }
  
  async changeTrack(trackName: string): Promise<boolean> {
    return await this.systemManager.getAudioManager().playTrack(trackName, 3.0);
  }
  
  setMasterVolume(volume: number): void {
    this.systemManager.getAudioManager().setMasterVolume(volume);
  }
  
  setMusicVolume(volume: number): void {
    this.systemManager.getAudioManager().setMusicVolume(volume);
  }
  
  toggleMusic(): void {
    this.systemManager.getAudioManager().toggleMusic();
  }
}