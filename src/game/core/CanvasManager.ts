/**
 * CanvasManager - Orchestrates canvas management through specialized modules
 * Provides a unified API while delegating to focused sub-managers
 */

import { CanvasCore, CanvasCoreConfig } from './canvas/CanvasCore';
import { ZoomPrevention, ZoomPreventionConfig } from './canvas/ZoomPrevention';
import { CoordinateMapper, CoordinateMapperConfig } from './canvas/CoordinateMapper';
import { ResizeManager, ResizeManagerConfig } from './canvas/ResizeManager';

export interface CanvasConfig {
  preventZoom: boolean;
  handleDevicePixelRatio: boolean;
  maintainAspectRatio: boolean;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
}

export interface CanvasState {
  displayWidth: number;
  displayHeight: number;
  actualWidth: number;
  actualHeight: number;
  pixelRatio: number;
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
  browserZoom: number;
}

export interface CanvasManagerConfig {
  core?: Partial<CanvasCoreConfig>;
  zoomPrevention?: Partial<ZoomPreventionConfig>;
  coordinateMapper?: Partial<CoordinateMapperConfig>;
  resizeManager?: Partial<ResizeManagerConfig>;
}

export class CanvasManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: CanvasConfig;

  // Specialized managers
  private canvasCore: CanvasCore;
  private zoomPrevention: ZoomPrevention;
  private coordinateMapper: CoordinateMapper;
  private resizeManager: ResizeManager;

  constructor(
    canvas: HTMLCanvasElement, 
    config: Partial<CanvasConfig> = {},
    moduleConfig: CanvasManagerConfig = {}
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D canvas context');
    this.ctx = context;

    // Default configuration
    this.config = {
      preventZoom: true,
      handleDevicePixelRatio: true,
      maintainAspectRatio: false,
      minWidth: 320,
      minHeight: 240,
      maxWidth: 3840,
      maxHeight: 2160,
      ...config
    };

    // Initialize specialized managers
    this.canvasCore = new CanvasCore(this.canvas, this.config, moduleConfig.core);
    
    this.zoomPrevention = new ZoomPrevention(this.canvas, {
      enabled: this.config.preventZoom,
      ...moduleConfig.zoomPrevention
    });
    
    this.coordinateMapper = new CoordinateMapper(
      this.canvas, 
      this.ctx, 
      moduleConfig.coordinateMapper
    );

    // Initial state for ResizeManager
    const initialState: CanvasState = {
      displayWidth: 0,
      displayHeight: 0,
      actualWidth: 0,
      actualHeight: 0,
      pixelRatio: 1,
      scaleX: 1,
      scaleY: 1,
      offsetX: 0,
      offsetY: 0,
      browserZoom: 1
    };

    this.resizeManager = new ResizeManager(
      this.canvas,
      this.ctx,
      this.config,
      initialState,
      moduleConfig.resizeManager
    );

    // Connect zoom detection to state updates
    this.setupZoomStateUpdates();
    
    // Force initial resize
    this.resizeManager.forceResize();
  }

  private setupZoomStateUpdates(): void {
    // Update browser zoom in state when it changes
    this.resizeManager.onResize((state) => {
      const browserZoom = this.zoomPrevention.getBrowserZoom();
      if (state.browserZoom !== browserZoom) {
        this.resizeManager.updateState({ browserZoom });
      }
    });
  }

  /**
   * Convert screen coordinates to canvas coordinates
   */
  screenToCanvas(screenX: number, screenY: number): { x: number; y: number } {
    return this.coordinateMapper.screenToCanvas(screenX, screenY, this.resizeManager.getState());
  }

  /**
   * Alternative coordinate mapping using DOMMatrix
   */
  screenToCanvasAdvanced(screenX: number, screenY: number): { x: number; y: number } {
    return this.coordinateMapper.screenToCanvasAdvanced(screenX, screenY, this.resizeManager.getState());
  }

  /**
   * Convert canvas coordinates to screen coordinates
   */
  canvasToScreen(canvasX: number, canvasY: number): { x: number; y: number } {
    return this.coordinateMapper.canvasToScreen(canvasX, canvasY, this.resizeManager.getState());
  }

  /**
   * Check if coordinates are within canvas bounds
   */
  isInBounds(x: number, y: number): boolean {
    return this.coordinateMapper.isInBounds(x, y, this.resizeManager.getState());
  }

  /**
   * Get current canvas state
   */
  getState(): CanvasState {
    return this.resizeManager.getState();
  }

  /**
   * Get game-safe canvas dimensions
   */
  getGameDimensions(): { width: number; height: number } {
    return this.resizeManager.getGameDimensions();
  }

  /**
   * Get current browser zoom level
   */
  getBrowserZoom(): number {
    return this.zoomPrevention.getBrowserZoom();
  }

  /**
   * Force update browser zoom detection
   */
  updateBrowserZoom(): void {
    this.zoomPrevention.updateBrowserZoom();
    const browserZoom = this.zoomPrevention.getBrowserZoom();
    this.resizeManager.updateState({ browserZoom });
  }

  /**
   * Set resize callback
   */
  onResize(callback: (state: CanvasState) => void): void {
    this.resizeManager.onResize(callback);
  }

  /**
   * Force a resize check
   */
  forceResize(): void {
    this.zoomPrevention.updateBrowserZoom();
    this.resizeManager.forceResize();
  }

  /**
   * Update canvas configuration
   */
  updateConfig(config: Partial<CanvasConfig>): void {
    this.config = { ...this.config, ...config };
    this.canvasCore.updateCanvasConfig(this.config);
    this.resizeManager.updateCanvasConfig(this.config);
    this.zoomPrevention.setEnabled(this.config.preventZoom);
  }

  /**
   * Update module configurations
   */
  updateModuleConfig(moduleConfig: CanvasManagerConfig): void {
    if (moduleConfig.core) {
      this.canvasCore.updateCoreConfig(moduleConfig.core);
    }
    if (moduleConfig.zoomPrevention) {
      this.zoomPrevention.setEnabled(moduleConfig.zoomPrevention.enabled ?? true);
    }
    if (moduleConfig.coordinateMapper) {
      this.coordinateMapper.updateConfig(moduleConfig.coordinateMapper);
    }
    if (moduleConfig.resizeManager) {
      this.resizeManager.updateConfig(moduleConfig.resizeManager);
    }
  }

  /**
   * Get access to specialized managers (for advanced use cases)
   */
  getManagers() {
    return {
      core: this.canvasCore,
      zoomPrevention: this.zoomPrevention,
      coordinateMapper: this.coordinateMapper,
      resizeManager: this.resizeManager
    };
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    this.canvasCore.cleanup();
    this.zoomPrevention.cleanup();
    this.resizeManager.cleanup();
  }
} 