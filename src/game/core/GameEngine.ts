import { RenderSystem } from '../systems/RenderSystem';
import { ParticleSystem } from '../systems/ParticleSystem';
import { CollisionSystem } from '../systems/CollisionSystem';
import { ScoreSystem } from '../systems/ScoreSystem';
import { DefenseSystem } from '../systems/DefenseSystem';
import { ChainDetonationManager } from '../entities/ChainDetonation';
import { PowerUpManager } from '../entities/PowerUp';
import { InputHandler } from '../InputHandler';
import { AudioManager } from '../audio/AudioManager';
import { ObjectPool } from '../utils/ObjectPool';
import { SpatialGrid } from '../utils/SpatialGrid';
import { Meteor, createMeteor, resetMeteor } from '../entities/Meteor';

export interface GameConfig {
  canvas: HTMLCanvasElement;
  maxMeteors?: number;
  maxParticles?: number;
  enablePerformanceMode?: boolean;
  audioEnabled?: boolean;
}

export interface GameState {
  score: number;
  time: number;
  isGameOver: boolean;
  isPaused: boolean;
  fps: number;
  meteors: number;
  particles: number;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private config: Required<GameConfig>;
  
  // Core systems
  private renderSystem: RenderSystem;
  private particleSystem: ParticleSystem;
  private collisionSystem: CollisionSystem;
  private scoreSystem: ScoreSystem;
  private defenseSystem: DefenseSystem;
  private chainDetonationManager: ChainDetonationManager;
  private powerUpManager: PowerUpManager;
  private inputHandler: InputHandler;
  private audioManager: AudioManager;
  
  // Object pools
  private meteorPool: ObjectPool<Meteor>;
  private spatialGrid: SpatialGrid;
  
  // Game state
  private gameState: GameState = {
    score: 0,
    time: 0,
    isGameOver: false,
    isPaused: false,
    fps: 0,
    meteors: 0,
    particles: 0
  };
  
  // Performance tracking
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  
  // Animation frame
  private animationFrame: number | null = null;

  constructor(config: GameConfig) {
    this.canvas = config.canvas;
    this.config = {
      canvas: config.canvas,
      maxMeteors: config.maxMeteors ?? 50,
      maxParticles: config.maxParticles ?? 300,
      enablePerformanceMode: config.enablePerformanceMode ?? false,
      audioEnabled: config.audioEnabled ?? true
    };
    
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
    this.powerUpManager = new PowerUpManager();
    this.inputHandler = new InputHandler(this.canvas, this.handleKnockback.bind(this));
    
    if (this.config.audioEnabled) {
      this.audioManager = new AudioManager();
    }
    
    // Initialize object pools
    this.meteorPool = new ObjectPool(createMeteor, resetMeteor, 10, this.config.maxMeteors);
    this.spatialGrid = new SpatialGrid(this.canvas.width, this.canvas.height, 150);
    this.collisionSystem = new CollisionSystem(this.spatialGrid);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.handleResize.bind(this));
    window.addEventListener('blur', this.pause.bind(this));
    window.addEventListener('focus', this.resume.bind(this));
  }

  private handleResize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.spatialGrid.resize(this.canvas.width, this.canvas.height);
  }

  private handleKnockback(): void {
    // Knockback logic implementation
    console.log('Knockback activated');
  }

  private gameLoop = (timestamp: number): void => {
    if (this.gameState.isPaused) {
      this.animationFrame = requestAnimationFrame(this.gameLoop);
      return;
    }

    const deltaTime = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;

    this.updateFPS(timestamp);
    this.update(deltaTime);
    this.render();

    this.animationFrame = requestAnimationFrame(this.gameLoop);
  };

  private updateFPS(timestamp: number): void {
    this.frameCount++;
    
    if (timestamp - this.fpsUpdateTime >= 1000) {
      this.gameState.fps = Math.round((this.frameCount * 1000) / (timestamp - this.fpsUpdateTime));
      this.frameCount = 0;
      this.fpsUpdateTime = timestamp;
    }
  }

  private update(deltaTime: number): void {
    if (this.gameState.isGameOver) return;

    this.gameState.time += deltaTime / 1000;
    
    // Update systems
    this.particleSystem.update(deltaTime);
    this.scoreSystem.update(deltaTime, performance.now());
    this.powerUpManager.update(this.gameState.time, deltaTime);
    this.defenseSystem.update(deltaTime);
    this.chainDetonationManager.update(deltaTime, performance.now());
    
    // Update game state
    this.gameState.score = this.scoreSystem.getTotalScore();
    this.gameState.meteors = this.meteorPool.getActiveCount();
    this.gameState.particles = this.particleSystem.getParticleCount();
  }

  private render(): void {
    // Render implementation
    this.renderSystem.render({
      mouseX: this.inputHandler.getMousePosition().x,
      mouseY: this.inputHandler.getMousePosition().y,
      activeMeteors: [],
      activeParticles: this.particleSystem.getActiveParticles(),
      powerUps: this.powerUpManager.getPowerUps(),
      scoreTexts: this.scoreSystem.getActiveScoreTexts(),
      playerTrail: [],
      powerUpCharges: this.powerUpManager.getCharges(),
      maxPowerUpCharges: this.powerUpManager.getMaxCharges(),
      isGameOver: this.gameState.isGameOver,
      playerRingPhase: 0,
      screenShake: { x: 0, y: 0, intensity: 0, duration: 0 },
      adaptiveTrailsActive: true,
      gameSettings: {
        volume: 0.5,
        soundEnabled: true,
        showUI: true,
        showFPS: true,
        showPerformanceStats: true,
        showTrails: true,
        cursorColor: '#06b6d4'
      }
    });
  }

  // Public API
  public start(): void {
    if (this.animationFrame) return;
    
    this.lastFrameTime = performance.now();
    this.fpsUpdateTime = this.lastFrameTime;
    this.gameState.isPaused = false;
    this.animationFrame = requestAnimationFrame(this.gameLoop);
  }

  public pause(): void {
    this.gameState.isPaused = true;
  }

  public resume(): void {
    this.gameState.isPaused = false;
    this.lastFrameTime = performance.now();
  }

  public stop(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  public getGameState(): GameState {
    return { ...this.gameState };
  }

  public destroy(): void {
    this.stop();
    this.inputHandler.cleanup();
    window.removeEventListener('resize', this.handleResize.bind(this));
    window.removeEventListener('blur', this.pause.bind(this));
    window.removeEventListener('focus', this.resume.bind(this));
  }
}