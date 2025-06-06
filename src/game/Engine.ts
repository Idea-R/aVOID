import { PowerUpManager, PowerUp } from './entities/PowerUp';
import { ObjectPool } from './utils/ObjectPool';
import { SpatialGrid, GridObject } from './utils/SpatialGrid';
import { Meteor, createMeteor, resetMeteor, initializeMeteor } from './entities/Meteor';
import { RenderSystem } from './systems/RenderSystem';
import { ParticleSystem } from './systems/ParticleSystem';
import { CollisionSystem } from './systems/CollisionSystem';

interface GameSettings {
  volume: number;
  soundEnabled: boolean;
  showUI: boolean;
  showFPS: boolean;
  showPerformanceStats: boolean;
  showTrails: boolean;
}

export default class Engine {
  private canvas: HTMLCanvasElement;
  private animationFrame: number | null = null;
  private lastTime: number = 0;
  private gameTime: number = 0;
  private score: number = 0;
  
  // Systems
  private renderSystem: RenderSystem;
  private particleSystem: ParticleSystem;
  private collisionSystem: CollisionSystem;
  
  // Object pools
  private meteorPool: ObjectPool<Meteor>;
  private activeMeteors: Meteor[] = [];
  
  // Spatial partitioning
  private spatialGrid: SpatialGrid;
  
  // Performance limits
  private readonly MAX_METEORS = 50;
  
  private playerTrail: Array<{ x: number; y: number; alpha: number }> = [];
  private isGameOver: boolean = false;
  private powerUpManager: PowerUpManager = new PowerUpManager();
  private hasKnockbackPower: boolean = false;
  private knockbackCooldown: number = 0;
  private playerRingPhase: number = 0;
  private screenShake: { x: number; y: number; intensity: number; duration: number } = { x: 0, y: 0, intensity: 0, duration: 0 };
  private lastClickTime: number = 0;
  private clickCount: number = 0;
  
  // FPS tracking
  private frameCount: number = 0;
  private fpsLastTime: number = 0;
  private currentFPS: number = 0;
  private fpsUpdateInterval: number = 500;
  
  // Performance tracking
  private meteorCount: number = 0;
  
  // Game settings
  private gameSettings: GameSettings = {
    volume: 0.7,
    soundEnabled: true,
    showUI: true,
    showFPS: true,
    showPerformanceStats: true,
    showTrails: true
  };
  
  onStateUpdate: (state: { 
    score: number; 
    time: number; 
    isGameOver: boolean; 
    fps: number;
    meteors: number;
    particles: number;
    poolSizes: { meteors: number; particles: number };
    settings: GameSettings;
  }) => void = () => {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    
    // Initialize systems
    this.renderSystem = new RenderSystem(canvas);
    this.particleSystem = new ParticleSystem();
    this.collisionSystem = new CollisionSystem(this.spatialGrid);
    
    // Initialize object pools
    this.meteorPool = new ObjectPool(createMeteor, resetMeteor, 20, this.MAX_METEORS);
    
    // Initialize spatial grid
    this.spatialGrid = new SpatialGrid(window.innerWidth, window.innerHeight, 150);
    
    // Load settings from localStorage
    this.loadSettings();
    
    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('dblclick', this.handleDoubleClick);
    
    // Mobile touch event listeners
    window.addEventListener('touchstart', this.handleTouchStart);
    window.addEventListener('touchmove', this.handleTouchMove);
    window.addEventListener('touchend', this.handleTouchEnd);
    
    window.addEventListener('gameSettingsChanged', this.handleSettingsChange);
  }

  private loadSettings() {
    try {
      const savedSettings = localStorage.getItem('avoidGameSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        this.gameSettings = { ...this.gameSettings, ...parsed };
      }
    } catch (error) {
      console.error('Error loading game settings:', error);
    }
  }

  private handleSettingsChange = (event: CustomEvent) => {
    this.gameSettings = { ...this.gameSettings, ...event.detail };
  };

  private mouseX: number = 0;
  private mouseY: number = 0;
  
  // Touch tracking
  private activeTouchId: number | null = null;
  private isTouchDevice: boolean = false;

  private handleMouseMove = (e: MouseEvent) => {
    if (this.isGameOver || this.isTouchDevice) return;
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
  };

  private handleTouchStart = (e: TouchEvent) => {
    if (this.isGameOver) return;
    
    e.preventDefault(); // Prevent scrolling and other default behaviors
    this.isTouchDevice = true;
    
    // Use the first touch if no active touch
    if (this.activeTouchId === null && e.touches.length > 0) {
      const touch = e.touches[0];
      this.activeTouchId = touch.identifier;
      
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = touch.clientX - rect.left;
      this.mouseY = touch.clientY - rect.top;
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    if (this.isGameOver) return;
    
    e.preventDefault(); // Prevent scrolling
    this.isTouchDevice = true;
    
    // Find the active touch among current touches
    if (this.activeTouchId !== null) {
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        if (touch.identifier === this.activeTouchId) {
          const rect = this.canvas.getBoundingClientRect();
          this.mouseX = touch.clientX - rect.left;
          this.mouseY = touch.clientY - rect.top;
          break;
        }
      }
    }
  };
  private handleDoubleClick = (e: MouseEvent) => {
    if (this.isGameOver || !this.hasKnockbackPower || this.isTouchDevice) return;
    this.activateKnockback();
  };

