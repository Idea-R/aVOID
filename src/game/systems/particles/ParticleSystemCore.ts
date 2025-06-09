import { ObjectPool } from '../../utils/ObjectPool';
import { Particle, createParticle, resetParticle, initializeParticle } from '../../entities/Particle';

export class ParticleSystemCore {
  private particlePool: ObjectPool<Particle>;
  private activeParticles: Particle[] = [];
  private maxParticles: number;
  private isMobile: boolean;

  constructor() {
    // Detect mobile devices
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                    window.innerWidth <= 768;
    
    // Set particle limits based on device
    this.maxParticles = this.isMobile ? 150 : 300;
    
    // Initialize particle pool
    this.particlePool = new ObjectPool(createParticle, resetParticle, 50, this.maxParticles);
  }

  // Adaptive particle limits based on FPS performance
  setMaxParticles(maxParticles: number): void {
    this.maxParticles = maxParticles;
    
    // If we're over the new limit, release excess particles
    while (this.activeParticles.length > this.maxParticles) {
      const particle = this.activeParticles.pop();
      if (particle) {
        this.particlePool.release(particle);
      }
    }
  }

  update(deltaTime: number): void {
    // Update particles
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const particle = this.activeParticles[i];
      if (!particle.active) continue;

      // Handle custom behaviors
      if (particle.customBehavior) {
        this.updateCustomBehavior(particle, deltaTime);
      } else {
        // Default particle behavior
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.05; // Gravity
        particle.vx *= 0.99; // Air resistance
      }
      
      particle.alpha = particle.life / particle.maxLife;
      particle.life--;

      if (particle.life <= 0 || particle.alpha <= 0.01) {
        this.releaseParticle(particle);
      }
    }
  }

  private updateCustomBehavior(particle: Particle, deltaTime: number): void {
    if (!particle.behaviorTimer) particle.behaviorTimer = 0;
    particle.behaviorTimer += deltaTime;

    switch (particle.customBehavior) {
      case 'energyAbsorption':
        // Move inward for 25ms, then reverse and blast outward in space
        if (particle.behaviorTimer < 25) {
          // Continue moving inward
          particle.x += particle.vx;
          particle.y += particle.vy;
        } else if (particle.behaviorTimer < 30) {
          // Brief pause at center for energy gathering effect
          particle.vx *= 0.1;
          particle.vy *= 0.1;
        } else {
          // Blast outward (reverse initial velocity)
          if (particle.initialVx !== undefined && particle.initialVy !== undefined) {
            particle.vx = -particle.initialVx * 1.5; // Stronger outward blast
            particle.vy = -particle.initialVy * 1.5;
          }
          // No gravity in space, gradual deceleration
          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.vx *= 0.995;
          particle.vy *= 0.995;
        }
        break;

      case 'spaceExpansion':
        // Expand outward in space (no gravity, gradual deceleration)
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.98; // Gradual deceleration in space
        particle.vy *= 0.98;
        break;

      case 'shockwavePulse':
        // Delayed shockwave pulse that blasts outward in space
        if (particle.behaviorTimer < 0) {
          // Still in delay phase, don't move yet but increment timer
          particle.behaviorTimer += deltaTime;
          break;
        }
        
        // Blast outward with no gravity, slight deceleration
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.995; // Very slight deceleration for shockwave
        particle.vy *= 0.995;
        break;

      case 'expandingRing':
        // Delayed expanding ring effect
        if (particle.behaviorTimer < 0) {
          // Still in delay phase, don't move yet but increment timer
          particle.behaviorTimer += deltaTime;
          break;
        }
        
        // Accelerating ring expansion for dramatic effect
        const ringAcceleration = 1.04; // Gradual acceleration
        particle.vx *= ringAcceleration;
        particle.vy *= ringAcceleration;
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Calculate expansion factor for fade-out
        if (particle.initialVx !== undefined && particle.initialVy !== undefined) {
          const currentSpeed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
          const initialSpeed = Math.sqrt(particle.initialVx * particle.initialVx + particle.initialVy * particle.initialVy);
          const expansionFactor = currentSpeed / initialSpeed;
          
          // Fade out as ring expands, creating the pulsing ring effect
          particle.alpha = Math.max(0.1, 1.0 - (expansionFactor - 1) * 0.6);
        }
        break;

      case 'canvasRing':
        // Delayed canvas ring expansion
        if (particle.behaviorTimer < 0) {
          // Still in delay phase, don't move yet but increment timer
          particle.behaviorTimer += deltaTime;
          break;
        }
        
        // Expand ring radius progressively (60% faster expansion)
        if (particle.initialSize !== undefined && particle.maxRadius !== undefined) {
          const progress = particle.behaviorTimer / (particle.maxLife * 16.67); // Convert to progress ratio
          const expansionProgress = Math.min(1, progress * 3.2); // 60% faster expansion (was 2, now 3.2)
          
          // Calculate current radius with acceleration
          particle.radius = particle.initialSize + (particle.maxRadius - particle.initialSize) * expansionProgress;
          
          // Fade out as ring expands (faster fade to match faster expansion)
          particle.alpha = Math.max(0.05, 1.0 - progress * 1.2);
        }
        break;

      default:
        // Fallback to default behavior
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.05;
        particle.vx *= 0.99;
        break;
    }
  }

  private releaseParticle(particle: Particle): void {
    const index = this.activeParticles.indexOf(particle);
    if (index > -1) {
      this.activeParticles.splice(index, 1);
      this.particlePool.release(particle);
    }
  }

  // Pool management methods
  getParticle(): Particle {
    return this.particlePool.get();
  }

  addActiveParticle(particle: Particle): void {
    this.activeParticles.push(particle);
  }

  getActiveParticles(): Particle[] {
    return this.activeParticles;
  }

  getParticleCount(): number {
    return this.activeParticles.length;
  }

  getPoolSize(): number {
    return this.particlePool.getPoolSize();
  }

  getMaxParticles(): number {
    return this.maxParticles;
  }

  isMobileDevice(): boolean {
    return this.isMobile;
  }

  getAvailableParticleSlots(): number {
    return this.maxParticles - this.activeParticles.length;
  }

  clear(): void {
    this.activeParticles.forEach(particle => this.particlePool.release(particle));
    this.activeParticles.length = 0;
    this.particlePool.clear();
  }

  reset(): void {
    this.clear();
    // Reset particle limit to default
    this.maxParticles = this.isMobile ? 150 : 300;
  }
}