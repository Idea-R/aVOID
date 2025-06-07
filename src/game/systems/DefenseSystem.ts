import { Meteor } from '../entities/Meteor';

export interface DefenseZone {
  x: number;
  y: number;
  radius: number;
  strength: number; // 0-1, where 1 = destroy, 0.5 = deflect
  type: 'deflect' | 'destroy' | 'hybrid';
}

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

export class DefenseSystem {
  private defenseZones: DefenseZone[] = [];
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  // Lightning effects
  private activeLightningBolts: LightningBolt[] = [];
  private electricParticles: ElectricParticle[] = [];
  private electricRings: ElectricRing[] = [];
  private staticElectricityTimer: number = 0;
  private lastActivationTime: number = 0;
  
  // Performance optimization
  private maxLightningBolts: number = 5;
  private maxElectricParticles: number = 50;
  private maxElectricRings: number = 3;
  
  // Color scheme
  private readonly ELECTRIC_BLUE = '#00bfff';
  private readonly WHITE_CORE = '#ffffff';
  private readonly PURPLE_EDGE = '#8a2be2';
  private readonly ELECTRIC_CYAN = '#00ffff';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get canvas context');
    this.ctx = context;
    
    this.initializeBoltDefenseZone();
  }

  /**
   * Initialize the Bolt.new badge defense zone
   */
  private initializeBoltDefenseZone(): void {
    // Position matches the badge location (bottom-right corner)
    const badgeX = this.canvas.width - 96;
    const badgeY = this.canvas.height - 40;
    
    this.defenseZones.push({
      x: badgeX,
      y: badgeY,
      radius: 96, // 20% larger defense radius
      strength: 0.7, // 70% chance to destroy, 30% to deflect
      type: 'hybrid'
    });
  }

  /**
   * Update defense zone positions on canvas resize
   */
  public updateCanvasSize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    
    // Update Bolt badge defense zone position
    if (this.defenseZones.length > 0) {
      this.defenseZones[0].x = width - 96;
      this.defenseZones[0].y = height - 40;
    }
  }

  /**
   * Update all electrical effects
   */
  public update(deltaTime: number): void {
    this.updateLightningBolts(deltaTime);
    this.updateElectricParticles(deltaTime);
    this.updateElectricRings(deltaTime);
    this.updateStaticElectricity(deltaTime);
  }

  /**
   * Render all electrical effects
   */
  public render(): void {
    this.ctx.save();
    
    // Set composite mode for electric effects
    this.ctx.globalCompositeOperation = 'screen';
    
    this.renderElectricRings();
    this.renderLightningBolts();
    this.renderElectricParticles();
    this.renderStaticElectricity();
    
    this.ctx.restore();
  }

  /**
   * Check if meteor is in any defense zone and apply effects
   */
  public processMeteorDefense(meteors: Meteor[]): {
    destroyedMeteors: Meteor[];
    deflectedMeteors: Array<{ meteor: Meteor; newVx: number; newVy: number }>;
  } {
    const destroyedMeteors: Meteor[] = [];
    const deflectedMeteors: Array<{ meteor: Meteor; newVx: number; newVy: number }> = [];

    for (const meteor of meteors) {
      if (!meteor.active) continue;

      // Skip meteors that just spawned (grace period)
      if (this.isMeteorJustSpawned(meteor)) continue;

      for (const zone of this.defenseZones) {
        const distance = this.getDistance(meteor.x, meteor.y, zone.x, zone.y);
        
        if (distance <= zone.radius) {
          const action = this.determineDefenseAction(zone, distance);
          
          if (action === 'destroy') {
            destroyedMeteors.push(meteor);
            this.createSpectacularElectricalEffects(zone.x, zone.y, meteor.x, meteor.y, 'destroy');
          } else if (action === 'deflect') {
            const deflection = this.calculateDeflection(meteor, zone, distance);
            deflectedMeteors.push({
              meteor,
              newVx: deflection.vx,
              newVy: deflection.vy
            });
            this.createSpectacularElectricalEffects(zone.x, zone.y, meteor.x, meteor.y, 'deflect');
          }
          
          break; // Only process first zone hit
        }
      }
    }

    return { destroyedMeteors, deflectedMeteors };
  }

  /**
   * Create spectacular electrical effects for defense actions
   */
  private createSpectacularElectricalEffects(
    badgeX: number, 
    badgeY: number, 
    meteorX: number, 
    meteorY: number, 
    type: 'destroy' | 'deflect'
  ): void {
    const currentTime = performance.now();
    this.lastActivationTime = currentTime;
    this.staticElectricityTimer = 500; // 500ms of static electricity
    
    // Create lightning bolt from badge to meteor
    this.createLightningBolt(badgeX, badgeY, meteorX, meteorY, type);
    
    // Create electric ring pulse from badge
    this.createElectricRing(badgeX, badgeY, type);
    
    // Create electric spark burst at contact point
    this.createElectricSparkBurst(meteorX, meteorY, type);
    
    // Create screen flash effect
    this.createScreenFlash(type);
    
    // Dispatch audio event
    this.dispatchAudioEvent(type);
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
      thickness: type === 'destroy' ? 3 : 2,
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
        thickness: 1 + Math.random()
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
      duration: 300, // 300ms expansion
      maxDuration: 300
    };

    this.electricRings.push(ring);
  }

  /**
   * Create electric spark burst at contact point
   */
  private createElectricSparkBurst(x: number, y: number, type: 'destroy' | 'deflect'): void {
    const sparkCount = type === 'destroy' ? 15 : 10;
    const availableSlots = this.maxElectricParticles - this.electricParticles.length;
    const actualSparkCount = Math.min(sparkCount, availableSlots);

    for (let i = 0; i < actualSparkCount; i++) {
      // Create jagged movement pattern
      const angle = (Math.PI * 2 * i) / actualSparkCount + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 4;
      
      // Jagged velocity with random direction changes
      const jaggedVx = Math.cos(angle) * speed + (Math.random() - 0.5) * 2;
      const jaggedVy = Math.sin(angle) * speed + (Math.random() - 0.5) * 2;

      const particle: ElectricParticle = {
        id: Math.random().toString(36).substr(2, 9),
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: jaggedVx,
        vy: jaggedVy,
        alpha: 1,
        life: 40 + Math.random() * 20, // 40-60 frames
        maxLife: 60,
        size: 2 + Math.random() * 3,
        color: Math.random() < 0.7 ? this.ELECTRIC_BLUE : this.WHITE_CORE
      };

      this.electricParticles.push(particle);
    }
  }

  /**
   * Create screen flash effect
   */
  private createScreenFlash(type: 'destroy' | 'deflect'): void {
    const flashIntensity = type === 'destroy' ? 0.3 : 0.2;
    const flashColor = type === 'destroy' ? this.ELECTRIC_BLUE : this.ELECTRIC_CYAN;
    
    // Create temporary flash overlay
    const flashOverlay = document.createElement('div');
    flashOverlay.style.position = 'fixed';
    flashOverlay.style.top = '0';
    flashOverlay.style.left = '0';
    flashOverlay.style.width = '100vw';
    flashOverlay.style.height = '100vh';
    flashOverlay.style.backgroundColor = flashColor;
    flashOverlay.style.opacity = flashIntensity.toString();
    flashOverlay.style.pointerEvents = 'none';
    flashOverlay.style.zIndex = '9999';
    flashOverlay.style.transition = 'opacity 100ms ease-out';
    
    document.body.appendChild(flashOverlay);
    
    // Fade out and remove
    setTimeout(() => {
      flashOverlay.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(flashOverlay);
      }, 100);
    }, 50);
  }

  /**
   * Update lightning bolts
   */
  private updateLightningBolts(deltaTime: number): void {
    for (let i = this.activeLightningBolts.length - 1; i >= 0; i--) {
      const bolt = this.activeLightningBolts[i];
      
      bolt.duration -= deltaTime;
      bolt.flickerPhase += deltaTime * 0.02; // Fast flickering
      
      // Flickering alpha (3-4 quick flashes)
      const flickerCycle = Math.sin(bolt.flickerPhase * 15) * 0.5 + 0.5;
      bolt.alpha = (bolt.duration / bolt.maxDuration) * (0.5 + flickerCycle * 0.5);
      
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
      
      // Jagged movement pattern
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // Add random jitter for electric effect
      particle.vx += (Math.random() - 0.5) * 0.5;
      particle.vy += (Math.random() - 0.5) * 0.5;
      
      // Damping
      particle.vx *= 0.98;
      particle.vy *= 0.98;
      
      particle.life -= deltaTime / 16.67; // Normalize to 60fps
      particle.alpha = particle.life / particle.maxLife;
      
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
      const progress = 1 - (ring.duration / ring.maxDuration);
      
      ring.radius = ring.maxRadius * progress;
      ring.alpha = 1 - progress;
      
      if (ring.duration <= 0) {
        this.electricRings.splice(i, 1);
      }
    }
  }

  /**
   * Update static electricity around badge
   */
  private updateStaticElectricity(deltaTime: number): void {
    if (this.staticElectricityTimer > 0) {
      this.staticElectricityTimer -= deltaTime;
    }
  }

  /**
   * Render lightning bolts with jagged paths
   */
  private renderLightningBolts(): void {
    for (const bolt of this.activeLightningBolts) {
      this.ctx.save();
      this.ctx.globalAlpha = bolt.alpha;
      
      // Main lightning bolt with jagged path
      this.drawJaggedLightning(
        bolt.startX, 
        bolt.startY, 
        bolt.endX, 
        bolt.endY, 
        bolt.thickness,
        bolt.type
      );
      
      // Draw branches
      for (const branch of bolt.branches) {
        this.drawJaggedLightning(
          branch.startX,
          branch.startY,
          branch.endX,
          branch.endY,
          branch.thickness,
          bolt.type
        );
      }
      
      this.ctx.restore();
    }
  }

  /**
   * Draw jagged lightning path
   */
  private drawJaggedLightning(
    startX: number, 
    startY: number, 
    endX: number, 
    endY: number, 
    thickness: number,
    type: 'destroy' | 'deflect'
  ): void {
    const segments = 8; // Number of jagged segments
    const jaggedOffset = type === 'destroy' ? 15 : 10; // Maximum offset from straight line
    
    this.ctx.beginPath();
    this.ctx.moveTo(startX, startY);
    
    // Create jagged path
    for (let i = 1; i <= segments; i++) {
      const progress = i / segments;
      const baseX = startX + (endX - startX) * progress;
      const baseY = startY + (endY - startY) * progress;
      
      // Add random offset perpendicular to the line
      const perpAngle = Math.atan2(endY - startY, endX - startX) + Math.PI / 2;
      const offset = (Math.random() - 0.5) * jaggedOffset;
      const jaggedX = baseX + Math.cos(perpAngle) * offset;
      const jaggedY = baseY + Math.sin(perpAngle) * offset;
      
      this.ctx.lineTo(jaggedX, jaggedY);
    }
    
    // Draw with gradient effect
    this.ctx.lineWidth = thickness;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    // Outer glow (purple edge)
    this.ctx.strokeStyle = this.PURPLE_EDGE;
    this.ctx.lineWidth = thickness + 2;
    this.ctx.stroke();
    
    // Main bolt (electric blue)
    this.ctx.strokeStyle = this.ELECTRIC_BLUE;
    this.ctx.lineWidth = thickness;
    this.ctx.stroke();
    
    // Inner core (white)
    this.ctx.strokeStyle = this.WHITE_CORE;
    this.ctx.lineWidth = Math.max(1, thickness - 1);
    this.ctx.stroke();
  }

  /**
   * Render electric particles
   */
  private renderElectricParticles(): void {
    for (const particle of this.electricParticles) {
      this.ctx.save();
      this.ctx.globalAlpha = particle.alpha;
      
      // Particle glow
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size + 2, 0, Math.PI * 2);
      this.ctx.fillStyle = this.PURPLE_EDGE;
      this.ctx.fill();
      
      // Main particle
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fillStyle = particle.color;
      this.ctx.fill();
      
      // Bright core
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
      this.ctx.fillStyle = this.WHITE_CORE;
      this.ctx.fill();
      
      this.ctx.restore();
    }
  }

  /**
   * Render electric rings
   */
  private renderElectricRings(): void {
    for (const ring of this.electricRings) {
      this.ctx.save();
      this.ctx.globalAlpha = ring.alpha;
      
      // Outer ring (purple edge)
      this.ctx.beginPath();
      this.ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = this.PURPLE_EDGE;
      this.ctx.lineWidth = ring.thickness + 2;
      this.ctx.stroke();
      
      // Main ring (electric blue)
      this.ctx.beginPath();
      this.ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = this.ELECTRIC_BLUE;
      this.ctx.lineWidth = ring.thickness;
      this.ctx.stroke();
      
      // Inner ring (white core)
      this.ctx.beginPath();
      this.ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = this.WHITE_CORE;
      this.ctx.lineWidth = Math.max(1, ring.thickness - 1);
      this.ctx.stroke();
      
      this.ctx.restore();
    }
  }

  /**
   * Render static electricity around badge
   */
  private renderStaticElectricity(): void {
    if (this.staticElectricityTimer <= 0 || this.defenseZones.length === 0) return;
    
    const zone = this.defenseZones[0]; // Badge zone
    const intensity = this.staticElectricityTimer / 500; // Fade over 500ms
    
    this.ctx.save();
    this.ctx.globalAlpha = intensity * 0.3;
    
    // Create crackling static around the badge
    const crackleCount = 8;
    for (let i = 0; i < crackleCount; i++) {
      const angle = (Math.PI * 2 * i) / crackleCount + performance.now() * 0.01;
      const distance = 30 + Math.sin(performance.now() * 0.02 + i) * 10;
      const x = zone.x + Math.cos(angle) * distance;
      const y = zone.y + Math.sin(angle) * distance;
      
      // Small crackling sparks
      this.ctx.beginPath();
      this.ctx.arc(x, y, 2, 0, Math.PI * 2);
      this.ctx.fillStyle = this.ELECTRIC_CYAN;
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }

  /**
   * Dispatch audio event for sound effects
   */
  private dispatchAudioEvent(type: 'destroy' | 'deflect'): void {
    const intensity = type === 'destroy' ? 'intense' : 'moderate';
    
    const audioEvent = new CustomEvent('electricDefense', {
      detail: {
        type,
        intensity,
        timestamp: performance.now()
      }
    });
    
    window.dispatchEvent(audioEvent);
  }

  /**
   * Check if meteor just spawned (within grace period)
   */
  private isMeteorJustSpawned(meteor: Meteor): boolean {
    const margin = 30;
    const isNearEdge = 
      meteor.x < margin || 
      meteor.x > this.canvas.width - margin ||
      meteor.y < margin || 
      meteor.y > this.canvas.height - margin;
    
    return isNearEdge;
  }

  /**
   * Determine what action to take based on zone and distance
   */
  private determineDefenseAction(zone: DefenseZone, distance: number): 'destroy' | 'deflect' | 'none' {
    const proximityFactor = 1 - (distance / zone.radius);
    
    switch (zone.type) {
      case 'destroy':
        return 'destroy';
      
      case 'deflect':
        return 'deflect';
      
      case 'hybrid':
        const destroyChance = zone.strength * proximityFactor;
        return Math.random() < destroyChance ? 'destroy' : 'deflect';
      
      default:
        return 'none';
    }
  }

  /**
   * Calculate deflection velocity for meteor
   */
  private calculateDeflection(meteor: Meteor, zone: DefenseZone, distance: number): { vx: number; vy: number } {
    const dx = meteor.x - zone.x;
    const dy = meteor.y - zone.y;
    const angle = Math.atan2(dy, dx);
    
    const proximityFactor = 1 - (distance / zone.radius);
    const deflectionForce = 2 + (proximityFactor * 3);
    
    const deflectedVx = Math.cos(angle) * deflectionForce;
    const deflectedVy = Math.sin(angle) * deflectionForce;
    
    return {
      vx: meteor.vx * 0.3 + deflectedVx,
      vy: meteor.vy * 0.3 + deflectedVy
    };
  }

  /**
   * Get distance between two points
   */
  private getDistance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Add a new defense zone
   */
  public addDefenseZone(zone: DefenseZone): void {
    this.defenseZones.push(zone);
  }

  /**
   * Remove a defense zone
   */
  public removeDefenseZone(index: number): void {
    if (index >= 0 && index < this.defenseZones.length) {
      this.defenseZones.splice(index, 1);
    }
  }

  /**
   * Get all defense zones (for debugging/visualization)
   */
  public getDefenseZones(): DefenseZone[] {
    return [...this.defenseZones];
  }

  /**
   * Clear all defense zones and effects
   */
  public clear(): void {
    this.defenseZones.length = 0;
    this.activeLightningBolts.length = 0;
    this.electricParticles.length = 0;
    this.electricRings.length = 0;
    this.staticElectricityTimer = 0;
  }

  /**
   * Get performance stats for debugging
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