  private handleTouchEnd = (e: TouchEvent) => {
    if (this.isGameOver) return;
    
    e.preventDefault();
    this.isTouchDevice = true;
    
    // Check if our active touch ended
    let activeTouchEnded = false;
    if (this.activeTouchId !== null) {
      activeTouchEnded = true;
      // Check if the active touch is still in the remaining touches
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === this.activeTouchId) {
          activeTouchEnded = false;
          break;
        }
      }
    }
    
    // If active touch ended, clear it and potentially switch to another touch
    if (activeTouchEnded) {
      this.activeTouchId = null;
      
      // If there are still touches, use the first one as the new active touch
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        this.activeTouchId = touch.identifier;
        
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = touch.clientX - rect.left;
        this.mouseY = touch.clientY - rect.top;
      }
    }
    
    // Handle double-tap for knockback power (mobile equivalent of double-click)
    const now = Date.now();
    if (now - this.lastClickTime < 300) {
      this.clickCount++;
      if (this.clickCount >= 2 && this.hasKnockbackPower) {
        this.activateKnockback();
        this.clickCount = 0;
      }
    } else {
      this.clickCount = 1;
    }
    this.lastClickTime = now;
  };

  private activateKnockback() {
    if (!this.hasKnockbackPower) return;

    this.hasKnockbackPower = false;
    this.knockbackCooldown = 30;

    this.screenShake = { x: 0, y: 0, intensity: 15, duration: 500 };
    this.particleSystem.createShockwave(this.mouseX, this.mouseY);

    // Use collision system for optimized knockback detection
    const knockbackResult = this.collisionSystem.processKnockbackCollisions(
      this.mouseX, 
      this.mouseY, 
      this.activeMeteors
    );

    // Process destroyed meteors
    for (const meteor of knockbackResult.destroyedMeteors) {
      this.particleSystem.createExplosion(meteor.x, meteor.y, meteor.color, meteor.isSuper);
      this.releaseMeteor(meteor);
    }

    // Process pushed meteors
    for (const { meteor, pushForce, angle } of knockbackResult.pushedMeteors) {
      meteor.vx += Math.cos(angle) * pushForce;
      meteor.vy += Math.sin(angle) * pushForce;
    }

    this.score += knockbackResult.destroyedMeteors.length * 50;
  }

  private resizeCanvas = () => {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.spatialGrid.resize(window.innerWidth, window.innerHeight);
    this.collisionSystem.updateSpatialGrid(this.spatialGrid);
  };

  private getRandomColor(): string {
    const hue = Math.random() * 360;
    return `hsla(${hue}, 100%, 60%, 1)`;
  }

  private spawnMeteor() {
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

  private releaseMeteor(meteor: Meteor) {
    const index = this.activeMeteors.indexOf(meteor);
    if (index > -1) {
      this.activeMeteors.splice(index, 1);
      this.meteorPool.release(meteor);
    }
  }

  private updateFPS(timestamp: number) {
    this.frameCount++;
    
    if (timestamp - this.fpsLastTime >= this.fpsUpdateInterval) {
      this.currentFPS = Math.round((this.frameCount * 1000) / (timestamp - this.fpsLastTime));
      this.frameCount = 0;
      this.fpsLastTime = timestamp;
    }
  }

  private update(deltaTime: number) {
    if (this.isGameOver) return;
    
    // Apply adaptive particle limits based on current FPS
    this.particleSystem.adaptiveParticleLimits(this.currentFPS);
    
    this.gameTime += deltaTime / 1000;
    
    // Clear spatial grid
    this.spatialGrid.clear();
    
    // Update systems
    this.powerUpManager.update(this.gameTime, deltaTime);
    this.particleSystem.update(deltaTime);
    
    const collectedPowerUp = this.powerUpManager.checkCollision(this.mouseX, this.mouseY);
    if (collectedPowerUp && collectedPowerUp.type === 'knockback') {
      this.hasKnockbackPower = true;
      this.playerRingPhase = 0;
    }
    
    if (this.knockbackCooldown > 0) {
      this.knockbackCooldown -= deltaTime / 1000;
    }
    
    if (this.hasKnockbackPower) {
      this.playerRingPhase += deltaTime * 0.008;
    }
    
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
    this.playerTrail.unshift({ x: this.mouseX, y: this.mouseY, alpha: 1 });
    if (this.playerTrail.length > 25) this.playerTrail.pop();
    this.playerTrail.forEach(point => point.alpha *= 0.92);

    // Spawn meteors with performance consideration
    const baseSpawnChance = 0.003;
    const maxSpawnChance = 0.02;
    const spawnIncrease = Math.min(this.gameTime / 150, maxSpawnChance - baseSpawnChance);
    if (Math.random() < baseSpawnChance + spawnIncrease) {
      this.spawnMeteor();
    }

    // Update meteors
    for (let i = this.activeMeteors.length - 1; i >= 0; i--) {
      const meteor = this.activeMeteors[i];
      if (!meteor.active) continue;

      meteor.x += meteor.vx;
      meteor.y += meteor.vy;

      meteor.gradient = this.renderSystem.createMeteorGradient(meteor.x, meteor.y, meteor.radius, meteor.color, meteor.isSuper);

      // Update trail with length limit (only if trails are enabled)
      if (this.gameSettings.showTrails) {
        meteor.trail.unshift({ x: meteor.x, y: meteor.y, alpha: 1 });
        const maxTrailLength = meteor.isSuper ? 15 : 12;
        if (meteor.trail.length > maxTrailLength) meteor.trail.pop();
        meteor.trail.forEach(point => point.alpha *= meteor.isSuper ? 0.9 : 0.88);
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
      const collisionResult = this.collisionSystem.checkPlayerMeteorCollisions(
        this.mouseX, 
        this.mouseY, 
        [meteor] // Check individual meteor for performance
      );
      
      if (collisionResult.hasCollision) {
        this.particleSystem.createExplosion(this.mouseX, this.mouseY, '#06b6d4');
        if (collisionResult.collidedMeteor) {
          this.particleSystem.createExplosion(
            collisionResult.collidedMeteor.x, 
            collisionResult.collidedMeteor.y, 
            collisionResult.collidedMeteor.color, 
            collisionResult.collidedMeteor.isSuper
          );
        }
        this.isGameOver = true;
        
        // Force immediate state update
        this.onStateUpdate({ 
          score: this.score, 
          time: this.gameTime, 
          isGameOver: true, 
          fps: this.currentFPS,
          meteors: this.meteorCount,
          particles: this.particleSystem.getParticleCount(),
          poolSizes: {
            meteors: this.meteorPool.getPoolSize(),
            particles: this.particleSystem.getPoolSize()
          },
          settings: this.gameSettings
        });
        
        return;
      }

      // Remove meteors that are off-screen
      if (meteor.x < -50 || meteor.x > this.canvas.width + 50 ||
          meteor.y < -50 || meteor.y > this.canvas.height + 50) {
        this.releaseMeteor(meteor);
      }
    }

    this.score = Math.floor(this.gameTime);
    this.meteorCount = this.activeMeteors.length;
    
    // Always update state, even during normal gameplay
    this.onStateUpdate({ 
      score: this.score, 
      time: this.gameTime, 
      isGameOver: this.isGameOver, 
      fps: this.currentFPS,
      meteors: this.meteorCount,
      particles: this.particleSystem.getParticleCount(),
      poolSizes: {
        meteors: this.meteorPool.getPoolSize(),
        particles: this.particleSystem.getPoolSize()
      },
      settings: this.gameSettings
    });
  }

  private render() {
    const renderState = {
      mouseX: this.mouseX,
      mouseY: this.mouseY,
      activeMeteors: this.activeMeteors,
      activeParticles: this.particleSystem.getActiveParticles(),
      powerUps: this.powerUpManager.getPowerUps(),
      playerTrail: this.playerTrail,
      isGameOver: this.isGameOver,
      hasKnockbackPower: this.hasKnockbackPower,
      playerRingPhase: this.playerRingPhase,
      screenShake: this.screenShake,
      gameSettings: this.gameSettings
    };
    
    this.renderSystem.render(renderState);
  }

  private gameLoop = (timestamp: number) => {
    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.updateFPS(timestamp);
    this.update(deltaTime);
    this.render();

    this.animationFrame = requestAnimationFrame(this.gameLoop);
  };

  start() {
    if (this.animationFrame === null) {
      this.lastTime = performance.now();
      this.fpsLastTime = this.lastTime;
      this.animationFrame = requestAnimationFrame(this.gameLoop);
    }
  }

  stop() {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    // Clean up pools and systems
    this.meteorPool.clear();
    this.particleSystem.clear();
    this.activeMeteors.length = 0;
    
    window.removeEventListener('resize', this.resizeCanvas);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('dblclick', this.handleDoubleClick);
    window.removeEventListener('touchstart', this.handleTouchStart);
    window.removeEventListener('touchmove', this.handleTouchMove);
    window.removeEventListener('touchend', this.handleTouchEnd);
    window.removeEventListener('gameSettingsChanged', this.handleSettingsChange);
  }

  getGameOverState(): boolean {
    return this.isGameOver;
  }

  resetGame() {
    this.isGameOver = false;
    this.gameTime = 0;
    this.score = 0;
    this.hasKnockbackPower = false;
    this.knockbackCooldown = 0;
    this.playerRingPhase = 0;
    this.screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };
    
    // Reset touch tracking
    this.activeTouchId = null;
    this.isTouchDevice = false;
    
    // Clear all active objects
    this.activeMeteors.forEach(meteor => this.meteorPool.release(meteor));
    this.activeMeteors.length = 0;
    this.playerTrail.length = 0;
    
    // Reset systems
    this.particleSystem.reset();
    this.powerUpManager.reset();
    
    console.log('Game reset completed');
  }

  getSettings(): GameSettings {
    return { ...this.gameSettings };
  }
}