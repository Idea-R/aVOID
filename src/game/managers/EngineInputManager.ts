import { SpatialGrid } from '../utils/SpatialGrid';

export class EngineInputManager {
  private canvas: HTMLCanvasElement;
  private spatialGrid: SpatialGrid | null = null;
  private onResizeCallback: () => void = () => {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupEventListeners();
  }

  setSpatialGrid(spatialGrid: SpatialGrid): void {
    this.spatialGrid = spatialGrid;
  }

  setResizeCallback(callback: () => void): void {
    this.onResizeCallback = callback;
  }

  private setupEventListeners(): void {
    // Canvas resize handling
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // Future input event listeners can be added here
    // this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    // this.canvas.addEventListener('click', this.handleClick.bind(this));
  }

  private handleResize(): void {
    const oldWidth = this.canvas.width;
    const oldHeight = this.canvas.height;
    
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    
    // Update spatial grid if available
    if (this.spatialGrid) {
      this.spatialGrid.resize(this.canvas.width, this.canvas.height);
    }
    
    // Notify callback
    this.onResizeCallback();
    
    console.log(`🖼️ Canvas resized from ${oldWidth}x${oldHeight} to ${this.canvas.width}x${this.canvas.height}`);
  }

  // Future methods for input handling
  private handleMouseMove(event: MouseEvent): void {
    // Mouse move handling implementation
  }

  private handleClick(event: MouseEvent): void {
    // Click handling implementation
  }

  getCanvasSize(): { width: number; height: number } {
    return {
      width: this.canvas.width,
      height: this.canvas.height
    };
  }

  destroy(): void {
    window.removeEventListener('resize', this.handleResize.bind(this));
    // Remove other event listeners as they're added
  }
}