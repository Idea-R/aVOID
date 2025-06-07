import { Meteor, createMeteor, resetMeteor, initializeMeteor } from './entities/Meteor';
import { ObjectPool } from './utils/ObjectPool';
import { SpatialGrid } from './utils/SpatialGrid';
import { PowerUpManager } from './entities/PowerUp';
import { ParticleSystem } from './systems/ParticleSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { ScoreSystem } from './systems/ScoreSystem';
import { DefenseSystem } from './systems/DefenseSystem';
import { ChainDetonationManager } from './entities/ChainDetonation';
import { InputHandler } from './InputHandler';

export interface GameSystems {
  particleSystem: ParticleSystem;
  collisionSystem: CollisionSystem;
  scoreSystem: ScoreSystem;
  defenseSystem: DefenseSystem;
  chainDetonationManager: ChainDetonationManager;
  powerUpManager: PowerUpManager;
  inputHandler: InputHandler;
}

export interface GameSettings {
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

export interface GameStats {
  meteorsDestroyed: number;
  survivalTime: number;
  distanceTraveled: number;
  lastPlayerX: number;
  lastPlayerY: number;
}

export class GameLogic {
  private canvas: HTMLCanvasElement;
  private systems: GameSystems;
  private settings: GameSettings;
  
  // Object pools
  private meteorPool: ObjectPool<Meteor>;
  private activeMeteors: Meteor[] = [];
  private spatialGrid: SpatialGrid;
  
  // Game state
  private gameTime: number = 0;
  private isGameOver: boolean = false;
  private gracePeriodActive: boolean = false;
  private gracePeriodDuration: number = 3000; // 3 seconds
  private gracePeriodStartTime: number = 0;
  
  // Game mechanics
  private knockbackCooldown: number = 0;
  private playerRingPhase: number = 0;
  private screenShake: { x: number; y: number; intensity: number; duration: number } = { x: 0, y: 0, intensity: 0, duration: 0 };
  
  // Player trail
  private playerTrail: Array<{ x: number; y: number; alpha: number }> = [];
  
  // Performance limits
  private readonly MAX_METEORS = 50;
  
  // Game statistics
  private gameStats: GameStats = {
    meteorsDestroyed: 0,
    survivalTime: 0,
    distanceTraveled: 0,
    lastPlayerX: 0,
    lastPlayerY: 0
  };
  
  // Callbacks
  onGameOver: () => void = () => {};
  onStatsUpdate: (stats: GameStats) => void = () => {};

  constructor(canvas: HTMLCanvasElement, systems: GameSystems, settings: GameSettings) {
    this.canvas = canvas;
    this.systems = systems;
    this.settings = settings;
    
    // Initialize object pools
    this.meteorPool = new ObjectPool(createMeteor, resetMeteor, 20, this.MAX_METEORS);
    
    // Initialize spatial grid
    this.spatialGrid = new SpatialGrid(canvas.width, canvas.height, 150);
    this.systems.collisionSystem.updateSpatialGrid(this.spatialGrid);
  }

