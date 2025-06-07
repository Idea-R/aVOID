import { RenderSystem } from './systems/RenderSystem';
import { ParticleSystem } from './systems/ParticleSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { ScoreSystem } from './systems/ScoreSystem';
import { PowerUpManager } from './entities/PowerUp';
import { ObjectPool } from './utils/ObjectPool';
import { SpatialGrid } from './utils/SpatialGrid';
import { Meteor, createMeteor, resetMeteor } from './entities/Meteor';

interface GameEngineConfig {
  canvas: HTMLCanvasElement;
  maxMeteors?: number;
  targetFPS?: number;
  enablePerformanceMode?: boolean;
}

interface GameState {
  isRunning: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  gameTime: number;
  score: number;
  level: number;
}

export class GameEngine {
  // Core properties
  private canvas: HTMLCanvasElement;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  
  // Game state
  private gameState: GameState = {
    isRunning: false,
    isPaused: false,
    isGameOver: false,
    gameTime: 0,
    score: 0,
    level: 1
  };
  
  // Configuration
  private config: Required<GameEngineConfig>;
  
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
  
  // Performance tracking
  private frameCount: number = 0;
  private fpsCounter: number = 0;
  private lastFPSUpdate: number = 0;
  
  constructor(config: GameEngineConfig) {
    this.canvas = config.canvas;
    this.config = {
      canvas: config.canvas,
      maxMeteors: config.maxMeteors ?? 50,
      targetFPS: config.targetFPS ?? 60,
      enablePerformanceMode: config.enablePerformanceMode ?? false
    };
    
    this.initializeSystems();
    this.setupEventListeners();
  }
  
