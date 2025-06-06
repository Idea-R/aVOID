import { Meteor } from '../entities/Meteor';
import { SpatialGrid } from '../utils/SpatialGrid';

export interface CollisionResult {
  hasCollision: boolean;
  collidedMeteor?: Meteor;
}

export interface KnockbackResult {
  destroyedMeteors: Meteor[];
  pushedMeteors: Array<{ meteor: Meteor; pushForce: number; angle: number }>;
}

export class CollisionSystem {
  private spatialGrid: SpatialGrid;
  
  // Collision radii (squared for performance)
  private readonly PLAYER_RADIUS = 6;
  private readonly PLAYER_RADIUS_SQUARED = this.PLAYER_RADIUS * this.PLAYER_RADIUS;
  
  // Knockback ranges (squared for performance)
  private readonly KNOCKBACK_DESTROY_RANGE = 150;
  private readonly KNOCKBACK_DESTROY_RANGE_SQUARED = this.KNOCKBACK_DESTROY_RANGE * this.KNOCKBACK_DESTROY_RANGE;
  private readonly KNOCKBACK_PUSH_RANGE = 300;
  private readonly KNOCKBACK_PUSH_RANGE_SQUARED = this.KNOCKBACK_PUSH_RANGE * this.KNOCKBACK_PUSH_RANGE;

  constructor(spatialGrid: SpatialGrid) {
    this.spatialGrid = spatialGrid;
  }

  /**
   * Check collision between player and meteors using optimized distance-squared calculation
   * @param playerX Player X position
   * @param playerY Player Y position
   * @param meteors Array of active meteors
   * @returns CollisionResult with collision status and collided meteor
   */
  checkPlayerMeteorCollisions(playerX: number, playerY: number, meteors: Meteor[]): CollisionResult {
    // Use spatial grid for efficient broad-phase collision detection
    const nearbyObjects = this.spatialGrid.query(playerX, playerY, 50); // Query radius for potential collisions
    
    for (const gridObj of nearbyObjects) {
      // Find the actual meteor object
      const meteor = meteors.find(m => m.id === gridObj.id && m.active);
      if (!meteor) continue;

      // Calculate distance-squared (avoids expensive Math.sqrt)
      const dx = meteor.x - playerX;
      const dy = meteor.y - playerY;
      const distanceSquared = dx * dx + dy * dy;
      
      // Calculate collision threshold-squared
      const collisionRadius = meteor.radius + this.PLAYER_RADIUS;
      const collisionRadiusSquared = collisionRadius * collisionRadius;
      
      if (distanceSquared < collisionRadiusSquared) {
        return {
          hasCollision: true,
          collidedMeteor: meteor
        };
      }
    }

    return { hasCollision: false };
  }

  /**
   * Process knockback collision detection and effects
   * @param centerX Knockback center X position
   * @param centerY Knockback center Y position
   * @param meteors Array of active meteors
   * @returns KnockbackResult with destroyed and pushed meteors
   */
  processKnockbackCollisions(centerX: number, centerY: number, meteors: Meteor[]): KnockbackResult {
    const result: KnockbackResult = {
      destroyedMeteors: [],
      pushedMeteors: []
    };

    // Use spatial grid for efficient broad-phase collision detection
    const nearbyObjects = this.spatialGrid.query(centerX, centerY, this.KNOCKBACK_PUSH_RANGE);
    
    for (const gridObj of nearbyObjects) {
      // Find the actual meteor object
      const meteor = meteors.find(m => m.id === gridObj.id && m.active);
      if (!meteor) continue;

      // Calculate distance-squared (avoids expensive Math.sqrt)
      const dx = meteor.x - centerX;
      const dy = meteor.y - centerY;
      const distanceSquared = dx * dx + dy * dy;

      // Check for destruction (inner radius)
      if (distanceSquared <= this.KNOCKBACK_DESTROY_RANGE_SQUARED) {
        result.destroyedMeteors.push(meteor);
      }
      // Check for push effect (outer radius)
      else if (distanceSquared <= this.KNOCKBACK_PUSH_RANGE_SQUARED) {
        // Calculate actual distance only when needed for push force calculation
        const distance = Math.sqrt(distanceSquared);
        const pushForce = (this.KNOCKBACK_PUSH_RANGE - distance) / this.KNOCKBACK_PUSH_RANGE * 8;
        const angle = Math.atan2(dy, dx);
        
        result.pushedMeteors.push({
          meteor,
          pushForce,
          angle
        });
      }
    }

    return result;
  }

  /**
   * Check collision between player and power-ups using distance-squared
   * @param playerX Player X position
   * @param playerY Player Y position
   * @param powerUpX Power-up X position
   * @param powerUpY Power-up Y position
   * @param powerUpRadius Power-up radius
   * @returns boolean indicating collision
   */
  checkPlayerPowerUpCollision(
    playerX: number, 
    playerY: number, 
    powerUpX: number, 
    powerUpY: number, 
    powerUpRadius: number
  ): boolean {
    // Calculate distance-squared
    const dx = powerUpX - playerX;
    const dy = powerUpY - playerY;
    const distanceSquared = dx * dx + dy * dy;
    
    // Calculate collision threshold-squared
    const collisionRadius = powerUpRadius + this.PLAYER_RADIUS;
    const collisionRadiusSquared = collisionRadius * collisionRadius;
    
    return distanceSquared < collisionRadiusSquared;
  }

  /**
   * Check if a point is within a circular area using distance-squared
   * @param pointX Point X position
   * @param pointY Point Y position
   * @param centerX Circle center X position
   * @param centerY Circle center Y position
   * @param radius Circle radius
   * @returns boolean indicating if point is within circle
   */
  isPointInCircle(pointX: number, pointY: number, centerX: number, centerY: number, radius: number): boolean {
    const dx = pointX - centerX;
    const dy = pointY - centerY;
    const distanceSquared = dx * dx + dy * dy;
    const radiusSquared = radius * radius;
    
    return distanceSquared <= radiusSquared;
  }

  /**
   * Get distance between two points (only calculates sqrt when needed)
   * @param x1 First point X
   * @param y1 First point Y
   * @param x2 Second point X
   * @param y2 Second point Y
   * @returns Actual distance
   */
  getDistance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get distance-squared between two points (faster, no sqrt)
   * @param x1 First point X
   * @param y1 First point Y
   * @param x2 Second point X
   * @param y2 Second point Y
   * @returns Distance squared
   */
  getDistanceSquared(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
  }

  /**
   * Update the spatial grid reference (called when grid is resized)
   * @param spatialGrid New spatial grid instance
   */
  updateSpatialGrid(spatialGrid: SpatialGrid): void {
    this.spatialGrid = spatialGrid;
  }

  /**
   * Get collision system statistics for debugging
   * @returns Object with collision system stats
   */
  getStats(): {
    playerRadius: number;
    knockbackDestroyRange: number;
    knockbackPushRange: number;
  } {
    return {
      playerRadius: this.PLAYER_RADIUS,
      knockbackDestroyRange: this.KNOCKBACK_DESTROY_RANGE,
      knockbackPushRange: this.KNOCKBACK_PUSH_RANGE
    };
  }
}