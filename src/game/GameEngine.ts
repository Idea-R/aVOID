import { RenderSystem } from './systems/RenderSystem';
import { ParticleSystem } from './systems/ParticleSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { ScoreSystem } from './systems/ScoreSystem';
import { PowerUpManager } from './entities/PowerUp';
import { ObjectPool } from './utils/ObjectPool';
import { SpatialGrid } from './utils/SpatialGrid';
import { Meteor, createMeteor, resetMeteor } from './entities/Meteor';
import { PerformanceMonitor, PerformanceMetrics } from './managers/PerformanceMonitor';
import { EngineInputManager } from './managers/EngineInputManager';
import { EngineStateManager, GameState } from './managers/EngineStateManager';

interface GameEngineConfig {
  canvas: HTMLCanvasElement;
  maxMeteors?: number;
  targetFPS?: number;
  enablePerformanceMode?: boolean;
}

export class GameEngine {
  // Core properties
  private canvas: HTMLCanvasElement;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  
  // Configuration
  private config: Required<GameEngineConfig>;
  
  // Specialized managers
  private performanceMonitor!: PerformanceMonitor;
  private inputManager!: EngineInputManager;
  private stateManager!: EngineStateManager;
  
  // Core systems
  private renderSystem: RenderSystem;
  private particleSystem: ParticleSystem;
  private collisionSystem: CollisionSystem;
  private scoreSystem: ScoreSystem;
  private powerUpManager: PowerUpManager;
  
  // Object management
  private meteorPool: ObjectPool<Meteor>;
  private activeMeteors: Meteor[] = [];
  private spatialGrid: SpatialGrid;
  
  constructor(config: GameEngineConfig) {
    this.canvas = config.canvas;
    this.config = {
      canvas: config.canvas,
      maxMeteors: config.maxMeteors ?? 50,
      targetFPS: config.targetFPS ?? 60,
      enablePerformanceMode: config.enablePerformanceMode ?? false
    };
    
    this.initializeManagers();
    this.initializeSystems();
  }
  
  private initializeManagers(): void {
    // Initialize specialized managers
    this.performanceMonitor = new PerformanceMonitor();
    this.inputManager = new EngineInputManager(this.canvas);
    this.stateManager = new EngineStateManager();
    
    // Setup manager callbacks
    this.inputManager.setResizeCallback(() => this.handleManagerResize());
    this.stateManager.setStateChangeCallback((state) => this.handleStateChange(state));
  }
  
  private initializeSystems(): void {
    // Initialize core systems
    this.renderSystem = new RenderSystem(this.canvas);
    this.particleSystem = new ParticleSystem();
    this.scoreSystem = new ScoreSystem();
    this.powerUpManager = new PowerUpManager();
    
    // Initialize spatial partitioning
    this.spatialGrid = new SpatialGrid(
      this.canvas.width, 
      this.canvas.height, 
      100
    );
    
    // Initialize collision system with spatial grid
    this.collisionSystem = new CollisionSystem(this.spatialGrid);
    
    // Initialize object pools
    this.meteorPool = new ObjectPool(
      createMeteor,
      resetMeteor,
      10,
      this.config.maxMeteors
    );
    
    // Connect managers to systems
    this.performanceMonitor.setParticleSystem(this.particleSystem);
    this.inputManager.setSpatialGrid(this.spatialGrid);
  }
  
  private handleManagerResize(): void {
    // Additional resize handling if needed
    console.log('🔄 Engine handling resize');
  }
  
  private handleStateChange(state: GameState): void {
    // Handle state changes if needed
    console.log('🔄 Engine state changed:', state);
  }
  
