import { Meteor } from '../entities/Meteor';

export interface DefenseZone {
  x: number;
  y: number;
  radius: number;
  strength: number; // 0-1, where 1 = destroy, 0.5 = deflect
  type: 'deflect' | 'destroy' | 'hybrid';
}

interface MeteorTracker {
  id: string;
  wasInZone: boolean;
  lastPosition: { x: number; y: number };
}

export interface DefenseResult {
  destroyedMeteors: Meteor[];
  deflectedMeteors: Array<{ meteor: Meteor; newVx: number; newVy: number }>;
  playerInDangerZone: boolean;
}

export class DefenseCore {
  private defenseZones: DefenseZone[] = [];
  private canvas: HTMLCanvasElement;
  
  // Meteor tracking for entry detection
  private meteorTrackers: Map<string, MeteorTracker> = new Map();
  private lastActivationTime: number = 0;
  
  // Callbacks for effects
  onEffectTriggered: (type: 'destroy' | 'deflect', badgeX: number, badgeY: number, meteorX: number, meteorY: number) => void = () => {};
  onPlayerElimination: (badgeX: number, badgeY: number, playerX: number, playerY: number) => void = () => {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
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
   * Check if meteor is entering defense zone and apply effects
   * Only affects meteors that ENTER the zone, not those that start in it
   * Also checks for player collision with active defense zones
   */
  public processMeteorDefense(meteors: Meteor[]): DefenseResult {
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
          }
          
          // Trigger effects callback
          if (action === 'destroy' || action === 'deflect') {
            this.onEffectTriggered(action, zone.x, zone.y, meteor.x, meteor.y);
            this.lastActivationTime = performance.now();
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
        // Trigger player elimination effects
        this.onPlayerElimination(zone.x, zone.y, playerX, playerY);
        return true;
      }
    }
    
    return false;
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
  public cleanupOldTrackers(): void {
    // Remove trackers older than 5 seconds (meteors should be cleaned up by then)
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
   * Determine what action to take based on zone properties and distance
   */
  private determineDefenseAction(zone: DefenseZone, distance: number): 'destroy' | 'deflect' | 'none' {
    if (distance > zone.radius) return 'none';
    
    // Distance factor: closer to center = higher chance of stronger action
    const distanceFactor = 1 - (distance / zone.radius);
    const effectiveStrength = zone.strength * distanceFactor;
    
    switch (zone.type) {
      case 'destroy':
        return effectiveStrength > 0.3 ? 'destroy' : 'none';
      
      case 'deflect':
        return effectiveStrength > 0.2 ? 'deflect' : 'none';
      
      case 'hybrid':
        if (effectiveStrength > 0.6) return 'destroy';
        if (effectiveStrength > 0.3) return 'deflect';
        return 'none';
      
      default:
        return 'none';
    }
  }

  /**
   * Calculate deflection vector for meteor
   */
  private calculateDeflection(meteor: Meteor, zone: DefenseZone, distance: number): { vx: number; vy: number } {
    // Calculate deflection direction (away from zone center)
    const dx = meteor.x - zone.x;
    const dy = meteor.y - zone.y;
    const magnitude = Math.sqrt(dx * dx + dy * dy);
    
    if (magnitude === 0) {
      // If meteor is exactly at zone center, deflect in random direction
      const angle = Math.random() * Math.PI * 2;
      return {
        vx: Math.cos(angle) * 2,
        vy: Math.sin(angle) * 2
      };
    }
    
    // Normalize direction and apply deflection force
    const normalizedDx = dx / magnitude;
    const normalizedDy = dy / magnitude;
    
    // Deflection strength based on zone strength and distance
    const deflectionForce = zone.strength * (1 - distance / zone.radius) * 3;
    
    return {
      vx: meteor.vx + normalizedDx * deflectionForce,
      vy: meteor.vy + normalizedDy * deflectionForce
    };
  }

  /**
   * Calculate distance between two points
   */
  private getDistance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Add new defense zone
   */
  public addDefenseZone(zone: DefenseZone): void {
    this.defenseZones.push(zone);
  }

  /**
   * Remove defense zone by index
   */
  public removeDefenseZone(index: number): void {
    if (index >= 0 && index < this.defenseZones.length) {
      this.defenseZones.splice(index, 1);
    }
  }

  /**
   * Get all defense zones (read-only)
   */
  public getDefenseZones(): DefenseZone[] {
    return [...this.defenseZones];
  }

  /**
   * Clear all defense zones and reset state
   */
  public clear(): void {
    this.defenseZones.length = 0;
    this.meteorTrackers.clear();
    this.lastActivationTime = 0;
    
    // Re-initialize default Bolt badge zone
    this.initializeBoltDefenseZone();
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStats(): {
    defenseZones: number;
    trackedMeteors: number;
    lastActivation: number;
    isActive: boolean;
  } {
    const timeSinceActivation = performance.now() - this.lastActivationTime;
    
    return {
      defenseZones: this.defenseZones.length,
      trackedMeteors: this.meteorTrackers.size,
      lastActivation: this.lastActivationTime,
      isActive: timeSinceActivation < 1000
    };
  }

  /**
   * Check if defense system is currently active
   */
  public isActive(): boolean {
    const timeSinceActivation = performance.now() - this.lastActivationTime;
    return timeSinceActivation < 1000;
  }

  /**
   * Get time since last activation
   */
  public getTimeSinceActivation(): number {
    return performance.now() - this.lastActivationTime;
  }
}