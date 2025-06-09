/**
 * CanvasCore - Handles basic canvas setup and configuration
 * Manages canvas properties, styling, and basic event prevention
 */

import { CanvasConfig } from '../CanvasManager';

export interface CanvasCoreConfig {
  enableContextMenu: boolean;
  enableDragAndDrop: boolean;
  enableTextSelection: boolean;
  pixelated: boolean;
  fullContainer: boolean;
}

export class CanvasCore {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private canvasConfig: CanvasConfig;
  private config: CanvasCoreConfig;

  constructor(
    canvas: HTMLCanvasElement, 
    canvasConfig: CanvasConfig,
    config: Partial<CanvasCoreConfig> = {}
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D canvas context');
    this.ctx = context;
    
    this.canvasConfig = canvasConfig;
    this.config = {
      enableContextMenu: false,
      enableDragAndDrop: false,
      enableTextSelection: false,
      pixelated: true,
      fullContainer: true,
      ...config
    };

    this.setupCanvas();
  }

  private setupCanvas(): void {
    this.setupCanvasStyles();
    this.setupCanvasEvents();
  }

  private setupCanvasStyles(): void {
    if (this.config.fullContainer) {
      // Ensure canvas fills container
      this.canvas.style.position = 'absolute';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.display = 'block';
    }

    // Touch and interaction prevention
    this.canvas.style.touchAction = 'none';
    
    if (!this.config.enableTextSelection) {
      this.canvas.style.userSelect = 'none';
      this.canvas.style.webkitUserSelect = 'none';
    }

    // Pixel-perfect rendering for games
    if (this.config.pixelated) {
      this.canvas.style.imageRendering = 'pixelated'; // Prevent fuzzy scaling
      this.canvas.style.imageRendering = '-moz-crisp-edges';
      this.canvas.style.imageRendering = '-webkit-crisp-edges';
      this.canvas.style.imageRendering = 'crisp-edges';
    }
  }

  private setupCanvasEvents(): void {
    if (!this.config.enableContextMenu) {
      this.canvas.addEventListener('contextmenu', this.preventContextMenu);
    }
    
    if (!this.config.enableDragAndDrop) {
      this.canvas.addEventListener('dragstart', this.preventDragStart);
      this.canvas.addEventListener('dragover', this.preventDragOver);
      this.canvas.addEventListener('drop', this.preventDrop);
    }

    // Prevent selection on double-click if text selection is disabled
    if (!this.config.enableTextSelection) {
      this.canvas.addEventListener('selectstart', this.preventSelect);
    }
  }

  private preventContextMenu = (e: Event): void => {
    e.preventDefault();
  };

  private preventDragStart = (e: Event): void => {
    e.preventDefault();
  };

  private preventDragOver = (e: Event): void => {
    e.preventDefault();
  };

  private preventDrop = (e: Event): void => {
    e.preventDefault();
  };

  private preventSelect = (e: Event): void => {
    e.preventDefault();
  };

  /**
   * Get the canvas element
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Get the 2D rendering context
   */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /**
   * Get canvas configuration
   */
  getCanvasConfig(): CanvasConfig {
    return { ...this.canvasConfig };
  }

  /**
   * Update canvas configuration
   */
  updateCanvasConfig(config: Partial<CanvasConfig>): void {
    this.canvasConfig = { ...this.canvasConfig, ...config };
  }

  /**
   * Get core configuration
   */
  getCoreConfig(): CanvasCoreConfig {
    return { ...this.config };
  }

  /**
   * Update core configuration
   */
  updateCoreConfig(config: Partial<CanvasCoreConfig>): void {
    const oldConfig = this.config;
    this.config = { ...this.config, ...config };
    
    // Reapply styles and events if certain properties changed
    if (oldConfig.pixelated !== this.config.pixelated ||
        oldConfig.fullContainer !== this.config.fullContainer ||
        oldConfig.enableTextSelection !== this.config.enableTextSelection) {
      this.setupCanvasStyles();
    }
    
    if (oldConfig.enableContextMenu !== this.config.enableContextMenu ||
        oldConfig.enableDragAndDrop !== this.config.enableDragAndDrop ||
        oldConfig.enableTextSelection !== this.config.enableTextSelection) {
      this.cleanup();
      this.setupCanvasEvents();
    }
  }

  /**
   * Apply custom styles to canvas
   */
  applyStyles(styles: Partial<CSSStyleDeclaration>): void {
    Object.assign(this.canvas.style, styles);
  }

  /**
   * Reset canvas transformation matrix
   */
  resetTransform(): void {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /**
   * Clear the entire canvas
   */
  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Set canvas opacity
   */
  setOpacity(opacity: number): void {
    this.canvas.style.opacity = opacity.toString();
  }

  /**
   * Set canvas background color
   */
  setBackgroundColor(color: string): void {
    this.canvas.style.backgroundColor = color;
  }

  /**
   * Cleanup event listeners
   */
  cleanup(): void {
    this.canvas.removeEventListener('contextmenu', this.preventContextMenu);
    this.canvas.removeEventListener('dragstart', this.preventDragStart);
    this.canvas.removeEventListener('dragover', this.preventDragOver);
    this.canvas.removeEventListener('drop', this.preventDrop);
    this.canvas.removeEventListener('selectstart', this.preventSelect);
  }
} 