  update(deltaTime: number, adaptiveTrailsActive: boolean, performanceModeActive: boolean): void {
    if (this.isGameOver) return;
    
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
    this.systems.powerUpManager.update(this.gameTime, deltaTime);
    this.systems.particleSystem.update(deltaTime);
    this.systems.scoreSystem.update(deltaTime, performance.now());
    this.systems.defenseSystem.update(deltaTime);
    this.systems.chainDetonationManager.update(deltaTime, performance.now());
    
    // Process defense system
    const defenseResult = this.systems.defenseSystem.processMeteorDefense(this.activeMeteors);
    
    // Get player position
    const mousePos = this.systems.inputHandler.getMousePosition();
    
    // Check if player is in electrical danger zone
    const playerInElectricalZone = this.systems.defenseSystem.checkPlayerCollision(mousePos.x, mousePos.y);
    if (playerInElectricalZone) {
      // Player eliminated by electrical defense system
      this.systems.particleSystem.createExplosion(mousePos.x, mousePos.y, '#00bfff'); // Electric blue explosion
      this.triggerGameOver();
      return;
    }
    
    // Handle destroyed meteors from defense system
    for (const meteor of defenseResult.destroyedMeteors) {
      this.releaseMeteor(meteor);
      this.gameStats.meteorsDestroyed++;
      this.systems.scoreSystem.addMeteorScore(meteor.x, meteor.y, meteor.isSuper);
    }
    
    // Handle deflected meteors
    for (const { meteor, newVx, newVy } of defenseResult.deflectedMeteors) {
      meteor.vx = newVx;
      meteor.vy = newVy;
    }
    
    // Update survival score
    this.systems.scoreSystem.updateSurvivalScore(this.gameTime);
    
    // Check power-up collection
    const collectedPowerUp = this.systems.powerUpManager.checkCollision(mousePos.x, mousePos.y);
    if (collectedPowerUp && collectedPowerUp.type === 'knockback') {
      this.playerRingPhase = 0;
      
      // Create collection effect particles
      this.systems.particleSystem.createExplosion(collectedPowerUp.x, collectedPowerUp.y, '#ffd700', false);
      
      console.log('🔋 Power-up collected! Current charges:', this.systems.powerUpManager.getCharges(), '/', this.systems.powerUpManager.getMaxCharges());
    }
    
    // Check chain detonation fragment collection
    const chainResult = this.systems.chainDetonationManager.checkCollision(mousePos.x, mousePos.y);
    if (chainResult.collected) {
      if (chainResult.fragment) {
        // Add points for fragment collection
        this.systems.scoreSystem.addChainFragmentScore(chainResult.fragment.x, chainResult.fragment.y);
      }
      
      if (chainResult.completed) {
        console.log('🔗✨ All chain fragments collected! Preparing massive detonation...');
        
        // ACTUALLY DESTROY THE METEORS!
        console.log('🔗🐛 DEBUG: GameLogic calling processChainDetonationScreenClear()');
        const meteorsDestroyed = this.processChainDetonationScreenClear();
        console.log(`🔗💥 GameLogic destroyed ${meteorsDestroyed} meteors via chain detonation!`);
        
        // Use the new enhanced scoring method with combo mechanics
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const totalPoints = this.systems.scoreSystem.processChainDetonationScore(meteorsDestroyed, centerX, centerY);
        console.log(`🔗🐛 DEBUG: Enhanced chain detonation scoring awarded ${totalPoints} points for ${meteorsDestroyed} meteors`);
        
        // Add screen shake for effect
        this.setScreenShake({ x: 0, y: 0, intensity: 30, duration: 1500 });
      }
    }
    
    // Update knockback cooldown
    if (this.knockbackCooldown > 0) {
      this.knockbackCooldown -= deltaTime / 1000;
    }
    
    // Update player ring phase based on charges
    const charges = this.systems.powerUpManager.getCharges();
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
    this.playerTrail.unshift({ x: mousePos.x, y: mousePos.y, alpha: 1 });
    if (this.playerTrail.length > 25) this.playerTrail.pop();
    this.playerTrail.forEach(point => point.alpha *= 0.92);
    
    // Track distance traveled
    if (this.gameStats.lastPlayerX !== 0 || this.gameStats.lastPlayerY !== 0) {
      const dx = mousePos.x - this.gameStats.lastPlayerX;
      const dy = mousePos.y - this.gameStats.lastPlayerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      this.gameStats.distanceTraveled += distance;
    }
    this.gameStats.lastPlayerX = mousePos.x;
    this.gameStats.lastPlayerY = mousePos.y;
    
    // Update survival time
    this.gameStats.survivalTime = this.gameTime;

    // Spawn meteors with performance consideration
    // Only spawn meteors after grace period
    if (!this.gracePeriodActive) {
      const baseSpawnChance = 0.003;
      const maxSpawnChance = 0.02;
      const spawnIncrease = Math.min(this.gameTime / 150, maxSpawnChance - baseSpawnChance);
      if (Math.random() < baseSpawnChance + spawnIncrease) {
        this.spawnMeteor();
      }
    }

    // Update meteors
    this.updateMeteors(adaptiveTrailsActive, performanceModeActive, mousePos);
    
    // Notify of stats update
    this.onStatsUpdate(this.gameStats);
  }

  private updateMeteors(adaptiveTrailsActive: boolean, performanceModeActive: boolean, mousePos: { x: number; y: number }): void {
    for (let i = this.activeMeteors.length - 1; i >= 0; i--) {
      const meteor = this.activeMeteors[i];
      if (!meteor.active) continue;

      meteor.x += meteor.vx;
      meteor.y += meteor.vy;

      // Update trail with length limit (only if trails are enabled)
      if (this.settings.showTrails && adaptiveTrailsActive && !performanceModeActive) {
        meteor.trail.unshift({ x: meteor.x, y: meteor.y, alpha: 1 });
        const maxTrailLength = performanceModeActive ? 3 : 6; // Further reduced in performance mode
        if (meteor.trail.length > maxTrailLength) meteor.trail.pop();
        meteor.trail.forEach(point => point.alpha *= 0.85); // Unified alpha decay
      } else {
        meteor.trail.length = 0;
      }

      // Add to spatial grid
      this.spatialGrid.insert({
        x: meteor.x,
        y: meteor.y,
        radius: meteor.radius,
        id: meteor.id
      });

      // Check collision with player using optimized collision system
      const collisionResult = this.systems.collisionSystem.checkPlayerMeteorCollisions(
        mousePos.x, 
        mousePos.y, 
        [meteor] // Check individual meteor for performance
      );
      
      if (collisionResult.hasCollision) {
        this.systems.particleSystem.createExplosion(mousePos.x, mousePos.y, '#06b6d4');
        if (collisionResult.collidedMeteor) {
          this.systems.particleSystem.createExplosion(
            collisionResult.collidedMeteor.x, 
            collisionResult.collidedMeteor.y, 
            collisionResult.collidedMeteor.color, 
            collisionResult.collidedMeteor.isSuper
          );
        }
        this.triggerGameOver();
        return;
      }

      // Remove meteors that are off-screen
      if (meteor.x < -50 || meteor.x > this.canvas.width + 50 ||
          meteor.y < -50 || meteor.y > this.canvas.height + 50) {
        this.releaseMeteor(meteor);
      }
    }
  }

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

