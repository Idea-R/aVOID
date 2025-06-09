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

  createShockwave(x: number, y: number, cursorColor: string = '#06b6d4'): void {
    // Create localized canvas-based shockwave rings (inspired by chain detonation)
    this.createCanvasShockwaveRings(x, y, cursorColor);
    
    // Add particle effects for texture and movement
    this.createShockwaveParticles(x, y, cursorColor);
  }

  private createCanvasShockwaveRings(x: number, y: number, cursorColor: string): void {
    // Create expanding ring data for canvas rendering
    const ringCount = 4;
    const baseRadius = 20;
    const maxRadius = 150; // Localized, not full screen
    
    for (let ring = 0; ring < ringCount; ring++) {
      const startDelay = ring * 6; // Faster stagger (was 8ms, now 6ms)
      const ringDuration = 45 + ring * 15; // Shorter duration for snappier effect
      
      // Create a special "ring" particle that holds ring data
      const ringParticle = this.core.getParticle();
      initializeParticle(
        ringParticle,
        x,
        y,
        0, // No velocity - position is fixed
        0,
        baseRadius + ring * 15, // Use size for current radius
        cursorColor,
        ringDuration
      );
      
      // Configure as canvas ring
      ringParticle.customBehavior = 'canvasRing';
      ringParticle.behaviorTimer = -startDelay; // Delay start
      ringParticle.maxRadius = maxRadius;
      ringParticle.ringIndex = ring;
      ringParticle.initialSize = baseRadius + ring * 15;
      
      this.core.addActiveParticle(ringParticle);
    }
  }

  private createShockwaveParticles(x: number, y: number, cursorColor: string): void {
    // Central bright flash
    const centralParticles = Math.min(8, this.core.getAvailableParticleSlots());
    for (let i = 0; i < centralParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = 1 + Math.random() * 2;
      
      const particle = this.core.getParticle();
      initializeParticle(
        particle,
        x + (Math.random() - 0.5) * 8,
        y + (Math.random() - 0.5) * 8,
        Math.cos(angle) * velocity,
        Math.sin(angle) * velocity,
        6 + Math.random() * 4, // Large bright core
        '#ffffff',
        60 + Math.random() * 30
      );
      
      // Immediate central explosion
      particle.customBehavior = 'spaceExpansion';
      
      this.core.addActiveParticle(particle);
    }

    // Add scattered energy particles for texture
    const scatterParticles = Math.min(15, this.core.getAvailableParticleSlots());
    for (let i = 0; i < scatterParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = 4 + Math.random() * 6;
      
      const particle = this.core.getParticle();
      initializeParticle(
        particle,
        x,
        y,
        Math.cos(angle) * velocity,
        Math.sin(angle) * velocity,
        2 + Math.random() * 2,
        cursorColor,
        50 + Math.random() * 30
      );
      
      // Space expansion for scattered effect
      particle.customBehavior = 'spaceExpansion';
      
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

  createEnergyAbsorption(x: number, y: number): void {
    // Create energy implosion effect that then blasts outward and dissipates in space
    const particleCount = this.core.isMobileDevice() ? 20 : 35;
    const particles = Math.min(particleCount, this.core.getAvailableParticleSlots());
    
    // Energy streams converging inward then blasting out
    for (let i = 0; i < particles; i++) {
      const angle = (Math.PI * 2 * i) / particles;
      const startDistance = 80 + Math.random() * 40; // Start far out
      const velocity = -4 - Math.random() * 2; // Start moving inward fast
      const life = 80 + Math.random() * 40; // Longer life for space effect
      
      const startX = x + Math.cos(angle) * startDistance;
      const startY = y + Math.sin(angle) * startDistance;
      
      const particle = this.core.getParticle();
      initializeParticle(
        particle,
        startX,
        startY,
        Math.cos(angle) * velocity, // Initial velocity toward center
        Math.sin(angle) * velocity,
        1.5 + Math.random() * 2,
        Math.random() < 0.5 ? '#00bfff' : '#87ceeb', // Blue energy colors
        life
      );
      
      // Set custom behavior for energy absorption particles (no gravity, velocity reversal)
      particle.customBehavior = 'energyAbsorption';
      particle.behaviorTimer = 0;
      particle.initialVx = particle.vx;
      particle.initialVy = particle.vy;
      
      this.core.addActiveParticle(particle);
    }

    // Central energy flash that expands briefly
    const centralParticles = Math.min(8, this.core.getAvailableParticleSlots());
    for (let i = 0; i < centralParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = 1 + Math.random() * 2; // Outward expansion
      
      const particle = this.core.getParticle();
      initializeParticle(
        particle,
        x + (Math.random() - 0.5) * 5,
        y + (Math.random() - 0.5) * 5,
        Math.cos(angle) * velocity,
        Math.sin(angle) * velocity,
        3 + Math.random() * 3,
        '#ffffff', // Bright white core
        50 + Math.random() * 30
      );
      
      // Set space behavior (no gravity, gradual deceleration)
      particle.customBehavior = 'spaceExpansion';
      
      this.core.addActiveParticle(particle);
    }

    // Electric discharge that blasts outward in space
    const arcParticles = Math.min(15, this.core.getAvailableParticleSlots());
    for (let i = 0; i < arcParticles; i++) {
      const angle = (Math.PI * 2 * i) / arcParticles + Math.random() * 0.3;
      const velocity = 2 + Math.random() * 3; // Fast outward blast
      
      const particle = this.core.getParticle();
      initializeParticle(
        particle,
        x + (Math.random() - 0.5) * 15,
        y + (Math.random() - 0.5) * 15,
        Math.cos(angle) * velocity,
        Math.sin(angle) * velocity,
        1 + Math.random() * 2,
        '#b3e5ff', // Light blue
        60 + Math.random() * 30
      );
      
      // Set space behavior
      particle.customBehavior = 'spaceExpansion';
      
      this.core.addActiveParticle(particle);
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