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

  createChainDetonationExplosion(x: number, y: number): void {
    // Create massive explosion effect for chain detonation
    const particleCount = this.isMobile ? 60 : 100;
    const particles = Math.min(particleCount, this.maxParticles - this.activeParticles.length);
    
    for (let i = 0; i < particles; i++) {
      const angle = (Math.PI * 2 * i) / particles;
      const velocity = 5 + Math.random() * 8; // Faster particles
      const life = 80 + Math.random() * 60; // Longer lasting
      
      const particle = this.particlePool.get();
      initializeParticle(
        particle,
        x,
        y,
        Math.cos(angle) * velocity,
        Math.sin(angle) * velocity,
        4 + Math.random() * 4, // Larger particles
        '#9d4edd', // Purple color
        life
      );
      this.activeParticles.push(particle);
    }
    
    // Add some white core particles
    const coreParticles = Math.min(20, this.maxParticles - this.activeParticles.length);
    for (let i = 0; i < coreParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = 3 + Math.random() * 5;
      
      const particle = this.particlePool.get();
      initializeParticle(
        particle,
        x + (Math.random() - 0.5) * 20,
        y + (Math.random() - 0.5) * 20,
        Math.cos(angle) * velocity,
        Math.sin(angle) * velocity,
        6 + Math.random() * 3,
        '#ffffff', // White core
        60 + Math.random() * 40
      );
      this.activeParticles.push(particle);
    }
  }

  // Enhanced chain detonation with staggered meteor destruction
  createEnhancedChainDetonation(meteors: Array<{ x: number; y: number; color: string; isSuper: boolean }>, centerX: number, centerY: number): void {
    console.log('🔗✨ Creating enhanced chain detonation effects');
    
    // Create initial central explosion
    this.createChainDetonationExplosion(centerX, centerY);
    
    // Create ripple wave effects expanding from center
    this.createRippleWaves(centerX, centerY, 3);
    
    // Sort meteors by distance from center for staggered destruction
    const meteorDistances = meteors.map((meteor, index) => ({
      meteor,
      index,
      distance: Math.sqrt((meteor.x - centerX) ** 2 + (meteor.y - centerY) ** 2)
    })).sort((a, b) => a.distance - b.distance);
    
    // Create electric arcs connecting meteors before destruction
    this.createElectricArcs(meteorDistances.map(md => md.meteor), centerX, centerY);
    
    // Staggered destruction - closer meteors explode first
    meteorDistances.forEach((meteorData, sequenceIndex) => {
      const delay = sequenceIndex * 50 + Math.random() * 30; // 50ms base delay + random variance
      
      setTimeout(() => {
        this.createEnhancedMeteorDestruction(
          meteorData.meteor.x, 
          meteorData.meteor.y, 
          meteorData.meteor.color, 
          meteorData.meteor.isSuper,
          sequenceIndex
        );
      }, delay);
    });
    
    // Create final massive shockwave after all meteors are destroyed
    const finalDelay = meteorDistances.length * 50 + 200;
    setTimeout(() => {
      this.createFinalShockwave(centerX, centerY);
    }, finalDelay);
  }

  private createRippleWaves(centerX: number, centerY: number, waveCount: number): void {
    for (let wave = 0; wave < waveCount; wave++) {
      const delay = wave * 100; // 100ms between waves
      
      setTimeout(() => {
        const particleCount = this.isMobile ? 20 : 40;
        const radius = 50 + wave * 30; // Expanding radius for each wave
        
        for (let i = 0; i < particleCount; i++) {
          const angle = (Math.PI * 2 * i) / particleCount;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          
          const particle = this.particlePool.get();
          initializeParticle(
            particle,
            x,
            y,
            Math.cos(angle) * 2, // Outward velocity
            Math.sin(angle) * 2,
            3 + Math.random() * 2,
            wave === 0 ? '#ffffff' : '#9d4edd', // First wave white, others purple
            30 + Math.random() * 20
          );
          this.activeParticles.push(particle);
        }
      }, delay);
    }
  }

  private createElectricArcs(meteors: Array<{ x: number; y: number; color: string; isSuper: boolean }>, centerX: number, centerY: number): void {
    const arcCount = Math.min(meteors.length, 8); // Limit arcs to prevent performance issues
    
    for (let i = 0; i < arcCount; i++) {
      const meteor = meteors[i];
      const steps = 8; // Number of particles in each arc
      
      for (let step = 0; step < steps; step++) {
        const progress = step / (steps - 1);
        
        // Create curved arc path
        const midX = (centerX + meteor.x) / 2 + (Math.random() - 0.5) * 40;
        const midY = (centerY + meteor.y) / 2 + (Math.random() - 0.5) * 40;
        
        // Quadratic bezier curve
        const x = (1 - progress) ** 2 * centerX + 2 * (1 - progress) * progress * midX + progress ** 2 * meteor.x;
        const y = (1 - progress) ** 2 * centerY + 2 * (1 - progress) * progress * midY + progress ** 2 * meteor.y;
        
        const delay = step * 20 + i * 10; // Staggered arc creation
        
        setTimeout(() => {
          const particle = this.particlePool.get();
          initializeParticle(
            particle,
            x,
            y,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            2 + Math.random(),
            '#e0e7ff', // Electric blue-white
            20 + Math.random() * 15
          );
          this.activeParticles.push(particle);
        }, delay);
      }
    }
  }

  private createEnhancedMeteorDestruction(x: number, y: number, color: string, isSuper: boolean, sequenceIndex: number): void {
    // Create main explosion with enhanced effects
    this.createExplosion(x, y, color, isSuper);
    
    // Add sequence-specific enhancements
    const intensity = Math.max(0.5, 1 - sequenceIndex * 0.1); // Later explosions are slightly less intense
    const particleCount = isSuper ? 15 : 10;
    
    // Create additional particles for enhanced visual impact
    for (let i = 0; i < particleCount * intensity; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = 3 + Math.random() * 4;
      
      const particle = this.particlePool.get();
      initializeParticle(
        particle,
        x + (Math.random() - 0.5) * 20,
        y + (Math.random() - 0.5) * 20,
        Math.cos(angle) * velocity,
        Math.sin(angle) * velocity,
        2 + Math.random() * 3,
        sequenceIndex < 3 ? '#ffffff' : color, // First few explosions are brighter
        40 + Math.random() * 30
      );
      this.activeParticles.push(particle);
    }
    
    // Create small shockwave for each meteor
    const ringParticles = 12;
    for (let i = 0; i < ringParticles; i++) {
      const angle = (Math.PI * 2 * i) / ringParticles;
      const radius = isSuper ? 25 : 15;
      
      const particle = this.particlePool.get();
      initializeParticle(
        particle,
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius,
        Math.cos(angle) * 1.5,
        Math.sin(angle) * 1.5,
        1 + Math.random(),
        '#9d4edd',
        20 + Math.random() * 10
      );
      this.activeParticles.push(particle);
    }
  }

  private createFinalShockwave(centerX: number, centerY: number): void {
    console.log('🔗💥 Creating final chain detonation shockwave');
    
    // Create massive final explosion
    const particleCount = this.isMobile ? 80 : 150;
    const particles = Math.min(particleCount, this.maxParticles - this.activeParticles.length);
    
    for (let i = 0; i < particles; i++) {
      const angle = (Math.PI * 2 * i) / particles;
      const velocity = 8 + Math.random() * 12; // Very fast particles
      const life = 100 + Math.random() * 80; // Long lasting
      
      const particle = this.particlePool.get();
      initializeParticle(
        particle,
        centerX,
        centerY,
        Math.cos(angle) * velocity,
        Math.sin(angle) * velocity,
        6 + Math.random() * 6, // Large particles
        i % 3 === 0 ? '#ffffff' : '#9d4edd', // Mix of white and purple
        life
      );
      this.activeParticles.push(particle);
    }
    
    // Create expanding shockwave rings
    for (let ring = 0; ring < 5; ring++) {
      const delay = ring * 80;
      
      setTimeout(() => {
        const ringParticles = 32;
        const radius = 60 + ring * 40;
        
        for (let i = 0; i < ringParticles; i++) {
          const angle = (Math.PI * 2 * i) / ringParticles;
          
          const particle = this.particlePool.get();
          initializeParticle(
            particle,
            centerX + Math.cos(angle) * radius,
            centerY + Math.sin(angle) * radius,
            Math.cos(angle) * 3,
            Math.sin(angle) * 3,
            4 + Math.random() * 2,
            ring === 0 ? '#ffffff' : '#9d4edd',
            60 + Math.random() * 40
          );
          this.activeParticles.push(particle);
        }
      }, delay);
    }
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