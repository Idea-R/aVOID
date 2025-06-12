import { RenderSystem } from './systems/RenderSystem';
import { ParticleSystem } from './systems/ParticleSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { ScoreSystem } from './systems/ScoreSystem';
import { DefenseSystem } from './systems/DefenseSystem';
import { ChainDetonationManager } from './entities/ChainDetonation';
import { ChainDetonationRenderer } from './systems/ChainDetonationRenderer';
import { PowerUpManager } from './entities/PowerUp';
import { InputHandler } from './InputHandler';
import { GameLogic, GameSystems, GameSettings } from './GameLogic';
import { ObjectPool } from './utils/ObjectPool';
import { SpatialGrid } from './utils/SpatialGrid';
import { Meteor, createMeteor, resetMeteor } from './entities/Meteor';

export interface PerformanceSettings {
  autoScaleEnabled: boolean;
  shadowsEnabled: boolean;
  dynamicMaxParticles: number;
  adaptiveTrailsActive: boolean;
  performanceModeActive: boolean;
  autoPerformanceModeEnabled: boolean;
  lowFPSThreshold: number;
  lowFPSDuration: number;
}

export class EngineCore {
  private canvas: HTMLCanvasElement;
  
  // Systems
  private renderSystem!: RenderSystem;
  private particleSystem!: ParticleSystem;
  private collisionSystem!: CollisionSystem;
  private scoreSystem!: ScoreSystem;
  private defenseSystem!: DefenseSystem;
  private chainDetonationManager!: ChainDetonationManager;
  private chainDetonationRenderer!: ChainDetonationRenderer;
  private inputHandler!: InputHandler;
  private powerUpManager!: PowerUpManager;
  private gameLogic!: GameLogic;
  
  // Object pools and spatial grid
  private meteorPool!: ObjectPool<Meteor>;
  private spatialGrid!: SpatialGrid;
  
  // Performance settings
  private performanceSettings: PerformanceSettings = {
    autoScaleEnabled: true,
    shadowsEnabled: true,
    dynamicMaxParticles: 300,
    adaptiveTrailsActive: true,
    performanceModeActive: false,
    autoPerformanceModeEnabled: false,
    lowFPSThreshold: 45,
    lowFPSDuration: 3000
  };
  
  // Game settings
  private gameSettings: GameSettings = {
    volume: 0.7,
    soundEnabled: true,
    showUI: true,
    showFPS: true,
    showPerformanceStats: true,
    showTrails: false,
    performanceMode: false,
    cursorColor: '#06b6d4'
  };
  
  // Event handlers
  private handleSettingsChange: (event: Event) => void = () => {};
  private handleWindowBlur: () => void = () => {};
  private handleWindowFocus: () => void = () => {};
  private handleVisibilityChange: () => void = () => {};
  private handleDefenseEffect: (event: Event) => void = () => {};
  private handleChainDetonationComplete: (event: Event) => void = () => {};
  private handleKnockbackActivation: () => void = () => {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.initializeSystems();
    this.setupEventListeners();
    
    // Development debugging - validate state consistency every 5 seconds
    if (process.env.NODE_ENV === 'development') {
      setInterval(() => {
        const debugInfo = this.getPerformanceModeDebugInfo();
        if (!debugInfo.isConsistent) {
          console.error('🚨 [DEBUG] Performance mode state inconsistency detected:', debugInfo);
        }
      }, 5000);
    }
  }

