import { ObjectPool } from '../utils/ObjectPool';
import { Particle, createParticle, resetParticle, initializeParticle } from '../entities/Particle';

export class ParticleSystem {
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
  adaptiveParticleLimits(currentFPS: number): void {
    const baseLimit = this.isMobile ? 150 : 300;
    
    if (currentFPS < 30) {
      this.maxParticles = Math.floor(baseLimit * 0.5); // Reduce by 50%
    } else if (currentFPS < 45) {
      this.maxParticles = Math.floor(baseLimit * 0.75); // Reduce by 25%
    } else {
      this.maxParticles = baseLimit; // Full quality
    }
  }

  createExplosion(x: number, y: number, color: string, isSuper: boolean = false): void {
    const baseCount = this.isMobile ? (isSuper ? 25 : 15) : (isSuper ? 50 : 30);
    const particleCount = Math.min(
      baseCount, 
      this.maxParticles - this.activeParticles.length
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

  createShockwave(x: number, y: number): void {
    // Limit shockwave particles to prevent lag
    const ringCount = this.isMobile ? 20 : 40;
    const centralCount = this.isMobile ? 12 : 25;
    
    const ringParticles = Math.min(ringCount, this.maxParticles - this.activeParticles.length);
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

    const centralParticles = Math.min(centralCount, this.maxParticles - this.activeParticles.length);
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