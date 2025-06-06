import { PowerUpManager } from './entities/PowerUp';
import { ObjectPool } from './utils/ObjectPool';
import { SpatialGrid } from './utils/SpatialGrid';
import { Meteor, createMeteor, resetMeteor, initializeMeteor } from './entities/Meteor';
import { RenderSystem } from './systems/RenderSystem';
import { ParticleSystem } from './systems/ParticleSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { ScoreSystem, ScoreBreakdown, ComboInfo } from './systems/ScoreSystem';

interface GameSettings {
  volume: number;
  soundEnabled: boolean;
  showUI: boolean;
  showFPS: boolean;
  showPerformanceStats: boolean;
  showTrails: boolean;
  performanceMode: boolean;
  cursorColor: string;
  autoPerformanceModeEnabled?: boolean;
}

type GameState = 'playing' | 'paused' | 'gameOver' | 'ready';

export default class GameEngine {
  private canvas: HTMLCanvasElement;
  private animationFrame: number | null = null;
  private lastTime: number = 0;
  private gameTime: number = 0;
  private gameState: GameState = 'ready';
  private gracePeriodActive: boolean = false;
  private gracePeriodDuration: number = 3000; // 3 seconds
  private gracePeriodStartTime: number = 0;
  private pausedTime: number = 0;
  private lastPauseTime: number = 0;
  
  // Systems
  private renderSystem: RenderSystem;
  private particleSystem: ParticleSystem;
  private collisionSystem: CollisionSystem;
  private scoreSystem: ScoreSystem;
  
  // Object pools
  private meteorPool: ObjectPool<Meteor>;
  private activeMeteors: Meteor[] = [];
  
  // Spatial partitioning
  private spatialGrid: SpatialGrid;
  
  // Performance limits
  private readonly MAX_METEORS = 50;
  
  // Game entities
  private powerUpManager: PowerUpManager = new PowerUpManager();
  private playerTrail: Array<{ x: number; y: number; alpha: number }> = [];
  private knockbackCooldown: number = 0;
  private playerRingPhase: number = 0;
  private screenShake: { x: number; y: number; intensity: number; duration: number } = { x: 0, y: 0, intensity: 0, duration: 0 };
  
  // Player position (managed by input system)
  public mouseX: number = 0;
  public mouseY: number = 0;
  
  // Game statistics tracking
  private gameStats = {
    meteorsDestroyed: 0,
    survivalTime: 0,
    distanceTraveled: 0,
    lastPlayerX: 0,
    lastPlayerY: 0
  };
  