  private initializeSystems(): void {
    // Initialize core systems
    this.renderSystem = new RenderSystem(this.canvas);
    this.particleSystem = new ParticleSystem();
    this.scoreSystem = new ScoreSystem();
    this.defenseSystem = new DefenseSystem(this.canvas);
    this.chainDetonationManager = new ChainDetonationManager(this.canvas.width, this.canvas.height);
    this.chainDetonationRenderer = new ChainDetonationRenderer(this.canvas);
    this.powerUpManager = new PowerUpManager();
    
    // Initialize object pools
    this.meteorPool = new ObjectPool(createMeteor, resetMeteor, 20, 50);
    
    // Initialize spatial grid
    this.spatialGrid = new SpatialGrid(window.innerWidth, window.innerHeight, 150);
    this.collisionSystem = new CollisionSystem(this.spatialGrid);
    
    // Initialize input handler
    this.inputHandler = new InputHandler(this.canvas, () => this.handleKnockbackActivation());
    
    // Initialize game logic
    const systems: GameSystems = {
      particleSystem: this.particleSystem,
      collisionSystem: this.collisionSystem,
      scoreSystem: this.scoreSystem,
      defenseSystem: this.defenseSystem,
      chainDetonationManager: this.chainDetonationManager,
      powerUpManager: this.powerUpManager,
      inputHandler: this.inputHandler
    };
    
    this.gameLogic = new GameLogic(this.canvas, systems, this.gameSettings);
    
    // Load settings from localStorage
    this.loadSettings();
    
    // Set up canvas
    this.resizeCanvas();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.resizeCanvas);
    window.addEventListener('gameSettingsChanged', this.handleSettingsChange);
    window.addEventListener('blur', this.handleWindowBlur);
    window.addEventListener('focus', this.handleWindowFocus);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('defenseEffect', this.handleDefenseEffect);
    window.addEventListener('chainDetonationComplete', this.handleChainDetonationComplete);
  }

  private handleMobileDeviceDetection(): void {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasExistingSettings = localStorage.getItem('avoidGameSettings');
    
    if (isMobile && !hasExistingSettings) {
      console.log('🔧 [EngineCore] Mobile device detected - Suggesting performance mode (user choice preserved)');
      
      // Enable auto-performance mode detection but don't force it on
      this.performanceSettings.autoPerformanceModeEnabled = true;
      
      // Save suggestion settings but don't force performance mode
      const settingsToSave = {
        ...this.gameSettings,
        autoPerformanceModeEnabled: true,
        // Don't force performanceMode: true - let user decide
      };
      localStorage.setItem('avoidGameSettings', JSON.stringify(settingsToSave));
      localStorage.setItem('avoidGameAutoPerformanceMode', 'suggested'); // Changed from 'true'
      
      // Dispatch suggestion event instead of forcing activation
      window.dispatchEvent(new CustomEvent('mobilePerformanceSuggestion', {
        detail: {
          suggested: true,
          reason: 'Mobile device detected',
          autoEnabled: true
        }
      }));
      
      console.log('🔧 [EngineCore] Mobile performance mode suggested (not forced) and auto-detection enabled');
    }
  }

  private loadSettings(): void {
    try {
      const savedSettings = localStorage.getItem('avoidGameSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        this.gameSettings = { 
          ...this.gameSettings, 
          ...parsed,
          cursorColor: parsed.cursorColor || '#06b6d4'
        };
        this.performanceSettings.autoPerformanceModeEnabled = parsed.autoPerformanceModeEnabled || false;
        
        // CRITICAL FIX: Apply performance mode to engine if it was enabled in settings
        if (this.gameSettings.performanceMode) {
          console.log('🔧 [EngineCore] Applying saved performance mode state to engine');
          this.applyPerformanceMode(true);
        }
        
        // State validation - ensure UI and engine states match
        const engineState = this.performanceSettings.performanceModeActive;
        const uiState = this.gameSettings.performanceMode;
        if (engineState !== uiState) {
          console.warn(`🚨 [EngineCore] Performance mode state mismatch detected! Engine: ${engineState}, UI: ${uiState}`);
          // Fix by making engine state match UI state
          this.performanceSettings.performanceModeActive = uiState;
        }
      }
      
      // Mobile device detection and auto-enable logic moved here for proper engine integration
      this.handleMobileDeviceDetection();
      
    } catch (error) {
      console.error('Error loading game settings:', error);
    }
  }

  private resizeCanvas = (): void => {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.spatialGrid.resize(window.innerWidth, window.innerHeight);
    this.collisionSystem.updateSpatialGrid(this.spatialGrid);
    this.defenseSystem.updateCanvasSize(window.innerWidth, window.innerHeight);
    this.chainDetonationManager.updateCanvasSize(window.innerWidth, window.innerHeight);
    this.gameLogic.updateSpatialGrid(window.innerWidth, window.innerHeight);
  };

  setEventHandlers(handlers: {
    onSettingsChange?: (event: Event) => void;
    onWindowBlur?: () => void;
    onWindowFocus?: () => void;
    onVisibilityChange?: () => void;
    onDefenseEffect?: (event: Event) => void;
    onChainDetonationComplete?: (event: Event) => void;
    onKnockbackActivation?: () => void;
  }): void {
    if (handlers.onSettingsChange) this.handleSettingsChange = handlers.onSettingsChange;
    if (handlers.onWindowBlur) this.handleWindowBlur = handlers.onWindowBlur;
    if (handlers.onWindowFocus) this.handleWindowFocus = handlers.onWindowFocus;
    if (handlers.onVisibilityChange) this.handleVisibilityChange = handlers.onVisibilityChange;
    if (handlers.onDefenseEffect) this.handleDefenseEffect = handlers.onDefenseEffect;
    if (handlers.onChainDetonationComplete) this.handleChainDetonationComplete = handlers.onChainDetonationComplete;
    if (handlers.onKnockbackActivation) this.handleKnockbackActivation = handlers.onKnockbackActivation;
  }

  applyPerformanceMode(enabled: boolean): void {
    const wasActive = this.performanceSettings.performanceModeActive;
    
    // Update performance settings first
    this.performanceSettings.performanceModeActive = enabled;
    
    if (enabled && !wasActive) {
      // Enable performance optimizations
      this.performanceSettings.shadowsEnabled = false;
      this.performanceSettings.dynamicMaxParticles = 150;
      this.performanceSettings.adaptiveTrailsActive = false;
      
      // Disable auto-scaling to prevent conflicts
      this.performanceSettings.autoScaleEnabled = false;
      
      // Update systems with new settings
      this.particleSystem.setMaxParticles(this.performanceSettings.dynamicMaxParticles);
      this.renderSystem.setShadowsEnabled(this.performanceSettings.shadowsEnabled);
      
      console.log('🔧 [EngineCore] Performance Mode activated - Systems updated');
    } else if (!enabled && wasActive) {
      // Restore full quality
      this.performanceSettings.shadowsEnabled = true;
      this.performanceSettings.dynamicMaxParticles = 300;
      this.performanceSettings.adaptiveTrailsActive = true;
      
      // Re-enable auto-scaling
      this.performanceSettings.autoScaleEnabled = true;
      
      // Update systems with restored settings
      this.particleSystem.setMaxParticles(this.performanceSettings.dynamicMaxParticles);
      this.renderSystem.setShadowsEnabled(this.performanceSettings.shadowsEnabled);
      
      console.log('🔧 [EngineCore] Performance Mode deactivated - Full quality restored');
    }
    
    // Update game settings to keep UI in sync
    this.gameSettings.performanceMode = enabled;
    
    // Notify UI of engine state change for real-time synchronization
    window.dispatchEvent(new CustomEvent('enginePerformanceModeChanged', {
      detail: {
        performanceMode: enabled,
        engineState: this.performanceSettings.performanceModeActive,
        uiState: this.gameSettings.performanceMode,
        source: 'engine'
      }
    }));
    
    // Note: localStorage writes removed from here to prevent I/O during engine operations
    // Settings will be saved via throttled state updates or settings UI changes
  }

  updateSettings(newSettings: Partial<GameSettings>): void {
    const previousPerformanceMode = this.gameSettings.performanceMode;
    
    this.gameSettings = { ...this.gameSettings, ...newSettings };
    this.performanceSettings.autoPerformanceModeEnabled = newSettings.autoPerformanceModeEnabled || false;
    
    // Handle performance mode changes
    if (newSettings.performanceMode !== undefined && newSettings.performanceMode !== previousPerformanceMode) {
      this.applyPerformanceMode(newSettings.performanceMode);
    }
  }

  setAutoScalingEnabled(enabled: boolean): void {
    this.performanceSettings.autoScaleEnabled = enabled;
    if (!enabled) {
      // Reset to high quality when disabled
      this.performanceSettings.shadowsEnabled = true;
      this.performanceSettings.dynamicMaxParticles = 300;
      this.performanceSettings.adaptiveTrailsActive = true;
      this.particleSystem.setMaxParticles(this.performanceSettings.dynamicMaxParticles);
      this.renderSystem.setShadowsEnabled(this.performanceSettings.shadowsEnabled);
    }
  }

  resetSystems(): void {
    // Reset all systems to initial state
    this.particleSystem.reset();
    this.particleSystem.setMaxParticles(this.performanceSettings.dynamicMaxParticles);
    this.renderSystem.setShadowsEnabled(this.performanceSettings.shadowsEnabled);
    this.powerUpManager.reset();
    this.scoreSystem.reset();
    this.defenseSystem.clear();
    this.chainDetonationManager.reset();
    
    // Re-initialize defense zones
    this.defenseSystem = new DefenseSystem(this.canvas);
    
    // Reset input handler (fix cursor position bug)
    this.inputHandler.reset();
    
    // Update GameLogic with the new systems
    const systems: GameSystems = {
      particleSystem: this.particleSystem,
      collisionSystem: this.collisionSystem,
      scoreSystem: this.scoreSystem,
      defenseSystem: this.defenseSystem,
      chainDetonationManager: this.chainDetonationManager,
      powerUpManager: this.powerUpManager,
      inputHandler: this.inputHandler
    };
    
    // Reset game logic with updated systems
    this.gameLogic.resetGame();
    this.gameLogic.updateSystems(systems);
    
    console.log('EngineCore systems reset completed');
  }

  cleanup(): void {
    // Clean up pools and systems
    this.meteorPool.clear();
    this.particleSystem.clear();
    this.scoreSystem.clear();
    
    // Clean up input handler
    this.inputHandler.cleanup();
    
    // Remove event listeners
    window.removeEventListener('resize', this.resizeCanvas);
    window.removeEventListener('gameSettingsChanged', this.handleSettingsChange);
    window.removeEventListener('blur', this.handleWindowBlur);
    window.removeEventListener('focus', this.handleWindowFocus);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('defenseEffect', this.handleDefenseEffect);
    window.removeEventListener('chainDetonationComplete', this.handleChainDetonationComplete);
  }

  // Getters for systems and state
  getRenderSystem(): RenderSystem { return this.renderSystem; }
  getParticleSystem(): ParticleSystem { return this.particleSystem; }
  getCollisionSystem(): CollisionSystem { return this.collisionSystem; }
  getScoreSystem(): ScoreSystem { return this.scoreSystem; }
  getDefenseSystem(): DefenseSystem { return this.defenseSystem; }
  getChainDetonationManager(): ChainDetonationManager { return this.chainDetonationManager; }
  getChainDetonationRenderer(): ChainDetonationRenderer { return this.chainDetonationRenderer; }
  getInputHandler(): InputHandler { return this.inputHandler; }
  getPowerUpManager(): PowerUpManager { return this.powerUpManager; }
  getGameLogic(): GameLogic { return this.gameLogic; }
  getMeteorPool(): ObjectPool<Meteor> { return this.meteorPool; }
  
  getSettings(): GameSettings { return { ...this.gameSettings }; }
  getPerformanceSettings(): PerformanceSettings { return { ...this.performanceSettings }; }
  
  getAutoScalingEnabled(): boolean { return this.performanceSettings.autoScaleEnabled; }
  getPerformanceMode(): boolean { return this.performanceSettings.performanceModeActive; }
  getAutoPerformanceModeEnabled(): boolean { return this.performanceSettings.autoPerformanceModeEnabled; }

  setPerformanceMode(enabled: boolean): void {
    console.log(`🔧 [ENGINE] Setting performance mode: ${enabled}`);
    
    // Get current states for validation
    const currentEngineState = this.performanceSettings.performanceModeActive;
    const currentUIState = this.gameSettings.performanceMode;
    
    // Log current state for debugging
    console.log(`🔧 [ENGINE] Current states - Engine: ${currentEngineState}, UI: ${currentUIState}, Requested: ${enabled}`);
    
    if (this.gameSettings.performanceMode === enabled && this.performanceSettings.performanceModeActive === enabled) {
      console.log('🔧 [ENGINE] Performance mode already at requested state, skipping');
      return; // Both states match requested state
    }
    
    // Fix any state inconsistencies before applying change
    if (currentEngineState !== currentUIState) {
      console.warn(`🚨 [ENGINE] State inconsistency detected! Engine: ${currentEngineState}, UI: ${currentUIState} - Synchronizing...`);
      this.performanceSettings.performanceModeActive = currentUIState;
    }
    
    this.gameSettings.performanceMode = enabled;
    
    // Apply performance mode changes
    this.applyPerformanceMode(enabled);
    
    // Store the setting
    this.updateSettings({ performanceMode: enabled });
    
    // Validate final state
    const finalEngineState = this.performanceSettings.performanceModeActive;
    const finalUIState = this.gameSettings.performanceMode;
    
    if (finalEngineState === finalUIState && finalEngineState === enabled) {
      console.log(`🔧 [ENGINE] Performance mode ${enabled ? 'enabled' : 'disabled'} successfully - States synchronized`);
    } else {
      console.error(`🚨 [ENGINE] Performance mode state synchronization failed! Engine: ${finalEngineState}, UI: ${finalUIState}, Expected: ${enabled}`);
    }
  }

  /**
   * Get comprehensive performance mode state for debugging
   */
  getPerformanceModeDebugInfo(): {
    engineState: boolean;
    uiState: boolean;
    autoModeEnabled: boolean;
    isConsistent: boolean;
  } {
    const engineState = this.performanceSettings.performanceModeActive;
    const uiState = this.gameSettings.performanceMode;
    const autoModeEnabled = this.performanceSettings.autoPerformanceModeEnabled;
    const isConsistent = engineState === uiState;
    
    if (!isConsistent) {
      console.warn(`🚨 [DEBUG] Performance mode state inconsistency: Engine=${engineState}, UI=${uiState}`);
    }
    
    return {
      engineState,
      uiState,
      autoModeEnabled,
      isConsistent
    };
  }
}