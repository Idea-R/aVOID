import { PowerUpManager, PowerUp } from './entities/PowerUp';
import { ObjectPool } from './utils/ObjectPool';
import { SpatialGrid, GridObject } from './utils/SpatialGrid';
import { Meteor, createMeteor, resetMeteor, initializeMeteor } from './entities/Meteor';
import { RenderSystem } from './systems/RenderSystem';
import { ParticleSystem } from './systems/ParticleSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { ScoreSystem, ScoreBreakdown, ComboInfo } from './systems/ScoreSystem';
import { DefenseSystem } from './systems/DefenseSystem';
import { ChainDetonationManager } from './entities/ChainDetonation';
import { ChainDetonationRenderer } from './systems/ChainDetonationRenderer';
import { InputHandler } from './InputHandler';
import { GameLogic, GameSystems, GameSettings, GameStats } from './GameLogic';
import { EngineCore, PerformanceSettings } from './EngineCore';
import { AudioManager } from './audio/AudioManager';

export default class Engine {
  private canvas: HTMLCanvasElement;
  private animationFrame: number | null = null;
  private lastTime: number = 0;
  private started: boolean = false;
  private isPaused: boolean = false;
  private pausedTime: number = 0;
  private lastPauseTime: number = 0;
  
  // Core engine functionality
  private engineCore: EngineCore;
  private audioManager: AudioManager;
  
  // FPS tracking
  private frameCount: number = 0;
  private fpsLastTime: number = 0;
  private currentFPS: number = 0;
  private fpsUpdateInterval: number = 500;
  
  // Performance tracking
  private frameTimes: number[] = [];
  private averageFrameTime: number = 0;
  private memoryUsageEstimate: number = 0;
  private lastScalingEvent: string = 'none';
  private scalingEventTime: number = 0;
  private lowFPSStartTime: number = 0;
  
  onStateUpdate: (state: { 
    score: number;
    scoreBreakdown: ScoreBreakdown;
    comboInfo: ComboInfo;
    time: number; 
    isGameOver: boolean; 
    fps: number;
    meteors: number;
    particles: number;
    poolSizes: { meteors: number; particles: number };
    autoScaling: { enabled: boolean; shadowsEnabled: boolean; maxParticles: number; adaptiveTrailsActive: boolean };
    performance: { averageFrameTime: number; memoryUsage: number; lastScalingEvent: string };
    settings: GameSettings;
  }) => void = () => {};

  constructor(canvas: HTMLCanvasElement) {
    console.log('[ENGINE] Constructor called');
    this.canvas = canvas;
    
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
    
    // Setup event listeners
    this.engineCore.setEventHandlers({
      onSettingsChange: this.handleSettingsChange,
      onWindowBlur: this.handleWindowBlur,
      onWindowFocus: this.handleWindowFocus,
      onVisibilityChange: this.handleVisibilityChange,
      onDefenseEffect: this.handleDefenseEffect,
      onChainDetonationComplete: this.handleChainDetonationComplete,
      onKnockbackActivation: this.handleKnockbackActivation
    });
    
    // Window event listeners
    window.addEventListener('resize', this.resizeCanvas);
    window.addEventListener('blur', this.handleWindowBlur);
    window.addEventListener('focus', this.handleWindowFocus);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Initialize canvas size
    this.resizeCanvas();
    
    // Setup audio event listeners
    this.audioManager.addEventListener('track-changed', (event: any) => {
      console.log(`🎵🎶 Track changed: ${event.detail.displayName}`);
    });
    
    this.audioManager.addEventListener('playback-error', (event: any) => {
      console.error('🎵❌ Audio playback error:', event.detail);
    });
    
    // Set up game logic callbacks
    this.engineCore.getGameLogic().onGameOver = this.handleGameOver;
    this.engineCore.getGameLogic().onStatsUpdate = this.handleStatsUpdate;
  }

  private handleSettingsChange = (event: Event) => {
    const customEvent = event as CustomEvent;
    const newSettings = customEvent.detail;
    
    this.engineCore.updateSettings(newSettings);
  };
  
