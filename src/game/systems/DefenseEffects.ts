interface LightningBolt {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  branches: Array<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    thickness: number;
  }>;
  thickness: number;
  alpha: number;
  flickerPhase: number;
  duration: number;
  maxDuration: number;
  type: 'destroy' | 'deflect';
}

interface ElectricParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface ElectricRing {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  thickness: number;
  duration: number;
  maxDuration: number;
}

export class DefenseEffects {
  // Lightning effects
  private activeLightningBolts: LightningBolt[] = [];
  private electricParticles: ElectricParticle[] = [];
  private electricRings: ElectricRing[] = [];
  private staticElectricityTimer: number = 0;
  
  // Performance optimization
  private maxLightningBolts: number = 5;
  private maxElectricParticles: number = 50;
  private maxElectricRings: number = 3;
  
  // Color scheme
  private readonly ELECTRIC_BLUE = '#00bfff';
  private readonly WHITE_CORE = '#ffffff';
  private readonly PURPLE_EDGE = '#8a2be2';
  private readonly ELECTRIC_CYAN = '#00ffff';
  private readonly LIGHTNING_YELLOW = '#ffff00';

  constructor() {
    // Effects system is ready
  }

  /**
   * Create localized lightning effects around the corner (no screen flash)
   */
  public createLocalizedLightningEffects(
    badgeX: number, 
    badgeY: number, 
    meteorX: number, 
    meteorY: number, 
    type: 'destroy' | 'deflect'
  ): void {
    this.staticElectricityTimer = 500; // 500ms of static electricity
    
    // Create lightning bolt from badge to meteor
    this.createLightningBolt(badgeX, badgeY, meteorX, meteorY, type);
    
    // Create electric ring pulse from badge (localized)
    this.createElectricRing(badgeX, badgeY, type);
    
    // Create electric spark burst at contact point
    this.createElectricSparkBurst(meteorX, meteorY, type);
    
    // Create corner lightning field enhancement
    this.enhanceCornerLightningField(badgeX, badgeY, type);
    
    // Dispatch audio event
    this.dispatchAudioEvent(type);
  }

