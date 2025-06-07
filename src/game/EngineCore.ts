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
      }
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
    this.performanceSettings.performanceModeActive = enabled;
    
    if (enabled) {
      // Enable performance optimizations
      this.performanceSettings.shadowsEnabled = false;
      this.performanceSettings.dynamicMaxParticles = 150;
      this.performanceSettings.adaptiveTrailsActive = false;
      
      // Update systems
      this.particleSystem.setMaxParticles(this.performanceSettings.dynamicMaxParticles);
      this.renderSystem.setShadowsEnabled(this.performanceSettings.shadowsEnabled);
      
      console.log('🔧 Performance Mode activated - Shadows disabled, particles reduced to 150, trails disabled');
    } else {
      // Restore full quality
      this.performanceSettings.shadowsEnabled = true;
      this.performanceSettings.dynamicMaxParticles = 300;
      this.performanceSettings.adaptiveTrailsActive = true;
      
      // Update systems
      this.particleSystem.setMaxParticles(this.performanceSettings.dynamicMaxParticles);
      this.renderSystem.setShadowsEnabled(this.performanceSettings.shadowsEnabled);
      
      console.log('🔧 Performance Mode deactivated - Full visual quality restored');
    }
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
    
    // Reset and recreate input handler
    this.inputHandler.cleanup();
    this.inputHandler = new InputHandler(this.canvas, () => this.handleKnockbackActivation());
    
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
}