  private handleWindowBlur = () => {
    if (!this.engineCore.getGameLogic().isGameOverState() && this.started) {
      this.pauseGame();
      console.log('🎮 Game paused - window lost focus');
    }
  };

  private handleWindowFocus = () => {
    if (this.isPaused && !this.engineCore.getGameLogic().isGameOverState() && this.started) {
      this.resumeGame();
      console.log('🎮 Game resumed - window gained focus');
    }
  };

  private handleVisibilityChange = () => {
    if (document.hidden) {
      if (!this.engineCore.getGameLogic().isGameOverState() && this.started) {
        this.pauseGame();
        console.log('🎮 Game paused - tab hidden');
      }
    } else {
      if (this.isPaused && !this.engineCore.getGameLogic().isGameOverState() && this.started) {
        this.resumeGame();
        console.log('🎮 Game resumed - tab visible');
      }
    }
  };

  private pauseGame(): void {
    if (!this.started || this.isPaused) return;
    this.isPaused = true;
    this.lastPauseTime = performance.now();
    this.audioManager.pause();
    
    // Stop the animation frame loop
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    console.log('⏸️ Game paused');
  }

  private resumeGame(): void {
    if (!this.started || !this.isPaused) return;
    this.isPaused = false;
    
    // Calculate how long we were paused and adjust timers
    const pauseDuration = performance.now() - this.lastPauseTime;
    this.pausedTime += pauseDuration;
    
    // Adjust FPS tracking
    this.fpsLastTime += pauseDuration;
    
    // Reset last time to prevent large delta
    this.lastTime = performance.now();
    
    this.audioManager.resume();
    
    // Resume the game loop
    this.animationFrame = requestAnimationFrame(this.gameLoop);
    console.log('▶️ Game resumed');
  }

  private spawnMeteor() {
    const activeMeteors = this.engineCore.getGameLogic().getActiveMeteors();
    if (activeMeteors.length >= 50) return; // MAX_METEORS constant

    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    switch(side) {
      case 0: x = Math.random() * this.canvas.width; y = -20; break;
      case 1: x = this.canvas.width + 20; y = Math.random() * this.canvas.height; break;
      case 2: x = Math.random() * this.canvas.width; y = this.canvas.height + 20; break;
      default: x = -20; y = Math.random() * this.canvas.height; break;
    }

    const mousePos = this.engineCore.getInputHandler().getMousePosition();
    const angle = Math.atan2(mousePos.y - y, mousePos.x - x);
    const isSuper = Math.random() < 0.15;
    
    const baseSpeed = 0.8;
    const speedIncrease = Math.min(this.engineCore.getGameLogic().getGameTime() / 90, 2.0);
    let speed = baseSpeed + speedIncrease;
    speed *= 0.8 + Math.random() * 0.4;
    if (isSuper) speed *= 2;

    const color = isSuper ? '#ff4040' : this.getRandomColor();
    const baseRadius = isSuper ? 12 : 6;
    const radiusVariation = isSuper ? 4 : 6;
    
    const meteor = this.engineCore.getMeteorPool().get();
    initializeMeteor(
      meteor,
      x,
      y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      baseRadius + Math.random() * radiusVariation,
      color,
      isSuper
    );

    activeMeteors.push(meteor);
  }

  private resizeCanvas = () => {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    // Let EngineCore handle resizing
  };

  private getRandomColor(): string {
    const hue = Math.random() * 360;
    return `hsla(${hue}, 100%, 60%, 1)`;
  }

  private handleDefenseEffect = (event: Event) => {
    // Defense effects are now handled entirely by the DefenseSystem
    // No additional particle effects needed here
  };