  /**
   * Create dramatic lightning effect when player is eliminated by defense system
   */
  public createPlayerEliminationEffect(badgeX: number, badgeY: number, playerX: number, playerY: number): void {
    // Create multiple intense lightning bolts
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.createLightningBolt(badgeX, badgeY, playerX, playerY, 'destroy');
      }, i * 30); // Staggered bolts for dramatic effect
    }
    
    // Create large electric ring at player position
    this.createElectricRing(playerX, playerY, 'destroy');
    
    // Create intense spark burst at player position
    this.createElectricSparkBurst(playerX, playerY, 'destroy');
    
    // Extend static electricity duration for dramatic effect
    this.staticElectricityTimer = 1000; // 1 second of intense static
    
    // Dispatch special audio event for player elimination
    const audioEvent = new CustomEvent('electricDefense', {
      detail: {
        type: 'playerElimination',
        intensity: 'maximum',
        timestamp: performance.now()
      }
    });
    
    window.dispatchEvent(audioEvent);
  }

  /**
   * Enhance the corner lightning field when activated
   */
  private enhanceCornerLightningField(badgeX: number, badgeY: number, type: 'destroy' | 'deflect'): void {
    // Create additional lightning bolts around the corner area
    const cornerBolts = type === 'destroy' ? 3 : 2;
    
    for (let i = 0; i < cornerBolts; i++) {
      // Create lightning bolts that emanate from the corner area
      const angle = (Math.PI * 1.5) + (Math.PI * 0.5 * i / cornerBolts); // Quarter circle in bottom-right
      const distance = 60 + Math.random() * 40;
      const endX = badgeX + Math.cos(angle) * distance;
      const endY = badgeY + Math.sin(angle) * distance;
      
      // Slight delay for each bolt
      setTimeout(() => {
        this.createLightningBolt(badgeX, badgeY, endX, endY, type);
      }, i * 50);
    }
  }

  /**
   * Create branching lightning bolt with jagged path
   */
  private createLightningBolt(
    startX: number, 
    startY: number, 
    endX: number, 
    endY: number, 
    type: 'destroy' | 'deflect'
  ): void {
    if (this.activeLightningBolts.length >= this.maxLightningBolts) {
      // Remove oldest bolt
      this.activeLightningBolts.shift();
    }

    const bolt: LightningBolt = {
      id: Math.random().toString(36).substr(2, 9),
      startX,
      startY,
      endX,
      endY,
      branches: [],
      thickness: type === 'destroy' ? 4 : 3,
      alpha: 1,
      flickerPhase: 0,
      duration: 200, // 200ms duration
      maxDuration: 200,
      type
    };

    // Create 2-3 branching bolts at random points along main bolt
    const branchCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < branchCount; i++) {
      const progress = 0.3 + Math.random() * 0.4; // Branch between 30-70% along main bolt
      const branchStartX = startX + (endX - startX) * progress;
      const branchStartY = startY + (endY - startY) * progress;
      
      // Random branch direction
      const branchAngle = Math.random() * Math.PI * 2;
      const branchLength = 20 + Math.random() * 30;
      const branchEndX = branchStartX + Math.cos(branchAngle) * branchLength;
      const branchEndY = branchStartY + Math.sin(branchAngle) * branchLength;
      
      bolt.branches.push({
        startX: branchStartX,
        startY: branchStartY,
        endX: branchEndX,
        endY: branchEndY,
        thickness: 1 + Math.random() * 2
      });
    }

    this.activeLightningBolts.push(bolt);
  }

  /**
   * Create expanding electric ring
   */
  private createElectricRing(x: number, y: number, type: 'destroy' | 'deflect'): void {
    if (this.electricRings.length >= this.maxElectricRings) {
      this.electricRings.shift();
    }

    const ring: ElectricRing = {
      id: Math.random().toString(36).substr(2, 9),
      x,
      y,
      radius: 10,
      maxRadius: type === 'destroy' ? 80 : 60,
      alpha: 1,
      thickness: type === 'destroy' ? 4 : 3,
      duration: 300, // 300ms duration
      maxDuration: 300
    };

    this.electricRings.push(ring);
  }

  /**
   * Create electric spark burst at contact point
   */
  private createElectricSparkBurst(x: number, y: number, type: 'destroy' | 'deflect'): void {
    const sparkCount = type === 'destroy' ? 12 : 8;
    
    for (let i = 0; i < sparkCount; i++) {
      if (this.electricParticles.length >= this.maxElectricParticles) {
        this.electricParticles.shift();
      }

      const angle = (Math.PI * 2 * i) / sparkCount;
      const speed = 1 + Math.random() * 2;
      const life = 200 + Math.random() * 300; // 200-500ms life

      const particle: ElectricParticle = {
        id: Math.random().toString(36).substr(2, 9),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        life,
        maxLife: life,
        size: 2 + Math.random() * 3,
        color: Math.random() < 0.5 ? this.ELECTRIC_BLUE : this.LIGHTNING_YELLOW
      };

      this.electricParticles.push(particle);
    }
  }

  /**
   * Update all lightning effects
   */
  public update(deltaTime: number): void {
    this.updateLightningBolts(deltaTime);
    this.updateElectricParticles(deltaTime);
    this.updateElectricRings(deltaTime);
    this.updateStaticElectricity(deltaTime);
  }

  /**
   * Update lightning bolts
   */
  private updateLightningBolts(deltaTime: number): void {
    for (let i = this.activeLightningBolts.length - 1; i >= 0; i--) {
      const bolt = this.activeLightningBolts[i];
      
      bolt.duration -= deltaTime;
      bolt.flickerPhase += deltaTime * 0.02;
      
      // Update alpha based on remaining duration
      bolt.alpha = Math.max(0, bolt.duration / bolt.maxDuration);
      
      // Add flickering effect
      bolt.alpha *= 0.7 + Math.sin(bolt.flickerPhase) * 0.3;
      
      if (bolt.duration <= 0) {
        this.activeLightningBolts.splice(i, 1);
      }
    }
  }

  /**
   * Update electric particles
   */
  private updateElectricParticles(deltaTime: number): void {
    for (let i = this.electricParticles.length - 1; i >= 0; i--) {
      const particle = this.electricParticles[i];
      
      // Update position
      particle.x += particle.vx * (deltaTime / 16);
      particle.y += particle.vy * (deltaTime / 16);
      
      // Update life and alpha
      particle.life -= deltaTime;
      particle.alpha = Math.max(0, particle.life / particle.maxLife);
      
      // Add some drag
      particle.vx *= 0.98;
      particle.vy *= 0.98;
      
      // Slight gravity effect
      particle.vy += 0.02 * (deltaTime / 16);
      
      if (particle.life <= 0) {
        this.electricParticles.splice(i, 1);
      }
    }
  }

  /**
   * Update electric rings
   */
  private updateElectricRings(deltaTime: number): void {
    for (let i = this.electricRings.length - 1; i >= 0; i--) {
      const ring = this.electricRings[i];
      
      ring.duration -= deltaTime;
      
      // Expand ring
      const progress = 1 - (ring.duration / ring.maxDuration);
      ring.radius = 10 + (ring.maxRadius - 10) * progress;
      
      // Fade out as it expands
      ring.alpha = Math.max(0, ring.duration / ring.maxDuration);
      
      if (ring.duration <= 0) {
        this.electricRings.splice(i, 1);
      }
    }
  }

  /**
   * Update static electricity timer
   */
  private updateStaticElectricity(deltaTime: number): void {
    if (this.staticElectricityTimer > 0) {
      this.staticElectricityTimer -= deltaTime;
    }
  }

  /**
   * Dispatch audio event for defense activation
   */
  private dispatchAudioEvent(type: 'destroy' | 'deflect'): void {
    const audioEvent = new CustomEvent('electricDefense', {
      detail: {
        type: type,
        intensity: type === 'destroy' ? 'high' : 'medium',
        timestamp: performance.now()
      }
    });
    
    window.dispatchEvent(audioEvent);
  }

  /**
   * Get all active effects for rendering
   */
  public getEffectsForRendering(): {
    lightningBolts: LightningBolt[];
    electricParticles: ElectricParticle[];
    electricRings: ElectricRing[];
    staticElectricityTimer: number;
  } {
    return {
      lightningBolts: [...this.activeLightningBolts],
      electricParticles: [...this.electricParticles],
      electricRings: [...this.electricRings],
      staticElectricityTimer: this.staticElectricityTimer
    };
  }

  /**
   * Clear all effects
   */
  public clear(): void {
    this.activeLightningBolts.length = 0;
    this.electricParticles.length = 0;
    this.electricRings.length = 0;
    this.staticElectricityTimer = 0;
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStats(): {
    lightningBolts: number;
    electricParticles: number;
    electricRings: number;
    staticElectricityActive: boolean;
  } {
    return {
      lightningBolts: this.activeLightningBolts.length,
      electricParticles: this.electricParticles.length,
      electricRings: this.electricRings.length,
      staticElectricityActive: this.staticElectricityTimer > 0
    };
  }
}