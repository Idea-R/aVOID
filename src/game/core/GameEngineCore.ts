import { GameLoop } from './GameLoop';
import { PerformanceManager } from './PerformanceManager';
import { SystemManager } from './SystemManager';
import { InputSystem } from '../systems/InputSystem';
import { GameState, GameStateData } from '../state/GameState';
import { CanvasManager } from './CanvasManager';
import { GameSettings } from '../GameLogic';
import { GameStats } from '../managers/GameStatsManager';

export class GameEngineCore {
  private canvas: HTMLCanvasElement;
  private canvasManager!: CanvasManager;
  
  private gameLoop!: GameLoop;
  private performanceManager!: PerformanceManager;
  private systemManager!: SystemManager;
  private inputSystem!: InputSystem;
  private gameState!: GameState;
  
  onStateUpdate: (state: GameStateData) => void = () => {};

  constructor(canvas: HTMLCanvasElement) {
    console.log('[ENGINE CORE] GameEngineCore constructor called');
    this.canvas = canvas;
    
    this.initializeCanvasManager();
    this.initializeSystems();
    this.setupEventHandlers();
    
    console.log('[ENGINE CORE] GameEngineCore initialized successfully');
  }

  private initializeCanvasManager(): void {
    this.canvasManager = new CanvasManager(this.canvas, {
      preventZoom: true,
      handleDevicePixelRatio: true,
      maintainAspectRatio: false,
      minWidth: 320,
      minHeight: 240,
      maxWidth: 3840,
      maxHeight: 2160
    });

    // Handle canvas resize
    this.canvasManager.onResize((state) => {
      console.log('🖼️ Canvas state updated:', state);
      // Will be connected to systemManager after it's initialized
    });
  }
  
  private initializeSystems(): void {
    this.systemManager = new SystemManager(this.canvas);
    this.gameLoop = new GameLoop();
    this.performanceManager = new PerformanceManager();
    
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
    
    this.gameState = new GameState();
    
    // Connect InputHandler to CanvasManager for proper coordinate mapping
    const inputHandler = engineCore.getInputHandler();
    inputHandler.setCanvasManager(this.canvasManager);
    
    // Connect canvas resize handler to SystemManager
    this.canvasManager.onResize((state) => {
      console.log('🖼️ Canvas state updated:', state);
      this.systemManager.handleCanvasResize(state);
    });
    
    console.log('[ENGINE CORE] All systems initialized');
  }
  
  private setupEventHandlers(): void {
    this.gameLoop.setCallbacks(
      this.update.bind(this),
      this.render.bind(this),
      this.updateFPS.bind(this)
    );
    
    this.performanceManager.setCallbacks(
      this.handleAutoScalingChange.bind(this),
      this.handlePerformanceModeChange.bind(this)
    );
    
    this.gameState.setCallbacks(
      (state: GameStateData) => this.onStateUpdate(state),
      this.handleGameOver.bind(this),
      this.handleStatsUpdate.bind(this)
    );
    
    this.systemManager.setEventHandlers({
      onSettingsChange: this.handleSettingsChange.bind(this),
      onDefenseEffect: this.handleDefenseEffect.bind(this),
      onChainDetonationComplete: this.handleChainDetonationComplete.bind(this),
      onKnockbackActivation: this.handleKnockbackActivation.bind(this)
    });
    
    const gameLogic = this.systemManager.getEngineCore().getGameLogic();
    gameLogic.onGameOver = this.gameState.handleGameOver.bind(this.gameState);
    gameLogic.onStatsUpdate = this.gameState.handleStatsUpdate.bind(this.gameState);
  }
  
  private update(deltaTime: number): void {
    if (this.gameLoop.isPausedState()) return;
    
    this.systemManager.update(deltaTime);
    this.inputSystem.update(deltaTime);
    this.triggerStateUpdate();
  }
  
  private render(): void {
    if (this.gameLoop.isPausedState()) {
      this.renderPauseOverlay();
      return;
    }
    
    this.systemManager.render();
  }
  
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
  
  private renderPauseOverlay(): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    ctx.fillText('GAME PAUSED', centerX, centerY - 30);
    
    ctx.fillStyle = '#67e8f9';
    ctx.font = '24px Arial';
    ctx.fillText('Click here to resume', centerX, centerY + 30);
    
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#06b6d4';
    ctx.fillText('GAME PAUSED', centerX, centerY - 30);
    ctx.shadowBlur = 0;
  }
  
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
    
    engineCore.getParticleSystem().setMaxParticles(performanceSettings.dynamicMaxParticles);
    engineCore.getRenderSystem().setShadowsEnabled(performanceSettings.shadowsEnabled);
  }
  
  private handlePerformanceModeChange(enabled: boolean): void {
    const performanceSettings = this.systemManager.getEngineCore().getPerformanceSettings();
    this.performanceManager.applyPerformanceMode(enabled, performanceSettings);
  }
  
  private handleGameOver = () => {
    const engineCore = this.systemManager.getEngineCore();
    const gameStats = engineCore.getGameLogic().getGameStats();
    const totalScore = engineCore.getScoreSystem().getTotalScore();
    this.gameState.updateUserStatisticsWithData(gameStats, totalScore);
    this.triggerStateUpdate(true);
  };
  
  private handleStatsUpdate = (stats: GameStats) => {
    // Stats are handled within the main state update
  };
  
  triggerStateUpdate(isGameOver: boolean = false): void {
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
  
  // Core lifecycle methods
  start(): void {
    console.log('[ENGINE CORE] Start method called');
    this.gameLoop.start();
    this.systemManager.startBackgroundMusic();
    console.log('[ENGINE CORE] Game started successfully');
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
    console.log('[ENGINE CORE] Game reset completed');
  }
  
  pause(): void {
    this.gameLoop.pause();
    this.systemManager.getAudioManager().pause();
  }
  
  resume(): void {
    this.gameLoop.resume();
    this.systemManager.getAudioManager().resume();
  }

  // Getters for core systems
  getGameLoop(): GameLoop { return this.gameLoop; }
  getPerformanceManager(): PerformanceManager { return this.performanceManager; }
  getSystemManager(): SystemManager { return this.systemManager; }
  getInputSystem(): InputSystem { return this.inputSystem; }
  getGameState(): GameState { return this.gameState; }
}