  private handleChainDetonationComplete = (event: Event) => {
    const customEvent = event as CustomEvent;
    console.log('🔗💥🐛 DEBUG: Chain Detonation Complete Event Received!', {
      event: event,
      customEvent: customEvent,
      detail: customEvent.detail
    });
    
    // DEBUGGER: This will pause execution here so you can inspect everything
    debugger;
    
    // Safety check for event detail
    if (!customEvent.detail) {
      console.warn('🔗⚠️ Chain detonation event missing detail');
      return;
    }
    
    // Count meteors for scoring BEFORE destruction
    const activeMeteors = this.engineCore.getGameLogic().getActiveMeteors();
    const meteorsDestroyed = activeMeteors.length;
    
    console.log(`🔗🐛 DEBUG: Found ${meteorsDestroyed} meteors to destroy`, activeMeteors);
    
    // Prepare meteor data for enhanced visual effects
    const meteorData = activeMeteors.map(meteor => ({
      x: meteor.x,
      y: meteor.y,
      color: meteor.color,
      isSuper: meteor.isSuper
    }));
    
    // Get center coordinates for effects
    const centerX = customEvent.detail.centerX || this.canvas.width / 2;
    const centerY = customEvent.detail.centerY || this.canvas.height / 2;
    
    // Create enhanced visual effects BEFORE destroying meteors
    try {
      console.log(`🔗🐛 DEBUG: Creating enhanced chain detonation visual effects`);
      this.engineCore.getParticleSystem().createEnhancedChainDetonation(meteorData, centerX, centerY);
      console.log(`🔗🐛 DEBUG: Enhanced visual effects created successfully`);
    } catch (error) {
      console.error('🔗❌ Error creating enhanced visual effects:', error);
      // Fallback to basic explosion effects
      activeMeteors.forEach(meteor => {
        if (meteor && meteor.active) {
          this.engineCore.getParticleSystem().createExplosion(meteor.x, meteor.y, meteor.color, meteor.isSuper);
        }
      });
    }
    
    // Use the proper GameLogic method to clear all meteors
    const gameLogic = this.engineCore.getGameLogic();
    console.log(`🔗🐛 DEBUG: About to call processChainDetonationScreenClear(), current count: ${activeMeteors.length}`);
    
    const actualMeteorsDestroyed = gameLogic.processChainDetonationScreenClear();
    
    console.log(`🔗🐛 DEBUG: processChainDetonationScreenClear() destroyed ${actualMeteorsDestroyed} meteors`);
    console.log(`🔗🐛 DEBUG: Remaining meteors after clear: ${gameLogic.getActiveMeteors().length}`);
    console.log(`🔗💥 Destroyed ${actualMeteorsDestroyed} meteors via chain detonation!`);
    
    // Use the new enhanced scoring method with combo mechanics
    try {
      console.log(`🔗🐛 DEBUG: Using enhanced chain detonation scoring for ${meteorsDestroyed} meteors`);
      const totalPoints = this.engineCore.getScoreSystem().processChainDetonationScore(meteorsDestroyed, centerX, centerY);
      console.log(`🔗🐛 DEBUG: Enhanced scoring awarded ${totalPoints} total points`);
    } catch (error) {
      console.error('🔗❌ Error with enhanced chain detonation scoring:', error);
    }
    
    // Screen shake - use GameLogic method
    this.engineCore.getGameLogic().setScreenShake({ x: 0, y: 0, intensity: 30, duration: 1500 });
    console.log(`🔗🐛 DEBUG: Screen shake applied`);
    
    console.log(`🔗💥 Chain Detonation COMPLETED - destroyed ${meteorsDestroyed} meteors with enhanced visuals and scoring!`);
  };

  private handleKnockbackActivation = () => {
    if (this.engineCore.getGameLogic().isGameOverState() || !this.engineCore.getPowerUpManager().hasCharges()) return;

    if (!this.engineCore.getPowerUpManager().useCharge()) return;

    const mousePos = this.engineCore.getInputHandler().getMousePosition();
    console.log('💥 Knockback activated! Remaining charges:', this.engineCore.getPowerUpManager().getCharges(), '/', this.engineCore.getPowerUpManager().getMaxCharges());

    this.engineCore.getGameLogic().setScreenShake({ x: 0, y: 0, intensity: 15, duration: 500 });
    this.engineCore.getParticleSystem().createShockwave(mousePos.x, mousePos.y);

    const activeMeteors = this.engineCore.getGameLogic().getActiveMeteors();
    
    // Mild knockback effect for nearby meteors when collecting power-up
    const nearbyMeteors = activeMeteors.filter(meteor => {
      const dx = meteor.x - mousePos.x;
      const dy = meteor.y - mousePos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= 30; // Very close proximity
    });
    
    // Apply mild force to nearby meteors
    for (const meteor of nearbyMeteors) {
      const dx = meteor.x - mousePos.x;
      const dy = meteor.y - mousePos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 0) {
        const force = 2; // Mild force
        const angle = Math.atan2(dy, dx);
        meteor.vx += Math.cos(angle) * force;
        meteor.vy += Math.sin(angle) * force;
      }
    }

