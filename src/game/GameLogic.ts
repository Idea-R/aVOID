import { Meteor } from './entities/Meteor';
import { SpatialGrid } from './utils/SpatialGrid';
import { PowerUpManager } from './entities/PowerUp';
import { ParticleSystem } from './systems/ParticleSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { ScoreSystem } from './systems/ScoreSystem';
import { DefenseSystem } from './systems/DefenseSystem';
import { ChainDetonationManager } from './entities/ChainDetonation';
import { InputHandler } from './InputHandler';
import { GameStatsManager, GameStats } from './managers/GameStatsManager';
import { GameStateManager, ScreenShake } from './managers/GameStateManager';
import { MeteorManager } from './managers/MeteorManager';
import { PlayerTrailManager, TrailPoint } from './managers/PlayerTrailManager';

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

export class GameLogic {
  private canvas: HTMLCanvasElement;
  private systems: GameSystems;
  private settings: GameSettings;
  private spatialGrid: SpatialGrid;
  
  // Specialized managers
  private statsManager: GameStatsManager;
  private stateManager: GameStateManager;
  private meteorManager: MeteorManager;
  private trailManager: PlayerTrailManager;

  constructor(canvas: HTMLCanvasElement, systems: GameSystems, settings: GameSettings) {
    this.canvas = canvas;
    this.systems = systems;
    this.settings = settings;
    
    // Initialize spatial grid
    this.spatialGrid = new SpatialGrid(canvas.width, canvas.height, 150);
    this.systems.collisionSystem.updateSpatialGrid(this.spatialGrid);
    
    // Initialize managers
    this.statsManager = new GameStatsManager();
    this.stateManager = new GameStateManager();
    this.meteorManager = new MeteorManager(canvas, systems.inputHandler, this.spatialGrid);
    this.trailManager = new PlayerTrailManager();
  }

  // Callback setters
  set onGameOver(callback: () => void) {
    this.stateManager.setGameOverCallback(callback);
  }

  set onStatsUpdate(callback: (stats: GameStats) => void) {
    this.statsManager.setStatsUpdateCallback(callback);
  }

  update(deltaTime: number, adaptiveTrailsActive: boolean, performanceModeActive: boolean): void {
    if (this.stateManager.isGameOverState()) return;
    
    // Update game state
    this.stateManager.updateGameTime(deltaTime);
    const isGracePeriod = this.stateManager.updateGracePeriod();
    this.stateManager.updateKnockbackCooldown(deltaTime);
    this.stateManager.updatePlayerRingPhase(deltaTime, this.systems.powerUpManager.getCharges() > 0);
    this.stateManager.updateScreenShake(deltaTime);
    
    // Clear spatial grid
    this.spatialGrid.clear();
    
    // Update systems
    this.systems.powerUpManager.update(this.stateManager.getGameTime(), deltaTime);
    this.systems.particleSystem.update(deltaTime);
    this.systems.scoreSystem.update(deltaTime, performance.now());
    this.systems.defenseSystem.update(deltaTime);
    this.systems.chainDetonationManager.update(deltaTime, performance.now());
    
    // Get player position
    const mousePos = this.systems.inputHandler.getMousePosition();
    
    // Update player trail
    this.trailManager.update(mousePos.x, mousePos.y);
    
    // Process defense system
    const defenseResult = this.systems.defenseSystem.processMeteorDefense(this.meteorManager.getActiveMeteors());
    
    // Check if player is in electrical danger zone
    const playerInElectricalZone = this.systems.defenseSystem.checkPlayerCollision(mousePos.x, mousePos.y);
    if (playerInElectricalZone) {
      this.systems.particleSystem.createExplosion(mousePos.x, mousePos.y, '#00bfff');
      this.stateManager.triggerGameOver();
      return;
    }
    
    // Handle destroyed meteors from defense system
    this.meteorManager.processDestroyedMeteors(defenseResult.destroyedMeteors);
    this.statsManager.incrementMeteorsDestroyed(defenseResult.destroyedMeteors.length);
    for (const meteor of defenseResult.destroyedMeteors) {
      this.systems.scoreSystem.addMeteorScore(meteor.x, meteor.y, meteor.isSuper);
    }
    
    // Handle deflected meteors
    for (const { meteor, newVx, newVy } of defenseResult.deflectedMeteors) {
      meteor.vx = newVx;
      meteor.vy = newVy;
    }
    
    // Update survival score
    this.systems.scoreSystem.updateSurvivalScore(this.stateManager.getGameTime());
    
    // Check power-up collection
    const collectedPowerUp = this.systems.powerUpManager.checkCollision(mousePos.x, mousePos.y);
    if (collectedPowerUp && collectedPowerUp.type === 'knockback') {
      this.stateManager.resetPlayerRingPhase();
      this.systems.particleSystem.createEnergyAbsorption(collectedPowerUp.x, collectedPowerUp.y);
      console.log('🔋 Power-up collected! Current charges:', this.systems.powerUpManager.getCharges(), '/', this.systems.powerUpManager.getMaxCharges());
    }
    
    // Check chain detonation fragment collection
    const chainResult = this.systems.chainDetonationManager.checkCollision(mousePos.x, mousePos.y);
    if (chainResult.collected) {
      if (chainResult.fragment) {
        this.systems.scoreSystem.addChainFragmentScore(chainResult.fragment.x, chainResult.fragment.y);
      }
      
      if (chainResult.completed) {
        console.log('🔗✨ All chain fragments collected! Preparing massive detonation...');
        const meteorsDestroyed = this.processChainDetonationScreenClear();
        console.log(`🔗💥 Chain detonation destroyed ${meteorsDestroyed} meteors!`);
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const totalPoints = this.systems.scoreSystem.processChainDetonationScore(meteorsDestroyed, centerX, centerY);
        console.log(`🔗 Enhanced chain detonation scoring awarded ${totalPoints} points for ${meteorsDestroyed} meteors`);
        
        this.stateManager.setScreenShake({ x: 0, y: 0, intensity: 30, duration: 1500 });
      }
    }
    
    // Update stats
    this.statsManager.updateDistanceTraveled(mousePos.x, mousePos.y);
    this.statsManager.updateSurvivalTime(this.stateManager.getGameTime());

    // Spawn meteors (only after grace period)
    if (!isGracePeriod && this.meteorManager.shouldSpawnMeteor(this.stateManager.getGameTime())) {
      this.meteorManager.spawnMeteor(this.stateManager.getGameTime());
    }

    // Update meteors
    this.meteorManager.update(this.stateManager.getGameTime(), adaptiveTrailsActive, performanceModeActive, this.settings.showTrails);
    
    // Check meteor-player collisions
    this.checkMeteorPlayerCollisions(mousePos);
  }