  // State update callback
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
    powerUpCharges: number;
    maxPowerUpCharges: number;
  }) => void = () => {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    
    // Initialize systems
    this.renderSystem = new RenderSystem(canvas);
    this.particleSystem = new ParticleSystem();
    this.spatialGrid = new SpatialGrid(window.innerWidth, window.innerHeight, 150);
    this.collisionSystem = new CollisionSystem(this.spatialGrid);
    this.scoreSystem = new ScoreSystem();
    
    // Initialize object pools
    this.meteorPool = new ObjectPool(createMeteor, resetMeteor, 20, this.MAX_METEORS);
    
    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas);
  }

  // Core game loop
  private gameLoop = (timestamp: number): void => {
    if (this.gameState === 'paused') return;
    
    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;
    
    // Update game systems
    this.update(deltaTime);
    
    // Render frame
    this.render();
    
    // Continue loop if game is running
    if (this.gameState === 'playing') {
      this.animationFrame = requestAnimationFrame(this.gameLoop);
    }
  };

  // Main update cycle
  private update(deltaTime: number): void {
    if (this.gameState !== 'playing') return;
    
    // Handle grace period
    if (this.gracePeriodActive) {
      const currentTime = performance.now();
      if (currentTime - this.gracePeriodStartTime >= this.gracePeriodDuration) {
        this.gracePeriodActive = false;
        console.log('🎮 Grace period ended - meteors will now spawn');
      }
    }
    
    this.gameTime += deltaTime / 1000;
    
    // Clear spatial grid
    this.spatialGrid.clear();
    
    // Update systems
    this.powerUpManager.update(this.gameTime, deltaTime);
    this.particleSystem.update(deltaTime);
    this.scoreSystem.update(deltaTime, performance.now());
    
    // Update survival score
    this.scoreSystem.updateSurvivalScore(this.gameTime);
    
    // Check power-up collection
    const collectedPowerUp = this.powerUpManager.checkCollision(this.mouseX, this.mouseY);
    if (collectedPowerUp && collectedPowerUp.type === 'knockback') {
      this.playerRingPhase = 0;
      this.particleSystem.createExplosion(collectedPowerUp.x, collectedPowerUp.y, '#ffd700', false);
    }
    
    // Update cooldowns and effects
    if (this.knockbackCooldown > 0) {
      this.knockbackCooldown -= deltaTime / 1000;
    }
    
    // Update player ring phase based on charges
    const charges = this.powerUpManager.getCharges();
    if (charges > 0) {
      this.playerRingPhase += deltaTime * 0.008;
    }
    
    // Update screen shake
    if (this.screenShake.duration > 0) {
      this.screenShake.duration -= deltaTime;
      const intensity = (this.screenShake.duration / 500) * this.screenShake.intensity;
      this.screenShake.x = (Math.random() - 0.5) * intensity;
      this.screenShake.y = (Math.random() - 0.5) * intensity;
    } else {
      this.screenShake.x = 0;
      this.screenShake.y = 0;
    }
    
    // Update player trail
    this.updatePlayerTrail();
    
    // Track distance traveled
    this.updateDistanceTracking();
    
    // Update survival time
    this.gameStats.survivalTime = this.gameTime;

    // Spawn meteors (only after grace period)
    if (!this.gracePeriodActive) {
      this.updateMeteorSpawning();
    }

    // Update meteors
    this.updateMeteors();
  }

  private updatePlayerTrail(): void {
    this.playerTrail.unshift({ x: this.mouseX, y: this.mouseY, alpha: 1 });
    if (this.playerTrail.length > 25) this.playerTrail.pop();
    this.playerTrail.forEach(point => point.alpha *= 0.92);
  }

  private updateDistanceTracking(): void {
    if (this.gameStats.lastPlayerX !== 0 || this.gameStats.lastPlayerY !== 0) {
      const dx = this.mouseX - this.gameStats.lastPlayerX;
      const dy = this.mouseY - this.gameStats.lastPlayerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      this.gameStats.distanceTraveled += distance;
    }
    this.gameStats.lastPlayerX = this.mouseX;
    this.gameStats.lastPlayerY = this.mouseY;
  }

  private updateMeteorSpawning(): void {
    const baseSpawnChance = 0.003;
    const maxSpawnChance = 0.02;
    const spawnIncrease = Math.min(this.gameTime / 150, maxSpawnChance - baseSpawnChance);
    if (Math.random() < baseSpawnChance + spawnIncrease) {
      this.spawnMeteor();
    }
  }

  private updateMeteors(): void {
    for (let i = this.activeMeteors.length - 1; i >= 0; i--) {
      const meteor = this.activeMeteors[i];
      if (!meteor.active) continue;

      // Update meteor position
      meteor.x += meteor.vx;
      meteor.y += meteor.vy;

      // Update meteor gradient
      meteor.gradient = this.renderSystem.createMeteorGradient(meteor.x, meteor.y, meteor.radius, meteor.color, meteor.isSuper);

      // Update trail (simplified for core engine)
      meteor.trail.unshift({ x: meteor.x, y: meteor.y, alpha: 1 });
      const maxTrailLength = 6;
      if (meteor.trail.length > maxTrailLength) meteor.trail.pop();
      meteor.trail.forEach(point => point.alpha *= 0.85);

      // Add to spatial grid
      this.spatialGrid.insert({
        x: meteor.x,
        y: meteor.y,
        radius: meteor.radius,
        id: meteor.id
      });

      // Check collision with player
      const collisionResult = this.collisionSystem.checkPlayerMeteorCollisions(
        this.mouseX, 
        this.mouseY, 
        [meteor]
      );
      
      if (collisionResult.hasCollision) {
        this.handlePlayerCollision(collisionResult.collidedMeteor);
        break;
      }
    }
  }

  private handlePlayerCollision(collidedMeteor?: Meteor): void {
    this.particleSystem.createExplosion(this.mouseX, this.mouseY, '#06b6d4');
    if (collidedMeteor) {
      this.particleSystem.createExplosion(
        collidedMeteor.x, 
        collidedMeteor.y, 
        collidedMeteor.color, 
        collidedMeteor.isSuper
      );
    }
    this.gameState = 'gameOver';
    this.stopGameLoop();
  }

  private render(): void {
    const renderState = {
      mouseX: this.mouseX,
      mouseY: this.mouseY,
      activeMeteors: this.activeMeteors,
      activeParticles: this.particleSystem.getActiveParticles(),
      powerUps: this.powerUpManager.getPowerUps(),
      scoreTexts: this.scoreSystem.getActiveScoreTexts(),
      playerTrail: this.playerTrail,
      powerUpCharges: this.powerUpManager.getCharges(),
      maxPowerUpCharges: this.powerUpManager.getMaxCharges(),
      isGameOver: this.gameState === 'gameOver',
      playerRingPhase: this.playerRingPhase,
      screenShake: this.screenShake,
      adaptiveTrailsActive: true,
      gameSettings: {
        volume: 0.7,
        soundEnabled: true,
        showUI: true,
        showFPS: true,
        showPerformanceStats: true,
        showTrails: true,
        performanceMode: false,
        cursorColor: '#06b6d4'
      }
    };

    this.renderSystem.render(renderState);
  }

  // Public game control methods
  public start(): void {
    if (this.gameState === 'ready' || this.gameState === 'gameOver') {
      this.gameState = 'playing';
      this.gracePeriodActive = true;
      this.gracePeriodStartTime = performance.now();
      this.lastTime = performance.now();
      this.startGameLoop();
      console.log('🎮 Game started with grace period');
    }
  }

  public pause(): void {
    if (this.gameState === 'playing') {
      this.gameState = 'paused';
      this.lastPauseTime = performance.now();
      this.stopGameLoop();
      console.log('🎮 Game paused');
    }
  }

  public resume(): void {
    if (this.gameState === 'paused') {
      this.gameState = 'playing';
      
      // Calculate pause duration and adjust timers
      const pauseDuration = performance.now() - this.lastPauseTime;
      this.pausedTime += pauseDuration;
      
      if (this.gracePeriodActive) {
        this.gracePeriodStartTime += pauseDuration;
      }
      
      this.lastTime = performance.now();
      this.startGameLoop();
      console.log('🎮 Game resumed');
    }
  }

  public resetGame(): void {
    this.stopGameLoop();
    this.gameState = 'ready';
    this.gameTime = 0;
    this.pausedTime = 0;
    this.gracePeriodActive = false;
    
    // Reset game entities
    this.activeMeteors.forEach(meteor => this.meteorPool.release(meteor));
    this.activeMeteors.length = 0;
    this.playerTrail.length = 0;
    this.knockbackCooldown = 0;
    this.playerRingPhase = 0;
    this.screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };
    
    // Reset systems
    this.powerUpManager.reset();
    this.particleSystem.reset();
    this.scoreSystem.reset();
    
    // Reset stats
    this.gameStats = {
      meteorsDestroyed: 0,
      survivalTime: 0,
      distanceTraveled: 0,
      lastPlayerX: 0,
      lastPlayerY: 0
    };
    
    console.log('🎮 Game reset');
  }

  // Knockback activation (called by input system)
  public activateKnockback(): boolean {
    if (!this.powerUpManager.useCharge()) return false;

    this.knockbackCooldown = 30;
    this.screenShake = { x: 0, y: 0, intensity: 15, duration: 500 };
    this.particleSystem.createShockwave(this.mouseX, this.mouseY);

    // Process knockback collisions
    const knockbackResult = this.collisionSystem.processKnockbackCollisions(
      this.mouseX, 
      this.mouseY, 
      this.activeMeteors
    );

    // Process destroyed meteors
    for (const meteor of knockbackResult.destroyedMeteors) {
      this.particleSystem.createExplosion(meteor.x, meteor.y, meteor.color, meteor.isSuper);
      this.releaseMeteor(meteor);
      this.gameStats.meteorsDestroyed++;
    }

    // Process pushed meteors
    for (const { meteor, pushForce, angle } of knockbackResult.pushedMeteors) {
      meteor.vx += Math.cos(angle) * pushForce;
      meteor.vy += Math.sin(angle) * pushForce;
    }

    // Process scoring
    const destroyedMeteorData = knockbackResult.destroyedMeteors.map(meteor => ({
      x: meteor.x,
      y: meteor.y,
      isSuper: meteor.isSuper
    }));
    
    this.scoreSystem.processKnockbackScore(destroyedMeteorData, performance.now());
    return true;
  }

  // Game loop control
  private startGameLoop(): void {
    if (this.animationFrame === null) {
      this.animationFrame = requestAnimationFrame(this.gameLoop);
    }
  }

  private stopGameLoop(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  // Utility methods
  private spawnMeteor(): void {
    if (this.activeMeteors.length >= this.MAX_METEORS) return;

    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    switch(side) {
      case 0: x = Math.random() * this.canvas.width; y = -20; break;
      case 1: x = this.canvas.width + 20; y = Math.random() * this.canvas.height; break;
      case 2: x = Math.random() * this.canvas.width; y = this.canvas.height + 20; break;
      default: x = -20; y = Math.random() * this.canvas.height; break;
    }

    const angle = Math.atan2(this.mouseY - y, this.mouseX - x);
    const isSuper = Math.random() < 0.15;
    
    const baseSpeed = 0.8;
    const speedIncrease = Math.min(this.gameTime / 90, 2.0);
    let speed = baseSpeed + speedIncrease;
    speed *= 0.8 + Math.random() * 0.4;
    if (isSuper) speed *= 2;

    const color = isSuper ? '#ff4040' : this.getRandomColor();
    const baseRadius = isSuper ? 12 : 6;
    const radiusVariation = isSuper ? 4 : 6;
    
    const meteor = this.meteorPool.get();
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

    this.activeMeteors.push(meteor);
  }

  private releaseMeteor(meteor: Meteor): void {
    const index = this.activeMeteors.indexOf(meteor);
    if (index > -1) {
      this.activeMeteors.splice(index, 1);
      this.meteorPool.release(meteor);
    }
  }

  private getRandomColor(): string {
    const hue = Math.random() * 360;
    return `hsla(${hue}, 100%, 60%, 1)`;
  }

  private resizeCanvas = (): void => {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.spatialGrid.resize(window.innerWidth, window.innerHeight);
    this.collisionSystem.updateSpatialGrid(this.spatialGrid);
  };

  // Public getters
  public isStarted(): boolean {
    return this.gameState === 'playing';
  }

  public isPausedState(): boolean {
    return this.gameState === 'paused';
  }

  public isGameOver(): boolean {
    return this.gameState === 'gameOver';
  }

  public getGameTime(): number {
    return this.gameTime;
  }

  public getScore(): number {
    return this.scoreSystem.getTotalScore();
  }

  public getGameStats() {
    return { ...this.gameStats };
  }

  // Cleanup
  public stop(): void {
    this.stopGameLoop();
    window.removeEventListener('resize', this.resizeCanvas);
    this.renderSystem.destroy();
    console.log('🎮 Game engine stopped');
  }

  // Pre-warm method for initialization during countdown
  public preWarm(): void {
    console.log('🎮 Pre-warming game engine...');
    // Initialize systems without starting the game loop
    this.particleSystem.setMaxParticles(300);
    this.renderSystem.setShadowsEnabled(true);
  }
}