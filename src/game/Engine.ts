import { PowerUpManager, PowerUp } from './entities/PowerUp';
import { ObjectPool } from './utils/ObjectPool';
import { SpatialGrid, GridObject } from './utils/SpatialGrid';
import { Meteor, createMeteor, resetMeteor, initializeMeteor } from './entities/Meteor';
import { Particle, createParticle, resetParticle, initializeParticle } from './entities/Particle';

export default class Engine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationFrame: number | null = null;
  private lastTime: number = 0;
  private gameTime: number = 0;
  private score: number = 0;
  
  // Object pools with increased initial sizes for better performance
  private meteorPool: ObjectPool<Meteor>;
  private particlePool: ObjectPool<Particle>;
  private activeMeteors: Meteor[] = [];
  private activeParticles: Particle[] = [];
  
  // Spatial partitioning with optimized cell size
  private spatialGrid: SpatialGrid;
  
  // Performance limits
  private readonly MAX_METEORS = 40; // Reduced from 50 for better performance
  private readonly MAX_PARTICLES = 250; // Reduced from 300 for better performance
  
  // Pre-allocated arrays for batching operations
  private meteorsToRemove: number[] = [];
  private particlesToRemove: number[] = [];
  
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
  
  // Cached values for performance
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;
  private playerRadius: number = 8;
  
  // Collision detection optimization
  private lastCollisionCheck: number = 0;
  private collisionCheckInterval: number = 16; // Check collisions every 16ms (~60fps)
  
  onStateUpdate: (state: { 
    score: number; 
    time: number; 
    isGameOver: boolean; 
    fps: number;
    meteors: number;
    particles: number;
    poolSizes: { meteors: number; particles: number };
  }) => void = () => {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { 
      alpha: false,
      desynchronized: true, // Better performance for animations
      willReadFrequently: false
    });
    if (!context) throw new Error('Could not get canvas context');
    this.ctx = context;
    
    // Initialize object pools with larger initial sizes
    this.meteorPool = new ObjectPool(createMeteor, resetMeteor, 30, this.MAX_METEORS);
    this.particlePool = new ObjectPool(createParticle, resetParticle, 100, this.MAX_PARTICLES);
    
    // Initialize spatial grid with optimized cell size
    this.spatialGrid = new SpatialGrid(window.innerWidth, window.innerHeight, 120);
    
    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('dblclick', this.handleDoubleClick);
    window.addEventListener('touchend', this.handleTouchEnd);
  }

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
      const distanceSquared = dx * dx + dy * dy; // Avoid sqrt for performance

      if (distanceSquared <= 22500) { // 150 * 150
        this.createExplosion(meteor.x, meteor.y, meteor.color, meteor.isSuper);
        this.releaseMeteor(meteor);
        destroyedCount++;
      } else if (distanceSquared <= 90000) { // 300 * 300
        const distance = Math.sqrt(distanceSquared);
        const pushForce = (300 - distance) / 300 * 8;
        const angle = Math.atan2(dy, dx);
        meteor.vx += Math.cos(angle) * pushForce;
        meteor.vy += Math.sin(angle) * pushForce;
      }
    }

    this.score += destroyedCount * 50;
  }

  private createShockwave(x: number, y: number) {
    // Calculate available particle slots
    const availableSlots = this.MAX_PARTICLES - this.activeParticles.length;
    if (availableSlots <= 0) return;

    // Limit shockwave particles based on available slots
    const ringParticles = Math.min(30, Math.floor(availableSlots * 0.6));
    for (let i = 0; i < ringParticles; i++) {
      const angle = (Math.PI * 2 * i) / ringParticles;
      const distance = 50 + Math.random() * 80;
      
      const particle = this.particlePool.get();
      initializeParticle(
        particle,
        x + Math.cos(angle) * distance,
        y + Math.sin(angle) * distance,
        Math.cos(angle) * 4,
        Math.sin(angle) * 4,
        3 + Math.random() * 2,
        '#ffd700',
        50 + Math.random() * 25
      );
      this.activeParticles.push(particle);
    }

    const centralParticles = Math.min(20, availableSlots - ringParticles);
    for (let i = 0; i < centralParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = 2 + Math.random() * 5;
      
      const particle = this.particlePool.get();
      initializeParticle(
        particle,
        x,
        y,
        Math.cos(angle) * velocity,
        Math.sin(angle) * velocity,
        3 + Math.random() * 2,
        '#ffff00',
        60 + Math.random() * 30
      );
      this.activeParticles.push(particle);
    }
  }

  private resizeCanvas = () => {
    this.canvasWidth = window.innerWidth;
    this.canvasHeight = window.innerHeight;
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    this.spatialGrid.resize(this.canvasWidth, this.canvasHeight);
  };

  private createMeteorGradient(x: number, y: number, radius: number, color: string, isSuper: boolean = false): CanvasGradient {
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius * 2);
    
    if (isSuper) {
      gradient.addColorStop(0, '#fff');
      gradient.addColorStop(0.2, '#fff');
      gradient.addColorStop(0.4, color);
      gradient.addColorStop(0.6, color.replace(/,\s*[\d.]+\)$/, ', 0.8)'));
      gradient.addColorStop(0.8, color.replace(/,\s*[\d.]+\)$/, ', 0.4)'));
      gradient.addColorStop(1, color.replace(/,\s*[\d.]+\)$/, ', 0)'));
    } else {
      gradient.addColorStop(0, '#fff');
      gradient.addColorStop(0.2, color);
      gradient.addColorStop(0.5, color.replace(/,\s*[\d.]+\)$/, ', 0.6)'));
      gradient.addColorStop(0.8, color.replace(/,\s*[\d.]+\)$/, ', 0.3)'));
      gradient.addColorStop(1, color.replace(/,\s*[\d.]+\)$/, ', 0)'));
    }
    
    return gradient;
  }

  private getRandomColor(): string {
    const hue = Math.random() * 360;
    return `hsla(${hue}, 100%, 60%, 1)`;
  }

  private createExplosion(x: number, y: number, color: string, isSuper: boolean = false) {
    const availableSlots = this.MAX_PARTICLES - this.activeParticles.length;
    if (availableSlots <= 0) return;

    const particleCount = Math.min(
      isSuper ? 35 : 25, 
      availableSlots
    );
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const velocity = (isSuper ? 3 : 2) + Math.random() * 3;
      const life = (isSuper ? 60 : 45) + Math.random() * 30;
      
      const particle = this.particlePool.get();
      initializeParticle(
        particle,
        x,
        y,
        Math.cos(angle) * velocity,
        Math.sin(angle) * velocity,
        (isSuper ? 2.5 : 2) + Math.random() * 2,
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
      case 0: x = Math.random() * this.canvasWidth; y = -20; break;
      case 1: x = this.canvasWidth + 20; y = Math.random() * this.canvasHeight; break;
      case 2: x = Math.random() * this.canvasWidth; y = this.canvasHeight + 20; break;
      default: x = -20; y = Math.random() * this.canvasHeight; break;
    }

    const angle = Math.atan2(this.mouseY - y, this.mouseX - x);
    const isSuper = Math.random() < 0.12; // Slightly reduced super meteor chance
    
    const baseSpeed = 0.8;
    const speedIncrease = Math.min(this.gameTime / 90, 1.8);
    let speed = baseSpeed + speedIncrease;
    speed *= 0.8 + Math.random() * 0.4;
    if (isSuper) speed *= 1.8; // Slightly reduced super meteor speed

    const color = isSuper ? '#ff4040' : this.getRandomColor();
    const baseRadius = isSuper ? 11 : 6;
    const radiusVariation = isSuper ? 3 : 5;
    
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
    
    // Update player trail with optimized length
    this.playerTrail.unshift({ x: this.mouseX, y: this.mouseY, alpha: 1 });
    if (this.playerTrail.length > 20) this.playerTrail.pop(); // Reduced from 25
    this.playerTrail.forEach(point => point.alpha *= 0.92);

    // Spawn meteors with performance consideration
    const baseSpawnChance = 0.003;
    const maxSpawnChance = 0.018; // Reduced from 0.02
    const spawnIncrease = Math.min(this.gameTime / 150, maxSpawnChance - baseSpawnChance);
    if (Math.random() < baseSpawnChance + spawnIncrease) {
      this.spawnMeteor();
    }

    // Clear removal arrays
    this.meteorsToRemove.length = 0;
    this.particlesToRemove.length = 0;

    // Batch meteor updates
    for (let i = 0; i < this.activeMeteors.length; i++) {
      const meteor = this.activeMeteors[i];
      if (!meteor.active) continue;

      meteor.x += meteor.vx;
      meteor.y += meteor.vy;

      // Update trail with reduced length
      meteor.trail.unshift({ x: meteor.x, y: meteor.y, alpha: 1 });
      const maxTrailLength = meteor.isSuper ? 12 : 10; // Reduced trail length
      if (meteor.trail.length > maxTrailLength) meteor.trail.pop();
      meteor.trail.forEach(point => point.alpha *= meteor.isSuper ? 0.9 : 0.88);

      // Add to spatial grid
      this.spatialGrid.insert({
        x: meteor.x,
        y: meteor.y,
        radius: meteor.radius,
        id: meteor.id
      });

      // Optimized collision detection with early exit
      const dx = meteor.x - this.mouseX;
      const dy = meteor.y - this.mouseY;
      const distanceSquared = dx * dx + dy * dy;
      const collisionRadius = meteor.radius + this.playerRadius;
      
      if (distanceSquared < collisionRadius * collisionRadius) {
        this.createExplosion(this.mouseX, this.mouseY, '#06b6d4');
        this.createExplosion(meteor.x, meteor.y, meteor.color, meteor.isSuper);
        this.isGameOver = true;
        return;
      }

      // Check if meteor is off-screen with margin
      if (meteor.x < -60 || meteor.x > this.canvasWidth + 60 ||
          meteor.y < -60 || meteor.y > this.canvasHeight + 60) {
        this.meteorsToRemove.push(i);
      }
    }

    // Batch particle updates
    for (let i = 0; i < this.activeParticles.length; i++) {
      const particle = this.activeParticles[i];
      if (!particle.active) continue;

      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.05;
      particle.vx *= 0.99;
      particle.alpha = particle.life / particle.maxLife;
      particle.life--;

      // Early exit for dead particles
      if (particle.life <= 0 || particle.alpha <= 0.01 ||
          particle.x < -50 || particle.x > this.canvasWidth + 50 ||
          particle.y < -50 || particle.y > this.canvasHeight + 50) {
        this.particlesToRemove.push(i);
      }
    }

    // Batch remove meteors (reverse order to maintain indices)
    for (let i = this.meteorsToRemove.length - 1; i >= 0; i--) {
      const index = this.meteorsToRemove[i];
      const meteor = this.activeMeteors[index];
      this.activeMeteors.splice(index, 1);
      this.meteorPool.release(meteor);
    }

    // Batch remove particles (reverse order to maintain indices)
    for (let i = this.particlesToRemove.length - 1; i >= 0; i--) {
      const index = this.particlesToRemove[i];
      const particle = this.activeParticles[index];
      this.activeParticles.splice(index, 1);
      this.particlePool.release(particle);
    }

    this.score = Math.floor(this.gameTime);
    this.meteorCount = this.activeMeteors.length;
    this.particleCount = this.activeParticles.length;
    
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
      }
    });
  }

  private render() {
    this.ctx.save();
    this.ctx.translate(this.screenShake.x, this.screenShake.y);
    
    // Full canvas clear for smooth visuals
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    this.ctx.fillRect(-this.screenShake.x, -this.screenShake.y, this.canvasWidth, this.canvasHeight);
    
    this.ctx.globalCompositeOperation = 'lighter';
    
    // Batch render power-ups
    const powerUps = this.powerUpManager.getPowerUps();
    if (powerUps.length > 0) {
      powerUps.forEach(powerUp => {
        this.ctx.beginPath();
        this.ctx.arc(powerUp.x, powerUp.y, powerUp.radius * 2, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(255, 215, 0, ${powerUp.glowIntensity * 0.3})`;
        this.ctx.shadowBlur = 30;
        this.ctx.shadowColor = '#ffd700';
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
        
        this.ctx.beginPath();
        this.ctx.arc(powerUp.x, powerUp.y, powerUp.radius, 0, Math.PI * 2);
        const gradient = this.ctx.createRadialGradient(
          powerUp.x, powerUp.y, 0,
          powerUp.x, powerUp.y, powerUp.radius
        );
        gradient.addColorStop(0, '#ffff80');
        gradient.addColorStop(0.7, '#ffd700');
        gradient.addColorStop(1, '#ffb000');
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(powerUp.x - 5, powerUp.y - 5, powerUp.radius * 0.3, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fill();
      });
    }
    
    // Batch render meteor trails
    for (const meteor of this.activeMeteors) {
      if (!meteor.active) continue;
      
      for (let i = 0; i < meteor.trail.length; i++) {
        const point = meteor.trail[i];
        const progress = 1 - i / meteor.trail.length;
        const trailRadius = meteor.radius * progress * (meteor.isSuper ? 1.6 : 1.2);
        
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, trailRadius, 0, Math.PI * 2);
        
        // Cache gradient creation
        if (!meteor.gradient) {
          meteor.gradient = this.createMeteorGradient(meteor.x, meteor.y, meteor.radius, meteor.color, meteor.isSuper);
        }
        
        this.ctx.fillStyle = meteor.gradient;
        this.ctx.fill();
        
        this.ctx.shadowBlur = meteor.isSuper ? 18 : 12;
        this.ctx.shadowColor = meteor.color;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      }
    }

    // Batch render meteors
    for (const meteor of this.activeMeteors) {
      if (!meteor.active) continue;
      
      this.ctx.beginPath();
      this.ctx.arc(meteor.x, meteor.y, meteor.radius * (meteor.isSuper ? 1.6 : 1.2), 0, Math.PI * 2);
      this.ctx.fillStyle = meteor.gradient || meteor.color;
      
      this.ctx.shadowBlur = meteor.isSuper ? 22 : 14;
      this.ctx.shadowColor = meteor.color;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }
    
    this.ctx.globalCompositeOperation = 'source-over';
    
    // Batch render player trail
    for (let i = 0; i < this.playerTrail.length; i++) {
      const point = this.playerTrail[i];
      const progress = 1 - i / this.playerTrail.length;
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, 7 * progress, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(6, 182, 212, ${point.alpha * 0.7})`;
      
      this.ctx.shadowBlur = 14;
      this.ctx.shadowColor = '#06b6d4';
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }
    
    // Draw knockback power ring
    if (this.hasKnockbackPower) {
      const ringRadius = 15 + Math.sin(this.playerRingPhase) * 3;
      this.ctx.beginPath();
      this.ctx.arc(this.mouseX, this.mouseY, ringRadius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(255, 215, 0, ${0.8 + Math.sin(this.playerRingPhase * 2) * 0.2})`;
      this.ctx.lineWidth = 3;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = '#ffd700';
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
    }
    
    // Draw player
    if (!this.isGameOver) {
      this.ctx.beginPath();
      this.ctx.arc(this.mouseX, this.mouseY, this.playerRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = '#06b6d4';
      
      this.ctx.shadowBlur = 18;
      this.ctx.shadowColor = '#06b6d4';
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }

    // Batch render particles
    this.ctx.globalCompositeOperation = 'lighter';
    for (const particle of this.activeParticles) {
      if (!particle.active) continue;
      
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = particle.color.replace(/,\s*[\d.]+\)$/, `, ${particle.alpha})`);
      
      this.ctx.shadowBlur = 6;
      this.ctx.shadowColor = particle.color;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }
    
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.restore();
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
  }
}