    const mousePos = this.systems.inputHandler.getMousePosition();
    const angle = Math.atan2(mousePos.y - y, mousePos.x - x);
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

  private triggerGameOver(): void {
    this.isGameOver = true;
    this.onGameOver();
  }

  // Public interface methods
  getActiveMeteors(): Meteor[] {
    return this.activeMeteors;
  }

  getPlayerTrail(): Array<{ x: number; y: number; alpha: number }> {
    return this.playerTrail;
  }

  getScreenShake(): { x: number; y: number; intensity: number; duration: number } {
    return this.screenShake;
  }

  setScreenShake(shake: { x: number; y: number; intensity: number; duration: number }): void {
    this.screenShake = shake;
  }

  getPlayerRingPhase(): number {
    return this.playerRingPhase;
  }

  getGameTime(): number {
    return this.gameTime;
  }

  getGameStats(): GameStats {
    return { ...this.gameStats };
  }

  getMeteorCount(): number {
    return this.activeMeteors.length;
  }

  isGameOverState(): boolean {
    return this.isGameOver;
  }

  resetGame(): void {
    this.isGameOver = false;
    this.gameTime = 0;
    this.gracePeriodActive = true;
    this.gracePeriodStartTime = performance.now();
    this.knockbackCooldown = 0;
    this.playerRingPhase = 0;
    this.screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };
    
    // Clear all active objects
    this.activeMeteors.forEach(meteor => this.meteorPool.release(meteor));
    this.activeMeteors.length = 0;
    this.playerTrail.length = 0;
    
    // Reset game statistics
    this.gameStats = {
      meteorsDestroyed: 0,
      survivalTime: 0,
      distanceTraveled: 0,
      lastPlayerX: 0,
      lastPlayerY: 0
    };
    
    console.log('GameLogic reset completed');
  }

  clearAllMeteors(): number {
    const meteorCount = this.activeMeteors.length;
    
    // Properly release all meteors back to the pool
    this.activeMeteors.forEach(meteor => {
      this.meteorPool.release(meteor);
      this.gameStats.meteorsDestroyed++;
    });
    
    // Clear the active meteors array
    this.activeMeteors.length = 0;
    
    console.log(`🔗 Cleared ${meteorCount} meteors from screen`);
    return meteorCount;
  }

  updateSpatialGrid(width: number, height: number): void {
    this.spatialGrid.resize(width, height);
    this.systems.collisionSystem.updateSpatialGrid(this.spatialGrid);
  }

  updateSystems(newSystems: GameSystems): void {
    this.systems = newSystems;
    // Update spatial grid reference for collision system
    this.systems.collisionSystem.updateSpatialGrid(this.spatialGrid);
  }

  // Handle meteors destroyed by knockback effects
  processKnockbackDestroyedMeteors(destroyedMeteors: Meteor[]): void {
    for (const meteor of destroyedMeteors) {
      this.releaseMeteor(meteor);
      this.gameStats.meteorsDestroyed++;
      this.systems.scoreSystem.addMeteorScore(meteor.x, meteor.y, meteor.isSuper);
    }
  }

  // Handle complete screen clear from chain detonation
  processChainDetonationScreenClear(): number {
    const meteorsDestroyed = this.activeMeteors.length;
    
    // Create a copy of the meteors array to avoid modification during iteration
    const meteorsToDestroy = [...this.activeMeteors];
    
    // Clear the active meteors array first
    this.activeMeteors.length = 0;
    
    // Release all meteors properly
    for (const meteor of meteorsToDestroy) {
      this.meteorPool.release(meteor);
      this.gameStats.meteorsDestroyed++;
    }
    
    console.log(`🔗💥 Chain detonation destroyed ${meteorsDestroyed} meteors!`);
    return meteorsDestroyed;
  }
}