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