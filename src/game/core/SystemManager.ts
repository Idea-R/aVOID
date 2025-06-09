// Extracted from Engine.ts on January 7, 2025
// Original Engine.ts: 887 lines -> Refactored into modular architecture

import { PowerUpManager } from '../entities/PowerUp';
import { ObjectPool } from '../utils/ObjectPool';
import { Meteor } from '../entities/Meteor';
import { RenderSystem } from '../systems/RenderSystem';
import { ParticleSystem } from '../systems/ParticleSystem';
import { CollisionSystem } from '../systems/CollisionSystem';
import { ScoreSystem } from '../systems/ScoreSystem';
import { DefenseSystem } from '../systems/DefenseSystem';
import { ChainDetonationManager } from '../entities/ChainDetonation';
import { ChainDetonationRenderer } from '../systems/ChainDetonationRenderer';
import { InputHandler } from '../InputHandler';
import { GameLogic } from '../GameLogic';
import { EngineCore } from '../EngineCore';
import { AudioManager } from '../audio/AudioManager';
import { CanvasState } from './CanvasManager';

/**
 * SystemManager coordinates all game systems and handles their lifecycle.
 * Extracted from Engine.ts to maintain separation of concerns and stay under 500-line limit.
 */
export class SystemManager {
  private canvas: HTMLCanvasElement;
  private engineCore: EngineCore;
  private audioManager: AudioManager;
  
  // Event handler callbacks
  private eventHandlers: {
    onSettingsChange?: (event: Event) => void;
    onDefenseEffect?: (event: Event) => void;
    onChainDetonationComplete?: (event: Event) => void;
    onKnockbackActivation?: () => void;
  } = {};
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    console.log('[SYSTEMS] SystemManager initialized');
    
    // Initialize audio manager first
    console.log('[AUDIO] Creating AudioManager...');
    try {
      this.audioManager = new AudioManager();
      console.log('[AUDIO] AudioManager created successfully');
    } catch (error) {
      console.error('[AUDIO] Failed to create AudioManager:', error);
      throw error;
    }
    
    // Initialize core engine
    this.engineCore = new EngineCore(canvas);
    
