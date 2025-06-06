export interface GridObject {
  x: number;
  y: number;
  radius: number;
  id: string;
}

export class SpatialGrid {
  private cellSize: number;
  private cols: number;
  private rows: number;
  private grid: Map<string, GridObject[]>;

  constructor(width: number, height: number, cellSize: number = 100) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(width / cellSize);
    this.rows = Math.ceil(height / cellSize);
    this.grid = new Map();
  }

  private getCellKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  private getCellCoords(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: Math.floor(worldX / this.cellSize),
      y: Math.floor(worldY / this.cellSize)
    };
  }

  clear(): void {
    this.grid.clear();
  }

  insert(obj: GridObject): void {
    const { x, y } = this.getCellCoords(obj.x, obj.y);
    
    // Insert into multiple cells if object spans across them
    const radius = obj.radius;
    const minX = Math.max(0, Math.floor((obj.x - radius) / this.cellSize));
    const maxX = Math.min(this.cols - 1, Math.floor((obj.x + radius) / this.cellSize));
    const minY = Math.max(0, Math.floor((obj.y - radius) / this.cellSize));
    const maxY = Math.min(this.rows - 1, Math.floor((obj.y + radius) / this.cellSize));

    for (let cellX = minX; cellX <= maxX; cellX++) {
      for (let cellY = minY; cellY <= maxY; cellY++) {
        const key = this.getCellKey(cellX, cellY);
        if (!this.grid.has(key)) {
          this.grid.set(key, []);
        }
        this.grid.get(key)!.push(obj);
      }
    }
  }

  query(x: number, y: number, radius: number): GridObject[] {
    const results: GridObject[] = [];
    const seen = new Set<string>();

    const minX = Math.max(0, Math.floor((x - radius) / this.cellSize));
    const maxX = Math.min(this.cols - 1, Math.floor((x + radius) / this.cellSize));
    const minY = Math.max(0, Math.floor((y - radius) / this.cellSize));
    const maxY = Math.min(this.rows - 1, Math.floor((y + radius) / this.cellSize));

    for (let cellX = minX; cellX <= maxX; cellX++) {
      for (let cellY = minY; cellY <= maxY; cellY++) {
        const key = this.getCellKey(cellX, cellY);
        const cell = this.grid.get(key);
        
        if (cell) {
          for (const obj of cell) {
            if (!seen.has(obj.id)) {
              seen.add(obj.id);
              results.push(obj);
            }
          }
        }
      }
    }

    return results;
  }

  resize(width: number, height: number): void {
    this.cols = Math.ceil(width / this.cellSize);
    this.rows = Math.ceil(height / this.cellSize);
    this.clear();
  }
}