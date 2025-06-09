import { ParticleSystemCore } from './ParticleSystemCore';
import { initializeParticle } from '../../entities/Particle';

export class StandardParticleEffects {
  constructor(private core: ParticleSystemCore) {}

  createExplosion(x: number, y: number, color: string, isSuper: boolean = false): void {
    const baseCount = this.core.isMobileDevice() ? (isSuper ? 25 : 15) : (isSuper ? 50 : 30);
    const particleCount = Math.min(
      baseCount, 
      this.core.getAvailableParticleSlots()
    );
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const velocity = (isSuper ? 3 : 2) + Math.random() * 4;
      const life = (isSuper ? 80 : 60) + Math.random() * 40;
      
      const particle = this.core.getParticle();
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
      this.core.addActiveParticle(particle);
    }
  }

  createShockwave(x: number, y: number): void {
    // Limit shockwave particles to prevent lag
    const ringCount = this.core.isMobileDevice() ? 20 : 40;
    const centralCount = this.core.isMobileDevice() ? 12 : 25;
    
    const ringParticles = Math.min(ringCount, this.core.getAvailableParticleSlots());
    for (let i = 0; i < ringParticles; i++) {
      const angle = (Math.PI * 2 * i) / ringParticles;
      const distance = 50 + Math.random() * 100;
      
      const particle = this.core.getParticle();
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
      this.core.addActiveParticle(particle);
    }

    const centralParticles = Math.min(centralCount, this.core.getAvailableParticleSlots());
    for (let i = 0; i < centralParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = 2 + Math.random() * 6;
      
      const particle = this.core.getParticle();
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
      this.core.addActiveParticle(particle);
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
    const particleCount = this.core.isMobileDevice() ? 12 : 20;
    const particles = Math.min(particleCount, this.core.getAvailableParticleSlots());
    
    // Create jagged lightning-style particles
    for (let i = 0; i < particles; i++) {
      // Create branching lightning effect
      const mainAngle = (Math.PI * 2 * i) / particles;
      const angleVariation = (Math.random() - 0.5) * 0.8; // Add randomness for jagged effect
      const angle = mainAngle + angleVariation;
      
      const velocity = 4 + Math.random() * 3; // Fast, electric-like movement
      const life = 30 + Math.random() * 20; // Short, intense flash
      
      const particle = this.core.getParticle();
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
      this.core.addActiveParticle(particle);
    }
    
    // Add central flash effect
    const centralParticles = Math.min(5, this.core.getAvailableParticleSlots());
    for (let i = 0; i < centralParticles; i++) {
      const particle = this.core.getParticle();
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
      this.core.addActiveParticle(particle);
    }
  }

  /**
   * Create lightning-style deflection effect
   */
  private createLightningDeflection(x: number, y: number): void {
    const particleCount = this.core.isMobileDevice() ? 8 : 12;
    const particles = Math.min(particleCount, this.core.getAvailableParticleSlots());
    
    // Create smaller, more subtle lightning effect for deflection
    for (let i = 0; i < particles; i++) {
      const angle = (Math.PI * 2 * i) / particles;
      const angleVariation = (Math.random() - 0.5) * 0.6;
      const finalAngle = angle + angleVariation;
      
      const velocity = 2 + Math.random() * 2;
      const life = 20 + Math.random() * 15;
      
      const particle = this.core.getParticle();
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
      this.core.addActiveParticle(particle);
    }
  }
}