    this.setupEventListeners();
  }
  
  /**
   * Set event handlers for various system events
   */
  setEventHandlers(handlers: {
    onSettingsChange?: (event: Event) => void;
    onDefenseEffect?: (event: Event) => void;
    onChainDetonationComplete?: (event: Event) => void;
    onKnockbackActivation?: () => void;
  }): void {
    this.eventHandlers = handlers;
    
    // Setup engine core event handlers
    this.engineCore.setEventHandlers({
      onSettingsChange: handlers.onSettingsChange || (() => {}),
      onWindowBlur: () => {}, // Handled by GameLoop
      onWindowFocus: () => {}, // Handled by GameLoop  
      onVisibilityChange: () => {}, // Handled by GameLoop
      onDefenseEffect: handlers.onDefenseEffect || (() => {}),
      onChainDetonationComplete: handlers.onChainDetonationComplete || (() => {}),
      onKnockbackActivation: handlers.onKnockbackActivation || (() => {})
    });
  }
  
  /**
   * Setup global event listeners
   */
  private setupEventListeners(): void {
    // Canvas resize handling
    window.addEventListener('resize', this.resizeCanvas);
    
    // Audio event listeners
    this.audioManager.addEventListener('track-changed', (event: any) => {
      console.log(`🎵🎶 Track changed: ${event.detail.displayName}`);
    });
    
    this.audioManager.addEventListener('playback-error', (event: any) => {
      console.error('🎵❌ Audio playback error:', event.detail);
    });
  }
  
  /**
   * Initialize all systems for gameplay
   */
  initializeSystems(): void {
    console.log('[SYSTEMS] Initializing all game systems');
    
    // Initialize canvas size
    this.resizeCanvas();
    
    // Systems are initialized within EngineCore
    console.log('[SYSTEMS] All systems initialized successfully');
  }
  
  /**
   * Handle canvas resizing (legacy method)
   */
  private resizeCanvas = () => {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    console.log('[SYSTEMS] Canvas resized to', this.canvas.width, 'x', this.canvas.height);
  };

  /**
   * Handle canvas resize from CanvasManager
   */
  handleCanvasResize(canvasState: CanvasState): void {
    // Update all systems that depend on canvas size
    const dimensions = { width: canvasState.displayWidth, height: canvasState.displayHeight };
    
    // Update spatial grid and collision system
    this.engineCore.getCollisionSystem().updateSpatialGrid(this.engineCore.getGameLogic().getSpatialGrid());
    
    // Update defense system
    this.engineCore.getDefenseSystem().updateCanvasSize(dimensions.width, dimensions.height);
    
    // Update chain detonation manager  
    this.engineCore.getChainDetonationManager().updateCanvasSize(dimensions.width, dimensions.height);
    
    // Update game logic spatial grid
    this.engineCore.getGameLogic().updateSpatialGrid(dimensions.width, dimensions.height);
    
    console.log(`[SYSTEMS] Systems updated for canvas resize: ${dimensions.width}x${dimensions.height}`);
  };
  
  /**
   * Update all systems
   */
  update(deltaTime: number): void {
    // Update game logic (which coordinates other systems)
    const performanceSettings = this.engineCore.getPerformanceSettings();
    this.engineCore.getGameLogic().update(
      deltaTime, 
      performanceSettings.adaptiveTrailsActive, 
      performanceSettings.performanceModeActive
    );
  }
  
  /**
   * Render all systems
   */
  render(): void {
    const mousePos = this.engineCore.getInputHandler().getMousePosition();
    const gameLogic = this.engineCore.getGameLogic();
    const performanceSettings = this.engineCore.getPerformanceSettings();
    const gameSettings = this.engineCore.getSettings();
    
    const renderState = {
      mouseX: mousePos.x,
      mouseY: mousePos.y,
      activeMeteors: gameLogic.getActiveMeteors(),
      activeParticles: this.engineCore.getParticleSystem().getActiveParticles(),
      powerUps: this.engineCore.getPowerUpManager().getPowerUps(),
      scoreTexts: this.engineCore.getScoreSystem().getActiveScoreTexts(),
      playerTrail: gameLogic.getPlayerTrail(),
      powerUpCharges: this.engineCore.getPowerUpManager().getCharges(),
      maxPowerUpCharges: this.engineCore.getPowerUpManager().getMaxCharges(),
      isGameOver: gameLogic.isGameOverState(),
      playerRingPhase: gameLogic.getPlayerRingPhase(),
      screenShake: gameLogic.getScreenShake(),
      adaptiveTrailsActive: performanceSettings.adaptiveTrailsActive && !performanceSettings.performanceModeActive,
      gameSettings: gameSettings
    };
    
    // Main render pass
    this.engineCore.getRenderSystem().render(renderState);
    
    // Render defense system effects on top
    this.engineCore.getDefenseSystem().render();
    
    // Render chain detonation effects
    const activeChain = this.engineCore.getChainDetonationManager().getActiveChain();
    if (activeChain) {
      this.engineCore.getChainDetonationRenderer().renderChainDetonation(activeChain);
      this.engineCore.getChainDetonationRenderer().renderUI(activeChain);
    }
    
    // Apply chain detonation screen effects
    const chainEffects = this.engineCore.getChainDetonationManager().getScreenEffects();
    if (chainEffects.shakeIntensity > 0) {
      const currentShake = gameLogic.getScreenShake();
      gameLogic.setScreenShake({
        x: currentShake.x,
        y: currentShake.y,
        intensity: Math.max(currentShake.intensity, chainEffects.shakeIntensity),
        duration: Math.max(currentShake.duration, 500)
      });
    }
  }
  
  /**
   * Pre-warm all systems
   */
  preWarm(): void {
    console.log('🔥 Pre-warming game systems');
    
    // Pre-allocate some objects in pools
    for (let i = 0; i < 10; i++) {
      const meteor = this.engineCore.getMeteorPool().get();
      this.engineCore.getMeteorPool().release(meteor);
    }
    
    // Initialize particle system
    this.engineCore.getParticleSystem().reset();
    
    console.log('🔥 System pre-warming complete');
  }
  
  /**
   * Reset all systems
   */
  reset(): void {
    console.log('[SYSTEMS] Resetting all game systems');
    this.engineCore.resetSystems();
  }
  
  /**
   * Clean up all systems
   */
  cleanup(): void {
    console.log('[SYSTEMS] Cleaning up all systems');
    
    // Clean up pools and systems
    this.engineCore.getMeteorPool().clear();
    this.engineCore.getParticleSystem().clear();
    this.engineCore.getScoreSystem().clear();
    this.engineCore.getGameLogic().getActiveMeteors().length = 0;
    
    // Clean up input handler
    this.engineCore.getInputHandler().cleanup();
    
    // Remove event listeners
    window.removeEventListener('resize', this.resizeCanvas);
    window.removeEventListener('gameSettingsChanged', this.eventHandlers.onSettingsChange || (() => {}));
    window.removeEventListener('defenseEffect', this.eventHandlers.onDefenseEffect || (() => {}));
    window.removeEventListener('chainDetonationComplete', this.eventHandlers.onChainDetonationComplete || (() => {}));
  }
  
  /**
   * Start background music
   */
  async startBackgroundMusic(): Promise<void> {
    console.log('[AUDIO] startBackgroundMusic called');
    try {
      const settings = this.engineCore.getSettings();
      console.log('[AUDIO] Game settings:', { soundEnabled: settings.soundEnabled, volume: settings.volume });
      console.log('[AUDIO] AudioManager ready:', this.audioManager.isReady());
      
      if (settings.soundEnabled) {
        if (this.audioManager.isReady()) {
          console.log('[AUDIO] Attempting to start background music...');
          const success = await this.audioManager.playTrack('into-the-void');
          if (success) {
            console.log('[AUDIO] Background music started successfully');
          } else {
            console.warn('[AUDIO] Failed to start background music');
          }
        } else {
          console.log('[AUDIO] Waiting for user interaction to enable audio... Music will auto-start once interaction is detected.');
        }
      } else {
        console.log('[AUDIO] Background music disabled in settings');
      }
    } catch (error) {
      console.error('[AUDIO] Failed to start background music:', error);
    }
  }
  
  // System accessors
  getEngineCore(): EngineCore {
    return this.engineCore;
  }
  
  getAudioManager(): AudioManager {
    return this.audioManager;
  }
  
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}