    // Use collision system for optimized knockback detection
    const knockbackResult = this.engineCore.getCollisionSystem().processKnockbackCollisions(
      mousePos.x, 
      mousePos.y, 
      activeMeteors
    );

    // Process destroyed meteors
    for (const meteor of knockbackResult.destroyedMeteors) {
      this.engineCore.getParticleSystem().createExplosion(meteor.x, meteor.y, meteor.color, meteor.isSuper);
    }
    
    // Handle meteor destruction through GameLogic for proper cleanup
    if (knockbackResult.destroyedMeteors.length > 0) {
      this.engineCore.getGameLogic().processKnockbackDestroyedMeteors(knockbackResult.destroyedMeteors);
    }

    // Process pushed meteors
    for (const { meteor, pushForce, angle } of knockbackResult.pushedMeteors) {
      meteor.vx += Math.cos(angle) * pushForce;
      meteor.vy += Math.sin(angle) * pushForce;
    }

    // Process scoring with enhanced system
    const destroyedMeteorData = knockbackResult.destroyedMeteors.map(meteor => ({
      x: meteor.x,
      y: meteor.y,
      isSuper: meteor.isSuper
    }));
    
    this.engineCore.getScoreSystem().processKnockbackScore(destroyedMeteorData, performance.now());
  };

  private updateFPS(timestamp: number) {
    this.frameCount++;
    
    // Track frame times for average calculation
    const frameTime = timestamp - this.lastTime;
    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > 60) { // Keep last 60 frames
      this.frameTimes.shift();
    }
    
    if (timestamp - this.fpsLastTime >= this.fpsUpdateInterval) {
      this.currentFPS = Math.round((this.frameCount * 1000) / (timestamp - this.fpsLastTime));
      this.frameCount = 0;
      this.fpsLastTime = timestamp;
      
      // Calculate average frame time
      if (this.frameTimes.length > 0) {
        this.averageFrameTime = this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length;
      }
      
      // Auto-scaling logic based on FPS performance
      const performanceSettings = this.engineCore.getPerformanceSettings();
      if (performanceSettings.autoScaleEnabled && !performanceSettings.performanceModeActive) {
        const previousShadows = performanceSettings.shadowsEnabled;
        const previousMaxParticles = performanceSettings.dynamicMaxParticles;
        
        if (this.currentFPS < 30) {
          this.engineCore.setAutoScalingEnabled(false); // Disable auto-scaling temporarily
          this.engineCore.applyPerformanceMode(true);
          this.lastScalingEvent = 'low-performance';
          this.scalingEventTime = Date.now();
          console.log('🔧 Auto-scaling: Low performance mode activated (FPS < 30) - Trails disabled');
        } else if (this.currentFPS < 45) {
          // Update performance settings through EngineCore
          this.lastScalingEvent = 'medium-performance';
          this.scalingEventTime = Date.now();
          console.log('🔧 Auto-scaling: Medium performance mode activated (FPS < 45) - Trails disabled');
        } else if (this.currentFPS >= 55) {
          this.lastScalingEvent = 'high-performance';
          this.scalingEventTime = Date.now();
          console.log('🔧 Auto-scaling: High performance mode activated (FPS >= 55) - Trails enabled');
        }
        
        // Update particle system with new limits
        this.engineCore.getParticleSystem().setMaxParticles(performanceSettings.dynamicMaxParticles);
        
        // Update render system shadow settings
        this.engineCore.getRenderSystem().setShadowsEnabled(performanceSettings.shadowsEnabled);
      }
      
      // Auto-performance mode detection
      const gameSettings = this.engineCore.getSettings();
      if (gameSettings.autoPerformanceModeEnabled && !performanceSettings.performanceModeActive) {
        if (this.currentFPS < performanceSettings.lowFPSThreshold) {
          if (this.lowFPSStartTime === 0) {
            this.lowFPSStartTime = timestamp;
          } else if (timestamp - this.lowFPSStartTime >= performanceSettings.lowFPSDuration) {
            // Enable performance mode automatically
            this.engineCore.updateSettings({ performanceMode: true });
            this.engineCore.applyPerformanceMode(true);
            
            // Dispatch event to update UI
            window.dispatchEvent(new CustomEvent('autoPerformanceModeActivated', {
              detail: { reason: 'low-fps', fps: this.currentFPS, duration: performanceSettings.lowFPSDuration }
            }));
            
            console.log(`🔧 Auto Performance Mode activated - FPS below ${performanceSettings.lowFPSThreshold} for ${performanceSettings.lowFPSDuration/1000}s`);
            this.lowFPSStartTime = 0;
          }
        } else {
          // Reset low FPS timer if FPS improves
          this.lowFPSStartTime = 0;
        }
      }
      
      // Calculate memory usage estimate
      this.memoryUsageEstimate = this.engineCore.getGameLogic().getActiveMeteors().length + this.engineCore.getParticleSystem().getParticleCount();
    }
  }

  private update(deltaTime: number) {
    if (this.isPaused) return;
    
    // Update game logic
    const performanceSettings = this.engineCore.getPerformanceSettings();
    this.engineCore.getGameLogic().update(deltaTime, performanceSettings.adaptiveTrailsActive, performanceSettings.performanceModeActive);
    
    // Always update state during normal gameplay
    this.triggerStateUpdate();
  }

  private render() {
    if (this.isPaused) {
      // Render pause overlay
      this.renderPauseOverlay();
      return;
    }
    
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
  private gameLoop = (timestamp: number) => {
    if (this.isPaused) return;
    
    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.updateFPS(timestamp);
    this.update(deltaTime);
    this.render();

    this.animationFrame = requestAnimationFrame(this.gameLoop);
  };

  start() {
    console.log('[ENGINE] Start method called');
    if (this.animationFrame === null) {
      this.lastTime = performance.now();
      this.fpsLastTime = this.lastTime;
      this.started = true;
      this.isPaused = false;
      this.animationFrame = requestAnimationFrame(this.gameLoop);
      
      console.log('[ENGINE] Game started successfully');
      
      // Start background music immediately
      this.startBackgroundMusic();
    }
  }

  private async startBackgroundMusic(): Promise<void> {
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

  preWarm() {
    // Pre-initialize systems without starting the game loop
    // This allows for faster startup when intro completes
    console.log('🔥 Pre-warming game engine systems');
    
    // Initialize timing
    this.lastTime = performance.now();
    this.fpsLastTime = this.lastTime;
    
    // Pre-allocate some objects in pools
    for (let i = 0; i < 10; i++) {
      const meteor = this.engineCore.getMeteorPool().get();
      this.engineCore.getMeteorPool().release(meteor);
    }
    
    // Initialize particle system
    this.engineCore.getParticleSystem().reset();
    
    console.log('🔥 Engine pre-warming complete');
  }
  stop() {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
      this.started = false;
    }
    
    // Clean up pools and systems
    this.engineCore.getMeteorPool().clear();
    this.engineCore.getParticleSystem().clear();
    this.engineCore.getScoreSystem().clear();
    this.engineCore.getGameLogic().getActiveMeteors().length = 0;
    
    // Clean up input handler
    this.engineCore.getInputHandler().cleanup();
    
    window.removeEventListener('resize', this.resizeCanvas);
    window.removeEventListener('gameSettingsChanged', this.handleSettingsChange);
    window.removeEventListener('blur', this.handleWindowBlur);
    window.removeEventListener('focus', this.handleWindowFocus);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('defenseEffect', this.handleDefenseEffect);
    window.removeEventListener('chainDetonationComplete', this.handleChainDetonationComplete);
  }

  isStarted(): boolean {
    return this.started;
  }

  getGameOverState(): boolean {
    return this.engineCore.getGameLogic().isGameOverState();
  }

  resetGame() {
    this.isPaused = false;
    this.pausedTime = 0;
    this.lastPauseTime = 0;
    
    // Reset performance tracking
    this.frameTimes.length = 0;
    this.averageFrameTime = 0;
    this.memoryUsageEstimate = 0;
    this.lastScalingEvent = 'reset';
    this.scalingEventTime = Date.now();
    
    // Reset performance mode tracking
    this.lowFPSStartTime = 0;
    
    // Let EngineCore handle the system reset
    this.engineCore.resetSystems();
    
    console.log('Game reset completed');
  }

  // Public pause/resume methods
  pause(): void {
    this.pauseGame();
  }

  resume(): void {
    this.resumeGame();
  }

  isPausedState(): boolean {
    return this.isPaused;
  }

  getSettings(): GameSettings {
    return { ...this.engineCore.getSettings() };
  }
  
  // Performance mode control methods
  setPerformanceMode(enabled: boolean): void {
    this.engineCore.updateSettings({ performanceMode: enabled });
    this.engineCore.applyPerformanceMode(enabled);
  }
  
  getPerformanceMode(): boolean {
    return this.engineCore.getPerformanceSettings().performanceModeActive;
  }
  
  setAutoPerformanceModeEnabled(enabled: boolean): void {
    this.engineCore.updateSettings({ autoPerformanceModeEnabled: enabled });
    this.lowFPSStartTime = 0; // Reset timer
  }
  
  getAutoPerformanceModeEnabled(): boolean {
    return this.engineCore.getSettings().autoPerformanceModeEnabled || false;
  }
  
  // Auto-scaling control methods
  setAutoScalingEnabled(enabled: boolean): void {
    this.engineCore.setAutoScalingEnabled(enabled);
    if (!enabled) {
      this.lastScalingEvent = 'auto-scaling-disabled';
      this.scalingEventTime = Date.now();
    }
  }
  
  getAutoScalingEnabled(): boolean {
    return this.engineCore.getAutoScalingEnabled();
  }
  
  getPerformanceStats(): {
    fps: number;
    averageFrameTime: number;
    memoryUsage: number;
    shadowsEnabled: boolean;
    maxParticles: number;
    adaptiveTrailsActive: boolean;
    lastScalingEvent: string;
    scalingEventTime: number;
  } {
    return {
      fps: this.currentFPS,
      averageFrameTime: this.averageFrameTime,
      memoryUsage: this.memoryUsageEstimate,
      shadowsEnabled: this.engineCore.getPerformanceSettings().shadowsEnabled,
      maxParticles: this.engineCore.getPerformanceSettings().dynamicMaxParticles,
      adaptiveTrailsActive: this.engineCore.getPerformanceSettings().adaptiveTrailsActive,
      lastScalingEvent: this.lastScalingEvent,
      scalingEventTime: this.scalingEventTime
    };
  }

  private handleGameOver = () => {
    // Update user statistics if authenticated
    this.updateUserStatistics();
    
    // Force immediate state update
    this.triggerStateUpdate(true);
  };

  private handleStatsUpdate = (stats: GameStats) => {
    // Stats are handled within the main state update
    // This could be used for additional processing if needed
  };

  private triggerStateUpdate(isGameOver: boolean = false): void {
    this.onStateUpdate({
      score: this.engineCore.getScoreSystem().getTotalScore(),
      scoreBreakdown: this.engineCore.getScoreSystem().getScoreBreakdown(),
      comboInfo: this.engineCore.getScoreSystem().getComboInfo(),
      time: this.engineCore.getGameLogic().getGameTime(), 
      isGameOver: isGameOver || this.engineCore.getGameLogic().isGameOverState(), 
      fps: this.currentFPS,
      meteors: this.engineCore.getGameLogic().getMeteorCount(),
      particles: this.engineCore.getParticleSystem().getParticleCount(),
      poolSizes: {
        meteors: this.engineCore.getMeteorPool().getPoolSize(),
        particles: this.engineCore.getParticleSystem().getPoolSize()
      },
      autoScaling: {
        enabled: this.engineCore.getAutoScalingEnabled(),
        shadowsEnabled: this.engineCore.getPerformanceSettings().shadowsEnabled,
        maxParticles: this.engineCore.getPerformanceSettings().dynamicMaxParticles,
        adaptiveTrailsActive: this.engineCore.getPerformanceSettings().adaptiveTrailsActive
      },
      performance: {
        averageFrameTime: this.averageFrameTime,
        memoryUsage: this.memoryUsageEstimate,
        lastScalingEvent: this.lastScalingEvent
      },
      settings: this.engineCore.getSettings()
    });
  }

  private applyPerformanceMode(enabled: boolean): void {
    this.engineCore.getPerformanceSettings().performanceModeActive = enabled;
    
    if (enabled) {
      // Enable performance optimizations
      this.engineCore.getPerformanceSettings().shadowsEnabled = false;
      this.engineCore.getPerformanceSettings().dynamicMaxParticles = 150;
      this.engineCore.getPerformanceSettings().adaptiveTrailsActive = false;
      
      // Update systems
      this.engineCore.getParticleSystem().setMaxParticles(this.engineCore.getPerformanceSettings().dynamicMaxParticles);
      this.engineCore.getRenderSystem().setShadowsEnabled(this.engineCore.getPerformanceSettings().shadowsEnabled);
      
      this.lastScalingEvent = 'performance-mode-enabled';
      this.scalingEventTime = Date.now();
      console.log('🔧 Performance Mode activated - Shadows disabled, particles reduced to 150, trails disabled');
    } else {
      // Restore full quality
      this.engineCore.getPerformanceSettings().shadowsEnabled = true;
      this.engineCore.getPerformanceSettings().dynamicMaxParticles = 300;
      this.engineCore.getPerformanceSettings().adaptiveTrailsActive = true;
      
      // Update systems
      this.engineCore.getParticleSystem().setMaxParticles(this.engineCore.getPerformanceSettings().dynamicMaxParticles);
      this.engineCore.getRenderSystem().setShadowsEnabled(this.engineCore.getPerformanceSettings().shadowsEnabled);
      
      this.lastScalingEvent = 'performance-mode-disabled';
      this.scalingEventTime = Date.now();
      console.log('🔧 Performance Mode deactivated - Full visual quality restored');
    }
  }

  private async updateUserStatistics(): Promise<void> {
    // Import ProfileAPI dynamically to avoid circular dependencies
    try {
      const { ProfileAPI } = await import('../api/profiles');
      const { useAuthStore } = await import('../store/authStore');
      
      const authStore = useAuthStore.getState();
      const user = authStore.user;
      
      if (user) {
        const gameStats = this.engineCore.getGameLogic().getGameStats();
        await ProfileAPI.updateGameStats(user.id, {
          gamesPlayed: 1,
          meteorsDestroyed: gameStats.meteorsDestroyed,
          survivalTime: gameStats.survivalTime,
          distanceTraveled: Math.floor(gameStats.distanceTraveled),
          currentScore: this.engineCore.getScoreSystem().getTotalScore(),
          currentMeteors: gameStats.meteorsDestroyed,
          currentSurvivalTime: gameStats.survivalTime,
          currentDistance: Math.floor(gameStats.distanceTraveled)
        });
        
        console.log('📊 User statistics updated:', {
          meteorsDestroyed: gameStats.meteorsDestroyed,
          survivalTime: gameStats.survivalTime.toFixed(1),
          distanceTraveled: Math.floor(gameStats.distanceTraveled)
        });
      }
    } catch (error) {
      console.warn('Failed to update user statistics:', error);
    }
  }

  // Audio control methods
  public getAudioManager(): AudioManager {
    return this.audioManager;
  }
  
  public async changeTrack(trackName: string): Promise<boolean> {
    return await this.audioManager.playTrack(trackName, 3.0); // 3 second crossfade
  }
  
  public setMasterVolume(volume: number): void {
    this.audioManager.setMasterVolume(volume);
  }
  
  public setMusicVolume(volume: number): void {
    this.audioManager.setMusicVolume(volume);
  }
  
  public toggleMusic(): void {
    this.audioManager.toggleMusic();
  }
}