export interface DirtyRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class DirtyRectManager {
  private dirtyRects: DirtyRect[] = [];
  private canvasWidth: number;
  private canvasHeight: number;
  private mergeThreshold: number = 50; // Merge rects if they're within this distance

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  addDirtyRect(x: number, y: number, width: number, height: number): void {
    // Clamp to canvas bounds
    const rect: DirtyRect = {
      x: Math.max(0, Math.floor(x)),
      y: Math.max(0, Math.floor(y)),
      width: Math.min(this.canvasWidth - Math.max(0, Math.floor(x)), Math.ceil(width)),
      height: Math.min(this.canvasHeight - Math.max(0, Math.floor(y)), Math.ceil(height))
    };

    if (rect.width <= 0 || rect.height <= 0) return;

    this.dirtyRects.push(rect);
  }

  addCircleDirtyRect(x: number, y: number, radius: number, padding: number = 5): void {
    const size = (radius + padding) * 2;
    this.addDirtyRect(x - radius - padding, y - radius - padding, size, size);
  }

  addTrailDirtyRect(trail: Array<{ x: number; y: number }>, radius: number): void {
    if (trail.length === 0) return;

    let minX = trail[0].x;
    let minY = trail[0].y;
    let maxX = trail[0].x;
    let maxY = trail[0].y;

    for (const point of trail) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }

    const padding = radius + 10;
    this.addDirtyRect(
      minX - padding,
      minY - padding,
      maxX - minX + padding * 2,
      maxY - minY + padding * 2
    );
  }

  mergeDirtyRects(): DirtyRect[] {
    if (this.dirtyRects.length === 0) return [];

    // Sort by x coordinate for better merging
    this.dirtyRects.sort((a, b) => a.x - b.x);

    const merged: DirtyRect[] = [];
    let current = { ...this.dirtyRects[0] };

    for (let i = 1; i < this.dirtyRects.length; i++) {
      const rect = this.dirtyRects[i];

      // Check if rects can be merged
      if (this.canMerge(current, rect)) {
        current = this.merge(current, rect);
      } else {
        merged.push(current);
        current = { ...rect };
      }
    }

    merged.push(current);
    return merged;
  }

  private canMerge(rect1: DirtyRect, rect2: DirtyRect): boolean {
    const dx = Math.abs((rect1.x + rect1.width / 2) - (rect2.x + rect2.width / 2));
    const dy = Math.abs((rect1.y + rect1.height / 2) - (rect2.y + rect2.height / 2));
    
    return dx < this.mergeThreshold && dy < this.mergeThreshold;
  }

  private merge(rect1: DirtyRect, rect2: DirtyRect): DirtyRect {
    const minX = Math.min(rect1.x, rect2.x);
    const minY = Math.min(rect1.y, rect2.y);
    const maxX = Math.max(rect1.x + rect1.width, rect2.x + rect2.width);
    const maxY = Math.max(rect1.y + rect1.height, rect2.y + rect2.height);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  getDirtyRects(): DirtyRect[] {
    return this.mergeDirtyRects();
  }

  clear(): void {
    this.dirtyRects.length = 0;
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.clear();
  }

  // Force full screen redraw
  markFullScreenDirty(): void {
    this.clear();
    this.addDirtyRect(0, 0, this.canvasWidth, this.canvasHeight);
  }
}