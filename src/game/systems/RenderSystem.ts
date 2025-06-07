import { RenderCore, RenderState, GameSettings } from './RenderCore';
import { RenderDrawing } from './RenderDrawing';
import { RenderUtils } from './RenderUtils';

export type { GameSettings, RenderState } from './RenderCore';

export class RenderSystem {
  private renderCore: RenderCore;
  private renderDrawing: RenderDrawing;
  private renderUtils: RenderUtils;
  
  constructor(canvas: HTMLCanvasElement) {
    // Initialize the three render modules
    this.renderCore = new RenderCore(canvas);
    this.renderDrawing = new RenderDrawing(
      this.renderCore.getContext(),
      this.renderCore.getCanvas()
    );
    this.renderUtils = new RenderUtils(this.renderCore.getContext());
    
    // Set up callbacks between modules
    this.renderCore.onDrawObject = (obj, gameSettings) => {
      this.renderDrawing.renderObject(obj, gameSettings);
    };
    
    this.renderDrawing.onCreateGradient = (x, y, radius, color, isSuper) => {
      return this.renderUtils.createMeteorGradient(x, y, radius, color, isSuper);
    };
    
    this.renderDrawing.onConvertColor = (hex, alpha) => {
      return this.renderUtils.hexToRgba(hex, alpha);
    };
  }

  /**
   * Main render method
   */
  public render(state: RenderState): void {
    this.renderCore.render(state);
    
    // Periodic cache maintenance
    this.renderUtils.maintainGradientCache();
  }

  /**
   * Create meteor gradient (legacy compatibility)
   */
  public createMeteorGradient(x: number, y: number, radius: number, color: string, isSuper: boolean = false): CanvasGradient {
    return this.renderUtils.createMeteorGradient(x, y, radius, color, isSuper);
  }

  /**
   * Set shadow rendering enabled/disabled
   */
  public setShadowsEnabled(enabled: boolean): void {
    this.renderCore.setShadowsEnabled(enabled);
    this.renderDrawing.setShadowsEnabled(enabled);
  }

  /**
   * Clear gradient cache
   */
  public clearGradientCache(): void {
    this.renderUtils.clearGradientCache();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { hits: number; misses: number; size: number; hitRatio: number } {
    return this.renderUtils.getCacheStats();
  }

  /**
   * Get render performance statistics
   */
  public getPerformanceStats(): {
    core: {
      shadowGroupCount: number;
      totalObjects: number;
      shadowsEnabled: boolean;
    };
    drawing: {
      shadowsEnabled: boolean;
      canvasWidth: number;
      canvasHeight: number;
    };
    utils: {
      cacheStats: { hits: number; misses: number; size: number; hitRatio: number };
      cacheEnabled: boolean;
      maxCacheSize: number;
      cleanupInterval: number;
    };
  } {
    return {
      core: this.renderCore.getRenderStats(),
      drawing: this.renderDrawing.getDrawingStats(),
      utils: this.renderUtils.getPerformanceMetrics()
    };
  }

  /**
   * Configure cache settings
   */
  public configureCacheSettings(settings: {
    maxCacheSize?: number;
    cleanupInterval?: number;
    enabled?: boolean;
  }): void {
    this.renderUtils.configureCacheSettings(settings);
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.renderCore.destroy();
    this.renderUtils.destroy();
  }
}