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

interface MeteorTracker {
  id: string;
  wasInZone: boolean;
  lastPosition: { x: number; y: number };
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
  
  // Meteor tracking for entry detection
  private meteorTrackers: Map<string, MeteorTracker> = new Map();
  
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
    // Position matches the badge location (bottom-right corner) - centered on badge
    const badgeX = this.canvas.width - 32; // Much closer to right edge to center on badge
    const badgeY = this.canvas.height - 32; // Adjusted to center on badge
    
    this.defenseZones.push({
      x: badgeX,
      y: badgeY,
      radius: 120, // 20% bigger collision area as requested
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
      this.defenseZones[0].x = width - 32; // Much closer to right edge to center on badge
      this.defenseZones[0].y = height - 32; // Centered on badge
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
    this.cleanupOldTrackers();
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
    this.renderCornerLightningField();
    
    this.ctx.restore();
  }

  /**
   * Check if meteor is entering defense zone and apply effects
   * Only affects meteors that ENTER the zone, not those that start in it
   * Also checks for player collision with active defense zones
   */
  public processMeteorDefense(meteors: Meteor[]): {
    destroyedMeteors: Meteor[];
    deflectedMeteors: Array<{ meteor: Meteor; newVx: number; newVy: number }>;
    playerInDangerZone: boolean;
  } {
    const destroyedMeteors: Meteor[] = [];
    const deflectedMeteors: Array<{ meteor: Meteor; newVx: number; newVy: number }> = [];
    let playerInDangerZone = false;

    for (const meteor of meteors) {
      if (!meteor.active) continue;

      // Update or create tracker for this meteor
      this.updateMeteorTracker(meteor);
      
      const tracker = this.meteorTrackers.get(meteor.id);
      if (!tracker) continue;

      for (const zone of this.defenseZones) {
        const distance = this.getDistance(meteor.x, meteor.y, zone.x, zone.y);
        const isInZone = distance <= zone.radius;
        
        // Only trigger defense if meteor is entering the zone (wasn't in zone before, but is now)
        if (isInZone && !tracker.wasInZone) {
          const action = this.determineDefenseAction(zone, distance);
          
          if (action === 'destroy') {
            destroyedMeteors.push(meteor);
          } else if (action === 'deflect') {
            const deflection = this.calculateDeflection(meteor, zone, distance);
            deflectedMeteors.push({
              meteor,
              newVx: deflection.vx,
              newVy: deflection.vy
            });
            this.createLocalizedLightningEffects(zone.x, zone.y, meteor.x, meteor.y, 'deflect');
          }
          
          break; // Only process first zone hit
        }
        
        // Update tracker state
        tracker.wasInZone = isInZone;
      }
    }

    return { destroyedMeteors, deflectedMeteors, playerInDangerZone };
  }

  /**
   * Check if player is in an active electrical defense zone
   * Returns true if player should be eliminated
   */
  public checkPlayerCollision(playerX: number, playerY: number): boolean {
    // Only check collision if defense system has been recently activated
    const timeSinceActivation = performance.now() - this.lastActivationTime;
    const isDefenseActive = timeSinceActivation < 1000; // Active for 1 second after activation
    
    if (!isDefenseActive) return false;
    
    for (const zone of this.defenseZones) {
      const distance = this.getDistance(playerX, playerY, zone.x, zone.y);
      
      // Player collision radius is smaller than meteor collision radius for fairness
      const playerCollisionRadius = zone.radius * 0.7; // 70% of full zone radius
      
      if (distance <= playerCollisionRadius) {
        // Create dramatic lightning effect for player elimination
        this.createPlayerEliminationEffect(zone.x, zone.y, playerX, playerY);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Create dramatic lightning effect when player is eliminated by defense system
   */
  private createPlayerEliminationEffect(badgeX: number, badgeY: number, playerX: number, playerY: number): void {
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
   * Update or create meteor tracker
   */
  private updateMeteorTracker(meteor: Meteor): void {
    let tracker = this.meteorTrackers.get(meteor.id);
    
    if (!tracker) {
      // New meteor - check if it starts in any defense zone
      let startsInZone = false;
      for (const zone of this.defenseZones) {
        const distance = this.getDistance(meteor.x, meteor.y, zone.x, zone.y);
        if (distance <= zone.radius) {
          startsInZone = true;
          break;
        }
      }
      
      tracker = {
        id: meteor.id,
        wasInZone: startsInZone, // If it starts in zone, mark as already in zone
        lastPosition: { x: meteor.x, y: meteor.y }
      };
      
      this.meteorTrackers.set(meteor.id, tracker);
    } else {
      // Update position
      tracker.lastPosition = { x: meteor.x, y: meteor.y };
    }
  }

  /**
   * Clean up trackers for meteors that no longer exist
   */
  private cleanupOldTrackers(): void {
    // Remove trackers older than 5 seconds (meteors should be cleaned up by then)
    const cutoffTime = performance.now() - 5000;
    
    for (const [id, tracker] of this.meteorTrackers.entries()) {
      // Simple cleanup - remove trackers that haven't been updated recently
      // In a real implementation, you'd want to track last update time
      if (this.meteorTrackers.size > 100) { // Prevent memory leak
        this.meteorTrackers.delete(id);
        break;
      }
    }
  }

  /**
   * Create localized lightning effects around the corner (no screen flash)
   */
  private createLocalizedLightningEffects(
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
   * Render corner lightning field effect
   */
  private renderCornerLightningField(): void {
    if (this.staticElectricityTimer <= 0 || this.defenseZones.length === 0) return;
    
    const zone = this.defenseZones[0]; // Badge zone
    const intensity = this.staticElectricityTimer / 500; // Fade over 500ms
    
    this.ctx.save();
    this.ctx.globalAlpha = intensity * 0.4;
    
    // Create a localized electrical field around the corner
    const fieldRadius = zone.radius;
    const time = performance.now() * 0.01;
    
    // Draw electrical arcs around the defense perimeter
    const arcCount = 12;
    for (let i = 0; i < arcCount; i++) {
      const baseAngle = (Math.PI * 2 * i) / arcCount;
      const angleVariation = Math.sin(time + i) * 0.3;
      const angle = baseAngle + angleVariation;
      
      const innerRadius = fieldRadius * 0.7;
      const outerRadius = fieldRadius * (0.9 + Math.sin(time * 2 + i) * 0.1);
      
      const startX = zone.x + Math.cos(angle) * innerRadius;
      const startY = zone.y + Math.sin(angle) * innerRadius;
      const endX = zone.x + Math.cos(angle) * outerRadius;
      const endY = zone.y + Math.sin(angle) * outerRadius;
      
      // Draw mini lightning arc
      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      
      // Add some jaggedness to the arc
      const midX = (startX + endX) / 2 + (Math.random() - 0.5) * 10;
      const midY = (startY + endY) / 2 + (Math.random() - 0.5) * 10;
      
      this.ctx.quadraticCurveTo(midX, midY, endX, endY);
      
      this.ctx.strokeStyle = this.ELECTRIC_CYAN;
      this.ctx.lineWidth = 1 + Math.random();
      this.ctx.stroke();
    }
    
    // Add pulsing energy at the center
    const pulseRadius = 8 + Math.sin(time * 3) * 4;
    this.ctx.beginPath();
    this.ctx.arc(zone.x, zone.y, pulseRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = this.LIGHTNING_YELLOW;
    this.ctx.fill();
    
    // Inner bright core
    this.ctx.beginPath();
    this.ctx.arc(zone.x, zone.y, pulseRadius * 0.5, 0, Math.PI * 2);
    this.ctx.fillStyle = this.WHITE_CORE;
    this.ctx.fill();
    
    this.ctx.restore();
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
    this.meteorTrackers.clear();
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
    trackedMeteors: number;
  } {
    return {
      lightningBolts: this.activeLightningBolts.length,
      electricParticles: this.electricParticles.length,
      electricRings: this.electricRings.length,
      staticElectricityActive: this.staticElectricityTimer > 0,
      trackedMeteors: this.meteorTrackers.size
    };
  }
}