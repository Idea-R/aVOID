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
  
  // State update throttling to prevent excessive React re-renders
  private lastStateUpdateTime: number = 0;
  private stateUpdateInterval: number = 100; // 10fps for UI updates (was 1000ms)
  private priorityUpdatePending: boolean = false; // Flag for high-priority updates like performance mode
  
  // Track previous state to detect actual changes
  private previousState = {
    score: 0,
    powerUpCharges: 0,
    isGameOver: false,
    performanceMode: false,
    meteors: 0,
    particles: 0
  };
  
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
    
    // FIXED: Stricter throttling - only allow priority updates for truly critical changes
    const now = performance.now();
    const timeSinceLastUpdate = now - this.lastStateUpdateTime;
    
    // Only bypass throttling for critical priority updates AND if enough time has passed (min 100ms)
    const shouldUpdate = this.priorityUpdatePending 
      ? timeSinceLastUpdate >= 100  // Priority updates still need minimum 100ms gap
      : timeSinceLastUpdate >= this.stateUpdateInterval;
    
    if (shouldUpdate) {
    this.triggerStateUpdate();
      this.lastStateUpdateTime = now;
      this.priorityUpdatePending = false; // Reset priority flag
    }
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
    const engineCore = this.systemManager.getEngineCore();
    engineCore.applyPerformanceMode(enabled);
    
    // Flag priority update to ensure performance mode changes are reflected immediately
    this.priorityUpdatePending = true;
    console.log(`🔧 [GameEngineCore] Performance mode change flagged for priority update: ${enabled}`);
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
    
    // Collect current state values
    const currentState = {
      score: engineCore.getScoreSystem().getTotalScore(),
      powerUpCharges: engineCore.getPowerUpManager().getCharges(),
      isGameOver: isGameOver || engineCore.getGameLogic().isGameOverState(),
      performanceMode: engineCore.getPerformanceSettings().performanceModeActive,
      meteors: engineCore.getGameLogic().getMeteorCount(),
      particles: engineCore.getParticleSystem().getParticleCount()
    };
    
    // Check if any HUD-relevant values have actually changed
    const hasChanges = 
      this.previousState.score !== currentState.score ||
      this.previousState.powerUpCharges !== currentState.powerUpCharges ||
      this.previousState.isGameOver !== currentState.isGameOver ||
      this.previousState.performanceMode !== currentState.performanceMode ||
      (Math.abs(this.previousState.meteors - currentState.meteors) > 2) || // Only trigger if meteor count changes significantly
      (Math.abs(this.previousState.particles - currentState.particles) > 10); // Only trigger if particle count changes significantly
    
    // Only propagate update if there are actual changes OR this is a priority update
    if (!hasChanges && !this.priorityUpdatePending && !isGameOver) {
      return; // Skip unnecessary update
    }
    
    // Update previous state tracking
    this.previousState = { ...currentState };
    
    const stateData: GameStateData = {
      score: currentState.score,
      scoreBreakdown: engineCore.getScoreSystem().getScoreBreakdown(),
      comboInfo: engineCore.getScoreSystem().getComboInfo(),
      powerUpCharges: currentState.powerUpCharges,
      maxPowerUpCharges: engineCore.getPowerUpManager().getMaxCharges(),
      time: engineCore.getGameLogic().getGameTime(),
      isGameOver: currentState.isGameOver,
      fps: performanceStats.fps,
      meteors: currentState.meteors,
      particles: currentState.particles,
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
    console.log(`🔄 [STATE UPDATE] Changes detected: score=${this.previousState.score !== currentState.score}, powerUp=${this.previousState.powerUpCharges !== currentState.powerUpCharges}, gameOver=${this.previousState.isGameOver !== currentState.isGameOver}, priority=${this.priorityUpdatePending}`);
  }
  
  /**
   * Trigger priority update that bypasses throttling
   */
  triggerPriorityUpdate(): void {
    this.priorityUpdatePending = true;
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
    // Preserve performance settings before reset
    const engineCore = this.systemManager.getEngineCore();
    const preservedSettings = {
      performanceMode: engineCore.getSettings().performanceMode,
      autoPerformanceModeEnabled: engineCore.getAutoPerformanceModeEnabled(),
      performanceModeActive: engineCore.getPerformanceSettings().performanceModeActive
    };
    
    console.log(`🔧 [ENGINE CORE] Preserving performance settings during reset: mode=${preservedSettings.performanceMode}, auto=${preservedSettings.autoPerformanceModeEnabled}`);
    
    this.gameLoop.reset();
    this.performanceManager.reset();
    this.systemManager.reset();
    this.gameState.reset();
    
    // Restore performance settings after reset
    if (preservedSettings.performanceMode !== engineCore.getSettings().performanceMode) {
      console.log(`🔧 [ENGINE CORE] Restoring performance mode: ${preservedSettings.performanceMode}`);
      engineCore.setPerformanceMode(preservedSettings.performanceMode);
    }
    
    if (preservedSettings.autoPerformanceModeEnabled !== engineCore.getAutoPerformanceModeEnabled()) {
      console.log(`🔧 [ENGINE CORE] Restoring auto performance mode: ${preservedSettings.autoPerformanceModeEnabled}`);
      engineCore.updateSettings({ autoPerformanceModeEnabled: preservedSettings.autoPerformanceModeEnabled });
    }
    
    console.log('[ENGINE CORE] Game reset completed with preserved performance settings');
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