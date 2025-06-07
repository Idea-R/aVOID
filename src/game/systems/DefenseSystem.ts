import { Meteor } from '../entities/Meteor';

export interface DefenseZone {
  x: number;
  y: number;
  radius: number;
  strength: number; // 0-1, where 1 = destroy, 0.5 = deflect
  type: 'deflect' | 'destroy' | 'hybrid';
}

export class DefenseSystem {
  private defenseZones: DefenseZone[] = [];
  private canvas: HTMLCanvasElement;
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.initializeBoltDefenseZone();
  }

  /**
   * Initialize the Bolt.new badge defense zone
   */
  private initializeBoltDefenseZone(): void {
    // Position matches the badge location (bottom-right corner)
    const badgeX = this.canvas.width - 96; // Moved further right to match new position
    const badgeY = this.canvas.height - 40; // Approximate badge center
    
    this.defenseZones.push({
      x: badgeX,
      y: badgeY,
      radius: 96, // 20% larger defense radius (80 * 1.2 = 96px)
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
            this.createDefenseEffect(meteor.x, meteor.y, 'destroy');
          } else if (action === 'deflect') {
            const deflection = this.calculateDeflection(meteor, zone, distance);
            deflectedMeteors.push({
              meteor,
              newVx: deflection.vx,
              newVy: deflection.vy
            });
            this.createDefenseEffect(meteor.x, meteor.y, 'deflect');
          }
          
          break; // Only process first zone hit
        }
      }
    }

    return { destroyedMeteors, deflectedMeteors };
  }

  /**
   * Check if meteor just spawned (within 500ms of spawn)
   */
  private isMeteorJustSpawned(meteor: Meteor): boolean {
    // This would need to be tracked in meteor entity
    // For now, check if meteor is near screen edges (just spawned)
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
    const proximityFactor = 1 - (distance / zone.radius); // 1 = center, 0 = edge
    
    switch (zone.type) {
      case 'destroy':
        return 'destroy';
      
      case 'deflect':
        return 'deflect';
      
      case 'hybrid':
        // Closer to center = higher chance to destroy
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
    // Calculate angle from zone center to meteor
    const dx = meteor.x - zone.x;
    const dy = meteor.y - zone.y;
    const angle = Math.atan2(dy, dx);
    
    // Calculate deflection strength based on distance
    const proximityFactor = 1 - (distance / zone.radius);
    const deflectionForce = 2 + (proximityFactor * 3); // 2-5 force multiplier
    
    // Apply deflection in direction away from zone center
    const deflectedVx = Math.cos(angle) * deflectionForce;
    const deflectedVy = Math.sin(angle) * deflectionForce;
    
    // Combine with original velocity for realistic deflection
    return {
      vx: meteor.vx * 0.3 + deflectedVx,
      vy: meteor.vy * 0.3 + deflectedVy
    };
  }

  /**
   * Create visual effect for defense action
   */
  private createDefenseEffect(x: number, y: number, type: 'destroy' | 'deflect'): void {
    // Dispatch custom event for particle system to handle
    const effectEvent = new CustomEvent('defenseEffect', {
      detail: { x, y, type }
    });
    window.dispatchEvent(effectEvent);
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
   * Clear all defense zones
   */
  public clear(): void {
    this.defenseZones.length = 0;
  }
}