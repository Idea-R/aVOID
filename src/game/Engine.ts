import { PowerUpManager, PowerUp } from './entities/PowerUp';
import { ObjectPool } from './utils/ObjectPool';
import { SpatialGrid, GridObject } from './utils/SpatialGrid';
import { Meteor, createMeteor, resetMeteor, initializeMeteor } from './entities/Meteor';
import { Particle, createParticle, resetParticle, initializeParticle } from './entities/Particle';
import { RenderSystem } from './systems/RenderSystem';

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
  
  // Rendering system
  private renderSystem: RenderSystem;
  
  // Object pools
  private meteorPool: ObjectPool<Meteor>;
  private particlePool: ObjectPool<Particle>;
  private activeMeteors: Meteor[] = [];
  private activeParticles: Particle[] = [];
  
  // Spatial partitioning
  private spatialGrid: SpatialGrid;
  
  // Performance limits
  private readonly MAX_METEORS = 50;
  private MAX_PARTICLES = 300; // Changed from readonly to allow dynamic adjustment
  
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
  private particleCount: number = 0;
  
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
    
    // Initialize rendering system
    this.renderSystem = new RenderSystem(canvas);
    
    // Initialize object pools
    this.meteorPool = new ObjectPool(createMeteor, resetMeteor, 20, this.MAX_METEORS);
    this.particlePool = new ObjectPool(createParticle, resetParticle, 50, this.MAX_PARTICLES);
    
    // Initialize spatial grid
    this.spatialGrid = new SpatialGrid(window.innerWidth, window.innerHeight, 150);
    
    // Load settings from localStorage
    this.loadSettings();
    
    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('dblclick', this.handleDoubleClick);
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

  private handleMouseMove = (e: MouseEvent) => {
    if (this.isGameOver) return;
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
  };

  private handleDoubleClick = (e: MouseEvent) => {
    if (this.isGameOver || !this.hasKnockbackPower) return;
    this.activateKnockback();
  };

  private handleTouchEnd = (e: TouchEvent) => {
    if (this.isGameOver) return;
    
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

  // Adaptive particle limits based on FPS performance
  private adaptiveParticleLimits() {
    if (this.currentFPS < 30) {
      this.MAX_PARTICLES = 150; // Reduce by 50%
    } else if (this.currentFPS < 45) {
      this.MAX_PARTICLES = 225; // Reduce by 25%
    } else {
      this.MAX_PARTICLES = 300; // Full quality
    }
  }

  private activateKnockback() {
    if (!this.hasKnockbackPower) return;

    this.hasKnockbackPower = false;
    this.knockbackCooldown = 30;

    this.screenShake = { x: 0, y: 0, intensity: 15, duration: 500 };
    this.createShockwave(this.mouseX, this.mouseY);

    let destroyedCount = 0;

    // Use spatial grid for efficient collision detection
    const nearbyMeteors = this.spatialGrid.query(this.mouseX, this.mouseY, 300);
    
    for (const gridObj of nearbyMeteors) {
      const meteor = this.activeMeteors.find(m => m.id === gridObj.id);
      if (!meteor || !meteor.active) continue;

      const dx = meteor.x - this.mouseX;
      const dy = meteor.y - this.mouseY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= 150) {
        this.createExplosion(meteor.x, meteor.y, meteor.color, meteor.isSuper);
        this.releaseMeteor(meteor);
        destroyedCount++;
      } else if (distance <= 300) {
        const pushForce = (300 - distance) / 300 * 8;
        const angle = Math.atan2(dy, dx);
        meteor.vx += Math.cos(angle) * pushForce;
        meteor.vy += Math.sin(angle) * pushForce;
      }
    }

    this.score += destroyedCount * 50;
  }

  private createShockwave(x: number, y: number) {
    // Limit shockwave particles to prevent lag
    const ringParticles = Math.min(40, this.MAX_PARTICLES - this.activeParticles.length);
    for (let i = 0; i < ringParticles; i++) {
      const angle = (Math.PI * 2 * i) / ringParticles;
      const distance = 50 + Math.random() * 100;
      
      const particle = this.particlePool.get();
      initializeParticle(
        particle,
        x + Math.cos(angle) * distance,
        y + Math.sin(angle) * distance,
        Math.cos(angle) * 4,
        Math.sin(angle) * 4,
        3 + Math.random() * 2,
        '#ffd700',
        60 + Math.random() * 30
      );
      this.activeParticles.push(particle);
    }

    const centralParticles = Math.min(25, this.MAX_PARTICLES - this.activeParticles.length);
    for (let i = 0; i < centralParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = 2 + Math.random() * 6;
      
      const particle = this.particlePool.get();
      initializeParticle(
        particle,
        x,
        y,
        Math.cos(angle) * velocity,
        Math.sin(angle) * velocity,
        4 + Math.random() * 3,
        '#ffff00',
        80 + Math.random() * 40
      );
      this.activeParticles.push(particle);
    }
  }

  private resizeCanvas = () => {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.spatialGrid.resize(window.innerWidth, window.innerHeight);
  };

  private getRandomColor(): string {
    const hue = Math.random() * 360;
    return `hsla(${hue}, 100%, 60%, 1)`;
  }

  private createExplosion(x: number, y: number, color: string, isSuper: boolean = false) {
    const particleCount = Math.min(
      isSuper ? 50 : 30, 
      this.MAX_PARTICLES - this.activeParticles.length
    );
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const velocity = (isSuper ? 3 : 2) + Math.random() * 4;
      const life = (isSuper ? 80 : 60) + Math.random() * 40;
      
      const particle = this.particlePool.get();
      initializeParticle(
        particle,
        x,
        y,
        Math.cos(angle) * velocity,
        Math.sin(angle) * velocity,
        (isSuper ? 3 : 2) + Math.random() * 3,
        color,
        life
      );
      this.activeParticles.push(particle);
    }
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

  private releaseParticle(particle: Particle) {
    const index = this.activeParticles.indexOf(particle);
    if (index > -1) {
      this.activeParticles.splice(index, 1);
      this.particlePool.release(particle);
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
    this.adaptiveParticleLimits();
    
    this.gameTime += deltaTime / 1000;
    
    // Clear spatial grid
    this.spatialGrid.clear();
    
    // Update power-up system
    this.powerUpManager.update(this.gameTime, deltaTime);
    
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
    const maxSpawnChance = 0.02; // Reduced from 0.03
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
        const maxTrailLength = meteor.isSuper ? 15 : 12; // Reduced trail length
        if (meteor.trail.length > maxTrailLength) meteor.trail.pop();
        meteor.trail.forEach(point => point.alpha *= meteor.isSuper ? 0.9 : 0.88);
      } else {
        meteor.trail.length = 0; // Clear trails if disabled
      }

      // Add to spatial grid
      this.spatialGrid.insert({
        x: meteor.x,
        y: meteor.y,
        radius: meteor.radius,
        id: meteor.id
      });

      // Check collision with player - CRITICAL COLLISION DETECTION
      const dx = meteor.x - this.mouseX;
      const dy = meteor.y - this.mouseY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < meteor.radius + 6) {
        console.log('COLLISION DETECTED! Setting game over state...'); // Debug log
        this.createExplosion(this.mouseX, this.mouseY, '#06b6d4');
        this.createExplosion(meteor.x, meteor.y, meteor.color, meteor.isSuper);
        this.isGameOver = true;
        
        // Force immediate state update
        this.onStateUpdate({ 
          score: this.score, 
          time: this.gameTime, 
          isGameOver: true, 
          fps: this.currentFPS,
          meteors: this.meteorCount,
          particles: this.particleCount,
          poolSizes: {
            meteors: this.meteorPool.getPoolSize(),
            particles: this.particlePool.getPoolSize()
          },
          settings: this.gameSettings
        });
        
        console.log('Game over state updated!'); // Debug log
        return;
      }

      // Remove meteors that are off-screen
      if (meteor.x < -50 || meteor.x > this.canvas.width + 50 ||
          meteor.y < -50 || meteor.y > this.canvas.height + 50) {
        this.releaseMeteor(meteor);
      }
    }

    // Update particles
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const particle = this.activeParticles[i];
      if (!particle.active) continue;

      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.05;
      particle.vx *= 0.99;
      particle.alpha = particle.life / particle.maxLife;
      particle.life--;

      if (particle.life <= 0 || particle.alpha <= 0.01) {
        this.releaseParticle(particle);
      }
    }

    this.score = Math.floor(this.gameTime);
    this.meteorCount = this.activeMeteors.length;
    this.particleCount = this.activeParticles.length;
    
    // Always update state, even during normal gameplay
    this.onStateUpdate({ 
      score: this.score, 
      time: this.gameTime, 
      isGameOver: this.isGameOver, 
      fps: this.currentFPS,
      meteors: this.meteorCount,
      particles: this.particleCount,
      poolSizes: {
        meteors: this.meteorPool.getPoolSize(),
        particles: this.particlePool.getPoolSize()
      },
      settings: this.gameSettings
    });
  }

  private render() {
    const renderState = {
      mouseX: this.mouseX,
      mouseY: this.mouseY,
      activeMeteors: this.activeMeteors,
      activeParticles: this.activeParticles,
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
    
    // Clean up pools
    this.meteorPool.clear();
    this.particlePool.clear();
    this.activeMeteors.length = 0;
    this.activeParticles.length = 0;
    
    window.removeEventListener('resize', this.resizeCanvas);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('dblclick', this.handleDoubleClick);
    window.removeEventListener('touchend', this.handleTouchEnd);
    window.removeEventListener('gameSettingsChanged', this.handleSettingsChange);
  }

  // Public method to get current game over state
  getGameOverState(): boolean {
    return this.isGameOver;
  }

  // Public method to reset game state
  resetGame() {
    this.isGameOver = false;
    this.gameTime = 0;
    this.score = 0;
    this.hasKnockbackPower = false;
    this.knockbackCooldown = 0;
    this.playerRingPhase = 0;
    this.screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };
    
    // Reset particle limit to default
    this.MAX_PARTICLES = 300;
    
    // Clear all active objects
    this.activeMeteors.forEach(meteor => this.meteorPool.release(meteor));
    this.activeParticles.forEach(particle => this.particlePool.release(particle));
    this.activeMeteors.length = 0;
    this.activeParticles.length = 0;
    this.playerTrail.length = 0;
    
    // Reset power-up manager
    this.powerUpManager.reset();
    
    console.log('Game reset completed');
  }

  // Public method to get current settings
  getSettings(): GameSettings {
    return { ...this.gameSettings };
  }
}