  /**
   * Initialize all game systems
   */
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
  }
  
  /**
   * Set up event listeners for user input
   */
  private setupEventListeners(): void {
    // Canvas resize handling
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // Input event listeners will be added here
    // this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    // this.canvas.addEventListener('click', this.handleClick.bind(this));
  }
  
  /**
   * Main game loop
   */
  private gameLoop = (timestamp: number): void => {
    if (!this.gameState.isRunning || this.gameState.isPaused) {
      return;
    }
    
    const deltaTime = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;
    
    // Update FPS counter
    this.updateFPS(timestamp);
    
    // Update game systems
    this.update(deltaTime);
    
    // Render frame
    this.render();
    
    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };
  
  /**
   * Enhanced game loop with performance monitoring and adaptive timing
   */
  private enhancedGameLoop = (timestamp: number): void => {
    if (!this.gameState.isRunning) return;
    
    // Handle pause state
    if (this.gameState.isPaused) {
      // Don't update game logic, but keep the loop alive for resume
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
    
    // Update FPS and performance metrics
    this.updatePerformanceMetrics(timestamp, deltaTime);
    
    // Update game systems with delta time
    this.updateGameSystems(deltaTime);
    
    // Render current frame
    this.renderFrame();
    
    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.enhancedGameLoop);
  };
  
  /**
   * Update performance metrics and FPS tracking
   */
  private updatePerformanceMetrics(timestamp: number, deltaTime: number): void {
    this.frameCount++;
    
    // Update FPS every second
    if (timestamp - this.lastFPSUpdate >= 1000) {
      this.fpsCounter = Math.round((this.frameCount * 1000) / (timestamp - this.lastFPSUpdate));
      this.frameCount = 0;
      this.lastFPSUpdate = timestamp;
      
      // Performance mode detection
      if (this.config.enablePerformanceMode && this.fpsCounter < 45) {
        this.enablePerformanceOptimizations();
      } else if (this.fpsCounter > 55) {
        this.disablePerformanceOptimizations();
      }
    }
  }
  
  /**
   * Update all game systems with delta time
   */
  private updateGameSystems(deltaTime: number): void {
    if (this.gameState.isGameOver) return;
    
    // Update game time
    this.gameState.gameTime += deltaTime / 1000;
    
    // Update core systems
    this.particleSystem.update(deltaTime);
    this.scoreSystem.update(deltaTime, performance.now());
    this.powerUpManager.update(this.gameState.gameTime, deltaTime);
    
    // Update game entities
    this.updateMeteors(deltaTime);
    
    // Process collisions
    this.checkCollisions();
    
    // Update score
    this.gameState.score = this.scoreSystem.getTotalScore();
  }
  
  /**
   * Render current frame
   */
  private renderFrame(): void {
    // Clear spatial grid for next frame
    this.spatialGrid.clear();
    
    // Render implementation will be enhanced
    // this.renderSystem.render(this.buildRenderState());
  }
  
  /**
   * Enable performance optimizations when FPS drops
   */
  private enablePerformanceOptimizations(): void {
    // Reduce particle count
    this.particleSystem.setMaxParticles(150);
    
    // Disable expensive visual effects
    // this.renderSystem.setShadowsEnabled(false);
    
    console.log('🔧 Performance optimizations enabled (FPS < 45)');
  }
  
  /**
   * Disable performance optimizations when FPS improves
   */
  private disablePerformanceOptimizations(): void {
    // Restore full particle count
    this.particleSystem.setMaxParticles(300);
    
    // Re-enable visual effects
    // this.renderSystem.setShadowsEnabled(true);
    
    console.log('🔧 Performance optimizations disabled (FPS > 55)');
  }
  /**
   * Update all game systems
   */
  private update(deltaTime: number): void {
    if (this.gameState.isGameOver) return;
    
    // Update game time
    this.gameState.gameTime += deltaTime / 1000;
    
    // Update systems
    this.particleSystem.update(deltaTime);
    this.scoreSystem.update(deltaTime, performance.now());
    this.powerUpManager.update(this.gameState.gameTime, deltaTime);
    
    // Update meteors
    this.updateMeteors(deltaTime);
    
    // Check collisions
    this.checkCollisions();
  }
  
  /**
   * Render current frame
   */
  private render(): void {
    // Render implementation will be added
    // this.renderSystem.render(renderState);
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
   * Update FPS counter
   */
  private updateFPS(currentTime: number): void {
    this.frameCount++;
    
    if (currentTime - this.lastFPSUpdate >= 1000) {
      this.fpsCounter = this.frameCount;
      this.frameCount = 0;
      this.lastFPSUpdate = currentTime;
    }
  }
  
  /**
   * Handle canvas resize
   */
  private handleResize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.spatialGrid.resize(this.canvas.width, this.canvas.height);
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
    if (this.gameState.isRunning) return;
    
    this.gameState.isRunning = true;
    this.gameState.isPaused = false;
    this.transitionToState('playing', 'game_started');
    this.lastFrameTime = performance.now();
    this.lastFPSUpdate = this.lastFrameTime;
    this.animationFrameId = requestAnimationFrame(this.enhancedGameLoop);
    
    console.log('🎮 GameEngine started with enhanced loop');
  }
  
  /**
   * Stop the game engine
   */
  public stop(): void {
    this.gameState.isRunning = false;
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    console.log('🎮 GameEngine stopped');
  }
  
  /**
   * Pause the game
   */
  public pause(): void {
    if (!this.gameState.isRunning) return;
    
    this.gameState.isPaused = true;
    console.log('⏸️ GameEngine paused');
  }
  
  /**
   * Resume the game
   */
  public resume(): void {
    if (this.gameState.isRunning && this.gameState.isPaused) {
      this.gameState.isPaused = false;
      // Reset frame timing to prevent large delta
      this.lastFrameTime = performance.now();
      console.log('▶️ GameEngine resumed');
    }
  }
  
  /**
   * Reset game to initial state
   */
  public reset(): void {
    this.gameState = {
      isRunning: false,
      isPaused: false,
      isGameOver: false,
      gameTime: 0,
      score: 0,
      level: 1
    };
    
    // Clear active entities
    this.activeMeteors.forEach(meteor => this.meteorPool.release(meteor));
    this.activeMeteors.length = 0;
    
    // Reset systems
    this.particleSystem.reset();
    this.scoreSystem.reset();
    this.powerUpManager.reset();
  }
  
  /**
   * Get current game state
   */
  public getGameState(): Readonly<GameState> {
    return { ...this.gameState };
  }
  
  /**
   * Get current FPS
   */
  public getFPS(): number {
    return this.fpsCounter;
  }
  
  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stop();
    window.removeEventListener('resize', this.handleResize.bind(this));
    
    // Cleanup systems
    this.renderSystem.destroy();
    this.particleSystem.clear();
    this.meteorPool.clear();
  }
}