  /**
   * Enhanced game loop with performance monitoring and adaptive timing
   */
  private enhancedGameLoop = (timestamp: number): void => {
    if (!this.stateManager.isRunning()) return;
    
    // Handle pause state
    if (this.stateManager.isPaused()) {
      this.animationFrameId = requestAnimationFrame(this.enhancedGameLoop);
      return;
    }
    
    // Calculate delta time with frame limiting
    const deltaTime = Math.min(timestamp - this.lastFrameTime, 33.33); // Cap at ~30fps minimum
    this.lastFrameTime = timestamp;
    
    // Skip frame if delta is too small (avoid micro-updates)
    if (deltaTime < 1) {
      this.animationFrameId = requestAnimationFrame(this.enhancedGameLoop);
      return;
    }
    
    // Update performance metrics
    this.performanceMonitor.updatePerformanceMetrics(timestamp, deltaTime, this.config.enablePerformanceMode);
    
    // Update game systems with delta time
    this.updateGameSystems(deltaTime);
    
    // Render current frame
    this.renderFrame();
    
    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.enhancedGameLoop);
  };
  
  /**
   * Update all game systems with delta time
   */
  private updateGameSystems(deltaTime: number): void {
    if (!this.stateManager.shouldUpdate()) return;
    
    // Update game time in state manager
    this.stateManager.updateGameTime(deltaTime);
    
    // Update core systems
    this.particleSystem.update(deltaTime);
    this.scoreSystem.update(deltaTime, performance.now());
    this.powerUpManager.update(this.stateManager.getGameTime(), deltaTime);
    
    // Update game entities
    this.updateMeteors(deltaTime);
    
    // Process collisions
    this.checkCollisions();
    
    // Update score in state manager
    this.stateManager.updateScore(this.scoreSystem.getTotalScore());
  }
  
  /**
   * Render current frame
   */
  private renderFrame(): void {
    if (!this.stateManager.shouldRender()) return;
    
    // Clear spatial grid for next frame
    this.spatialGrid.clear();
    
    // Render implementation will be enhanced
    // this.renderSystem.render(this.buildRenderState());
  }
  
  /**
   * Update meteor entities
   */
  private updateMeteors(deltaTime: number): void {
    // Clear spatial grid
    this.spatialGrid.clear();
    
    // Update active meteors
    for (let i = this.activeMeteors.length - 1; i >= 0; i--) {
      const meteor = this.activeMeteors[i];
      
      // Update meteor position
      meteor.x += meteor.vx * deltaTime / 16.67; // Normalize to 60fps
      meteor.y += meteor.vy * deltaTime / 16.67;
      
      // Add to spatial grid
      this.spatialGrid.insert({
        x: meteor.x,
        y: meteor.y,
        radius: meteor.radius,
        id: meteor.id
      });
      
      // Remove off-screen meteors
      if (this.isOffScreen(meteor)) {
        this.removeMeteor(i);
      }
    }
  }
  
  /**
   * Check for collisions between game entities
   */
  private checkCollisions(): void {
    // Collision detection implementation
  }
  
  /**
   * Check if meteor is off-screen
   */
  private isOffScreen(meteor: Meteor): boolean {
    const margin = 50;
    return (
      meteor.x < -margin ||
      meteor.x > this.canvas.width + margin ||
      meteor.y < -margin ||
      meteor.y > this.canvas.height + margin
    );
  }
  
  /**
   * Remove meteor from active list
   */
  private removeMeteor(index: number): void {
    const meteor = this.activeMeteors[index];
    this.activeMeteors.splice(index, 1);
    this.meteorPool.release(meteor);
  }
  
  // Public API methods
  
  /**
   * Start the game engine
   */
  public start(): void {
    if (!this.stateManager.start()) return;
    
    this.lastFrameTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.enhancedGameLoop);
    
    console.log('🎮 GameEngine started with enhanced loop');
  }
  
  /**
   * Stop the game engine
   */
  public stop(): void {
    this.stateManager.stop();
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  /**
   * Pause the game
   */
  public pause(): void {
    this.stateManager.pause();
  }
  
  /**
   * Resume the game
   */
  public resume(): void {
    if (this.stateManager.resume()) {
      // Reset frame timing to prevent large delta
      this.lastFrameTime = performance.now();
    }
  }
  
  /**
   * Reset game to initial state
   */
  public reset(): void {
    this.stateManager.reset();
    
    // Clear active entities
    this.activeMeteors.forEach(meteor => this.meteorPool.release(meteor));
    this.activeMeteors.length = 0;
    
    // Reset systems
    this.particleSystem.reset();
    this.scoreSystem.reset();
    this.powerUpManager.reset();
    this.performanceMonitor.reset();
  }
  
  /**
   * Get current game state
   */
  public getGameState(): Readonly<GameState> {
    return this.stateManager.getState();
  }
  
  /**
   * Get current FPS
   */
  public getFPS(): number {
    return this.performanceMonitor.getFPS();
  }
  
  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    return this.performanceMonitor.getMetrics();
  }
  
  /**
   * Enable/disable performance optimizations
   */
  public setPerformanceOptimizations(enabled: boolean): void {
    if (enabled) {
      this.performanceMonitor.enablePerformanceOptimizations();
    } else {
      this.performanceMonitor.disablePerformanceOptimizations();
    }
  }
  
  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stop();
    this.inputManager.destroy();
    
    // Cleanup systems
    this.renderSystem.destroy();
    this.particleSystem.clear();
    this.meteorPool.clear();
  }
}