export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export class PlayerTrailManager {
  private trail: TrailPoint[] = [];
  private readonly MAX_TRAIL_LENGTH = 25;
  private readonly ALPHA_DECAY = 0.92;

  update(playerX: number, playerY: number): void {
    this.trail.unshift({ x: playerX, y: playerY, alpha: 1 });
    if (this.trail.length > this.MAX_TRAIL_LENGTH) {
      this.trail.pop();
    }
    this.trail.forEach(point => point.alpha *= this.ALPHA_DECAY);
  }

  getTrail(): TrailPoint[] {
    return this.trail;
  }

  reset(): void {
    this.trail.length = 0;
  }
}