  private checkMeteorPlayerCollisions(mousePos: { x: number; y: number }): void {
    const collisionResult = this.systems.collisionSystem.checkPlayerMeteorCollisions(
      mousePos.x, 
      mousePos.y, 
      this.meteorManager.getActiveMeteors()
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
      this.stateManager.triggerGameOver();
    }
  }

  // Handle meteors destroyed by knockback effects
  processKnockbackDestroyedMeteors(destroyedMeteors: Meteor[]): void {
    this.meteorManager.processDestroyedMeteors(destroyedMeteors);
    this.statsManager.incrementMeteorsDestroyed(destroyedMeteors.length);
    for (const meteor of destroyedMeteors) {
      this.systems.scoreSystem.addMeteorScore(meteor.x, meteor.y, meteor.isSuper);
    }
  }

  // Handle complete screen clear from chain detonation
  processChainDetonationScreenClear(): number {
    const meteorsDestroyed = this.meteorManager.clearAllMeteors();
    this.statsManager.incrementMeteorsDestroyed(meteorsDestroyed);
    return meteorsDestroyed;
  }

  resetGame(): void {
    this.stateManager.reset();
    this.statsManager.reset();
    this.meteorManager.reset();
    this.trailManager.reset();
    console.log('GameLogic reset completed');
  }

  updateSpatialGrid(width: number, height: number): void {
    this.spatialGrid.resize(width, height);
    this.systems.collisionSystem.updateSpatialGrid(this.spatialGrid);
    this.meteorManager.updateSpatialGrid(this.spatialGrid);
  }

  updateSystems(newSystems: GameSystems): void {
    this.systems = newSystems;
    this.systems.collisionSystem.updateSpatialGrid(this.spatialGrid);
  }

  // Public getters - delegate to appropriate managers
  getActiveMeteors(): Meteor[] {
    return this.meteorManager.getActiveMeteors();
  }

  getPlayerTrail(): TrailPoint[] {
    return this.trailManager.getTrail();
  }

  getScreenShake(): ScreenShake {
    return this.stateManager.getScreenShake();
  }

  setScreenShake(shake: ScreenShake): void {
    this.stateManager.setScreenShake(shake);
  }

  getPlayerRingPhase(): number {
    return this.stateManager.getPlayerRingPhase();
  }

  getGameTime(): number {
    return this.stateManager.getGameTime();
  }

  getGameStats(): GameStats {
    return this.statsManager.getStats();
  }

  getMeteorCount(): number {
    return this.meteorManager.getMeteorCount();
  }

  isGameOverState(): boolean {
    return this.stateManager.isGameOverState();
  }

  getSettings(): GameSettings {
    return this.settings;
  }

  // Add missing getSpatialGrid method
  getSpatialGrid(): SpatialGrid {
    return this.spatialGrid;
  }
}