/**
 * ResizeManager - Handles canvas resizing and state management
 * Manages ResizeObserver, dimension calculations, and device pixel ratio
 */

import { CanvasConfig, CanvasState } from '../CanvasManager';

export interface ResizeManagerConfig {
  useResizeObserver: boolean;
  handleOrientationChange: boolean;
  orientationChangeDelay: number;
  logResizeEvents: boolean;
}

export class ResizeManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private canvasConfig: CanvasConfig;
  private config: ResizeManagerConfig;
  private resizeObserver: ResizeObserver | null = null;
  private state: CanvasState;
  private onResizeCallback: (state: CanvasState) => void = () => {};

  constructor(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    canvasConfig: CanvasConfig,
    initialState: CanvasState,
    config: Partial<ResizeManagerConfig> = {}
  ) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.canvasConfig = canvasConfig;
    this.state = { ...initialState };
    
    this.config = {
      useResizeObserver: true,
      handleOrientationChange: true,
      orientationChangeDelay: 100,
      logResizeEvents: true,
      ...config
    };

    this.setupResizeListeners();
  }

  private setupResizeListeners(): void {
    // Use ResizeObserver for better performance than window resize
    if (this.config.useResizeObserver && 'ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => {
        this.handleResize();
      });
      this.resizeObserver.observe(this.canvas.parentElement || this.canvas);
    } else {
      // Fallback to window resize
      window.addEventListener('resize', this.handleResize);
    }

    // Handle device orientation change
    if (this.config.handleOrientationChange) {
      window.addEventListener('orientationchange', () => {
        // Delay resize to ensure orientation change is complete
        setTimeout(() => this.handleResize(), this.config.orientationChangeDelay);
      });
    }
  }

  private handleResize = (): void => {
    const container = this.canvas.parentElement || document.body;
    const containerRect = container.getBoundingClientRect();
    
    // Get display dimensions
    let displayWidth = Math.max(containerRect.width, this.canvasConfig.minWidth);
    let displayHeight = Math.max(containerRect.height, this.canvasConfig.minHeight);
    
    // Apply max constraints
    displayWidth = Math.min(displayWidth, this.canvasConfig.maxWidth);
    displayHeight = Math.min(displayHeight, this.canvasConfig.maxHeight);

    // Handle aspect ratio if needed
    if (this.canvasConfig.maintainAspectRatio) {
      const aspectRatio = 16 / 9; // Default game aspect ratio
      const currentRatio = displayWidth / displayHeight;
      
      if (currentRatio > aspectRatio) {
        displayWidth = displayHeight * aspectRatio;
      } else {
        displayHeight = displayWidth / aspectRatio;
      }
    }

    // Get pixel ratio
    const pixelRatio = this.canvasConfig.handleDevicePixelRatio 
      ? Math.min(window.devicePixelRatio || 1, 2) // Cap at 2x for performance
      : 1;

    // Calculate actual canvas dimensions
    const actualWidth = Math.floor(displayWidth * pixelRatio);
    const actualHeight = Math.floor(displayHeight * pixelRatio);

    // Update canvas size only if changed (avoid unnecessary redraws)
    if (this.canvas.width !== actualWidth || this.canvas.height !== actualHeight) {
      this.updateCanvasSize(displayWidth, displayHeight, actualWidth, actualHeight, pixelRatio, containerRect);
    }
  };

  private updateCanvasSize(
    displayWidth: number,
    displayHeight: number,
    actualWidth: number,
    actualHeight: number,
    pixelRatio: number,
    containerRect: DOMRect
  ): void {
    // Update canvas dimensions
    this.canvas.width = actualWidth;
    this.canvas.height = actualHeight;
    
    // Set CSS size
    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;
    
    // Scale context if using device pixel ratio
    if (pixelRatio !== 1) {
      this.ctx.scale(pixelRatio, pixelRatio);
    }

    // Update state
    this.state = {
      ...this.state,
      displayWidth,
      displayHeight,
      actualWidth,
      actualHeight,
      pixelRatio,
      scaleX: actualWidth / displayWidth,
      scaleY: actualHeight / displayHeight,
      offsetX: (containerRect.width - displayWidth) / 2,
      offsetY: (containerRect.height - displayHeight) / 2
    };

    if (this.config.logResizeEvents) {
      console.log(
        `🖼️ Canvas resized: ${displayWidth}x${displayHeight} display, ` +
        `${actualWidth}x${actualHeight} actual, ${pixelRatio}x ratio, ` +
        `${this.state.browserZoom}x zoom`
      );
    }
    
    // Notify callback
    this.onResizeCallback(this.state);
  }

  /**
   * Force a resize check
   */
  forceResize(): void {
    this.handleResize();
  }

  /**
   * Update canvas configuration
   */
  updateCanvasConfig(config: Partial<CanvasConfig>): void {
    this.canvasConfig = { ...this.canvasConfig, ...config };
    this.handleResize(); // Trigger resize with new config
  }

  /**
   * Update resize manager configuration
   */
  updateConfig(config: Partial<ResizeManagerConfig>): void {
    const oldConfig = this.config;
    this.config = { ...this.config, ...config };
    
    // If ResizeObserver setting changed, restart listeners
    if (oldConfig.useResizeObserver !== this.config.useResizeObserver) {
      this.cleanup();
      this.setupResizeListeners();
    }
  }

  /**
   * Set resize callback
   */
  onResize(callback: (state: CanvasState) => void): void {
    this.onResizeCallback = callback;
  }

  /**
   * Get current state
   */
  getState(): CanvasState {
    return { ...this.state };
  }

  /**
   * Update state (used by other managers)
   */
  updateState(updates: Partial<CanvasState>): void {
    this.state = { ...this.state, ...updates };
  }

  /**
   * Get game-safe canvas dimensions
   */
  getGameDimensions(): { width: number; height: number } {
    return {
      width: this.state.displayWidth,
      height: this.state.displayHeight
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    } else {
      window.removeEventListener('resize', this.handleResize);
    }
    
    if (this.config.handleOrientationChange) {
      window.removeEventListener('orientationchange', this.handleResize);
    }
  }
} 