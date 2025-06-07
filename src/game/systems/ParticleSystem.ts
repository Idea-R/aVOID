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

  createDefenseEffect(x: number, y: number, type: 'destroy' | 'deflect'): void {
    if (type === 'destroy') {
      this.createLightningDestruction(x, y);
    } else {
      this.createLightningDeflection(x, y);
    }
  }

  /**
   * Create lightning-style destruction effect
   */
  private createLightningDestruction(x: number, y: number): void {
    const particleCount = this.isMobile ? 12 : 20;
    const particles = Math.min(particleCount, this.maxParticles - this.activeParticles.length);
    
    // Create jagged lightning-style particles
    for (let i = 0; i < particles; i++) {
      // Create branching lightning effect
      const mainAngle = (Math.PI * 2 * i) / particles;
      const angleVariation = (Math.random() - 0.5) * 0.8; // Add randomness for jagged effect
      const angle = mainAngle + angleVariation;
      
      const velocity = 4 + Math.random() * 3; // Fast, electric-like movement
      const life = 30 + Math.random() * 20; // Short, intense flash
      
      const particle = this.particlePool.get();
      initializeParticle(
        particle,
        x,
        y,
        Math.cos(angle) * velocity,
        Math.sin(angle) * velocity,
        1 + Math.random() * 2, // Smaller, more electric-like particles
        '#ffff00', // Bright yellow lightning color
        life
      );
      this.activeParticles.push(particle);
    }
    
    // Add central flash effect
    const centralParticles = Math.min(5, this.maxParticles - this.activeParticles.length);
    for (let i = 0; i < centralParticles; i++) {
      const particle = this.particlePool.get();
      initializeParticle(
        particle,
        x + (Math.random() - 0.5) * 10,
        y + (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        3 + Math.random() * 2,
        '#ffffff', // Bright white core
        25 + Math.random() * 15
      );
      this.activeParticles.push(particle);
    }
  }

  /**
   * Create lightning-style deflection effect
   */
  private createLightningDeflection(x: number, y: number): void {
    const particleCount = this.isMobile ? 8 : 12;
    const particles = Math.min(particleCount, this.maxParticles - this.activeParticles.length);
    
    // Create smaller, more subtle lightning effect for deflection
    for (let i = 0; i < particles; i++) {
      const angle = (Math.PI * 2 * i) / particles;
      const angleVariation = (Math.random() - 0.5) * 0.6;
      const finalAngle = angle + angleVariation;
      
      const velocity = 2 + Math.random() * 2;
      const life = 20 + Math.random() * 15;
      
      const particle = this.particlePool.get();
      initializeParticle(
        particle,
        x,
        y,
        Math.cos(finalAngle) * velocity,
        Math.sin(finalAngle) * velocity,
        1 + Math.random() * 1.5,
        '#00ffff', // Cyan lightning for deflection
        life
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

export { ParticleSystem }