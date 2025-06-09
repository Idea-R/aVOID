/**
 * CoordinateMapper - Handles screen-to-canvas coordinate transformations
 * Provides accurate coordinate mapping accounting for zoom, scaling, and device pixel ratio
 */

import { CanvasState } from '../CanvasManager';

export interface CoordinateMapperConfig {
  enableBounds: boolean;
  enableZoomCorrection: boolean;
  enableDevicePixelRatio: boolean;
}

export class CoordinateMapper {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: CoordinateMapperConfig;

  constructor(
    canvas: HTMLCanvasElement, 
    ctx: CanvasRenderingContext2D,
    config: Partial<CoordinateMapperConfig> = {}
  ) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.config = {
      enableBounds: true,
      enableZoomCorrection: true,
      enableDevicePixelRatio: true,
      ...config
    };
  }

  /**
   * Convert screen coordinates to canvas coordinates
   * Handles browser zoom, scaling, and device pixel ratio properly
   * Uses getBoundingClientRect for accurate coordinate mapping
   */
  screenToCanvas(
    screenX: number, 
    screenY: number, 
    state: CanvasState
  ): { x: number; y: number } {
    // Get the current canvas position and size accounting for zoom
    const rect = this.canvas.getBoundingClientRect();
    
    // Calculate relative position within the canvas element
    const relativeX = screenX - rect.left;
    const relativeY = screenY - rect.top;
    
    // Apply browser zoom correction if enabled
    let zoomCorrectedX = relativeX;
    let zoomCorrectedY = relativeY;
    
    if (this.config.enableZoomCorrection) {
      zoomCorrectedX = relativeX * state.browserZoom;
      zoomCorrectedY = relativeY * state.browserZoom;
    }
    
    // Convert to canvas coordinates accounting for device pixel ratio
    const canvasX = (zoomCorrectedX / rect.width) * this.canvas.width;
    const canvasY = (zoomCorrectedY / rect.height) * this.canvas.height;
    
    // Apply bounds checking if enabled
    let boundedX = canvasX;
    let boundedY = canvasY;
    
    if (this.config.enableBounds) {
      boundedX = Math.max(0, Math.min(canvasX, this.canvas.width));
      boundedY = Math.max(0, Math.min(canvasY, this.canvas.height));
    }
    
    // Convert to game coordinates (accounting for device pixel ratio scaling)
    let gameX = boundedX;
    let gameY = boundedY;
    
    if (this.config.enableDevicePixelRatio) {
      gameX = boundedX / state.pixelRatio;
      gameY = boundedY / state.pixelRatio;
    }
    
    return { x: gameX, y: gameY };
  }

  /**
   * Alternative coordinate mapping method using DOMMatrix for complex transforms
   * Useful when canvas has complex transformations applied
   */
  screenToCanvasAdvanced(
    screenX: number, 
    screenY: number, 
    state: CanvasState
  ): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    
    // Create a point in screen space
    const screenPoint = new DOMPoint(screenX - rect.left, screenY - rect.top);
    
    // Get the current transformation matrix from the canvas context
    const transform = this.ctx.getTransform();
    
    // Invert the transform to map screen to canvas coordinates
    const invertedTransform = transform.invertSelf();
    
    // Transform the point
    const canvasPoint = invertedTransform.transformPoint(screenPoint);
    
    // Apply bounds checking if enabled
    let boundedX = canvasPoint.x;
    let boundedY = canvasPoint.y;
    
    if (this.config.enableBounds) {
      boundedX = Math.max(0, Math.min(canvasPoint.x, state.displayWidth));
      boundedY = Math.max(0, Math.min(canvasPoint.y, state.displayHeight));
    }
    
    return { x: boundedX, y: boundedY };
  }

  /**
   * Convert canvas coordinates to screen coordinates
   */
  canvasToScreen(
    canvasX: number, 
    canvasY: number, 
    state: CanvasState
  ): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    
    // Convert from game coordinates to canvas coordinates
    let actualCanvasX = canvasX;
    let actualCanvasY = canvasY;
    
    if (this.config.enableDevicePixelRatio) {
      actualCanvasX = canvasX * state.pixelRatio;
      actualCanvasY = canvasY * state.pixelRatio;
    }
    
    // Convert to screen coordinates
    const screenX = (actualCanvasX / this.canvas.width) * rect.width + rect.left;
    const screenY = (actualCanvasY / this.canvas.height) * rect.height + rect.top;
    
    // Apply zoom correction if enabled
    let zoomCorrectedX = screenX;
    let zoomCorrectedY = screenY;
    
    if (this.config.enableZoomCorrection) {
      zoomCorrectedX = screenX / state.browserZoom;
      zoomCorrectedY = screenY / state.browserZoom;
    }
    
    return { x: zoomCorrectedX, y: zoomCorrectedY };
  }

  /**
   * Check if coordinates are within canvas bounds
   */
  isInBounds(x: number, y: number, state: CanvasState): boolean {
    return x >= 0 && x <= state.displayWidth && 
           y >= 0 && y <= state.displayHeight;
  }

  /**
   * Update coordinate mapper configuration
   */
  updateConfig(config: Partial<CoordinateMapperConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): CoordinateMapperConfig {
    return { ...this.config };
  }
} 