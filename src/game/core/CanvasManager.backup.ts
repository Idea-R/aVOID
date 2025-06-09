/**
 * CanvasManager - Centralized canvas sizing, scaling, and coordinate management
 * Fixes zoom issues, ensures proper scaling, and handles input coordinate mapping
 */

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

export class CanvasManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: CanvasConfig;
  private state: CanvasState;
  private resizeObserver: ResizeObserver | null = null;
  private onResizeCallback: (state: CanvasState) => void = () => {};
  private lastTouchEnd = 0;

  constructor(canvas: HTMLCanvasElement, config: Partial<CanvasConfig> = {}) {
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

    // Initialize state
    this.state = {
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

    this.setupCanvas();
    this.resize();
    this.setupEventListeners();
  }

  private setupCanvas(): void {
    // Ensure canvas fills container and prevent browser interactions
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.canvas.style.touchAction = 'none';
    this.canvas.style.userSelect = 'none';
    this.canvas.style.imageRendering = 'pixelated'; // Prevent fuzzy scaling
    
    // Prevent context menu on right click
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Prevent drag and drop
    this.canvas.addEventListener('dragstart', (e) => e.preventDefault());
  }

  private setupEventListeners(): void {
    // Use ResizeObserver for better performance than window resize
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => {
        this.resize();
      });
      this.resizeObserver.observe(this.canvas.parentElement || this.canvas);
    } else {
      // Fallback to window resize
      window.addEventListener('resize', this.resize);
    }

    // Prevent zoom gestures if configured
    if (this.config.preventZoom) {
      this.preventZoomGestures();
    }

    // Handle device orientation change
    window.addEventListener('orientationchange', () => {
      // Delay resize to ensure orientation change is complete
      setTimeout(() => this.resize(), 100);
    });

    // Listen for zoom changes
    window.addEventListener('resize', this.detectBrowserZoom);
    this.detectBrowserZoom();
  }

  private preventZoomGestures(): void {
    // Prevent zoom on wheel + ctrl
    this.canvas.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }, { passive: false });

    // Prevent shift+wheel zoom
    this.canvas.addEventListener('wheel', (e) => {
      if (e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }, { passive: false });

    // Prevent pinch zoom on touch devices
    let lastTouchDistance = 0;
    
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        lastTouchDistance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        e.stopPropagation();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        
        // If distance changed significantly, it's a pinch gesture
        if (Math.abs(currentDistance - lastTouchDistance) > 10) {
          return false;
        }
      }
    }, { passive: false });

    // Prevent double-tap zoom
    this.canvas.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - this.lastTouchEnd <= 300) {
        e.preventDefault();
        e.stopPropagation();
      }
      this.lastTouchEnd = now;
    }, { passive: false });

    // Prevent keyboard zoom shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '0' || e.key === '=' || e.key === '_')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }, { passive: false });
  }

  private detectBrowserZoom = (): void => {
    // Detect browser zoom level
    const browserZoom = window.devicePixelRatio / (window.outerWidth / window.innerWidth);
    
    // Alternative method for more accuracy
    const testDiv = document.createElement('div');
    testDiv.style.width = '100px';
    testDiv.style.height = '100px';
    testDiv.style.position = 'absolute';
    testDiv.style.visibility = 'hidden';
    document.body.appendChild(testDiv);
    
    const rect = testDiv.getBoundingClientRect();
    const detectedZoom = 100 / rect.width;
    document.body.removeChild(testDiv);
    
    this.state.browserZoom = detectedZoom;
  };

  private resize = (): void => {
    const container = this.canvas.parentElement || document.body;
    const containerRect = container.getBoundingClientRect();
    
    // Get display dimensions
    let displayWidth = Math.max(containerRect.width, this.config.minWidth);
    let displayHeight = Math.max(containerRect.height, this.config.minHeight);
    
    // Apply max constraints
    displayWidth = Math.min(displayWidth, this.config.maxWidth);
    displayHeight = Math.min(displayHeight, this.config.maxHeight);

    // Handle aspect ratio if needed
    if (this.config.maintainAspectRatio) {
      const aspectRatio = 16 / 9; // Default game aspect ratio
      const currentRatio = displayWidth / displayHeight;
      
      if (currentRatio > aspectRatio) {
        displayWidth = displayHeight * aspectRatio;
      } else {
        displayHeight = displayWidth / aspectRatio;
      }
    }

    // Get pixel ratio
    const pixelRatio = this.config.handleDevicePixelRatio 
      ? Math.min(window.devicePixelRatio || 1, 2) // Cap at 2x for performance
      : 1;

    // Calculate actual canvas dimensions
    const actualWidth = Math.floor(displayWidth * pixelRatio);
    const actualHeight = Math.floor(displayHeight * pixelRatio);

    // Update canvas size only if changed (avoid unnecessary redraws)
    if (this.canvas.width !== actualWidth || this.canvas.height !== actualHeight) {
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

      console.log(`🖼️ Canvas resized: ${displayWidth}x${displayHeight} display, ${actualWidth}x${actualHeight} actual, ${pixelRatio}x ratio, ${this.state.browserZoom}x zoom`);
      
      // Notify callback
      this.onResizeCallback(this.state);
    }
  };

  /**
   * Convert screen coordinates to canvas coordinates
   * Handles browser zoom, scaling, and device pixel ratio properly
   * Uses getBoundingClientRect for accurate coordinate mapping
   */
  screenToCanvas(screenX: number, screenY: number): { x: number; y: number } {
    // Get the current canvas position and size accounting for zoom
    const rect = this.canvas.getBoundingClientRect();
    
    // Calculate relative position within the canvas element
    const relativeX = screenX - rect.left;
    const relativeY = screenY - rect.top;
    
    // Apply browser zoom correction
    const zoomCorrectedX = relativeX * this.state.browserZoom;
    const zoomCorrectedY = relativeY * this.state.browserZoom;
    
    // Convert to canvas coordinates accounting for device pixel ratio
    const canvasX = (zoomCorrectedX / rect.width) * this.canvas.width;
    const canvasY = (zoomCorrectedY / rect.height) * this.canvas.height;
    
    // Ensure coordinates are within bounds
    const boundedX = Math.max(0, Math.min(canvasX, this.canvas.width));
    const boundedY = Math.max(0, Math.min(canvasY, this.canvas.height));
    
    // Convert to game coordinates (accounting for device pixel ratio scaling)
    const gameX = boundedX / this.state.pixelRatio;
    const gameY = boundedY / this.state.pixelRatio;
    
    return { x: gameX, y: gameY };
  }

  /**
   * Alternative coordinate mapping method using DOMMatrix for complex transforms
   */
  screenToCanvasAdvanced(screenX: number, screenY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    
    // Create a point in screen space
    const screenPoint = new DOMPoint(screenX - rect.left, screenY - rect.top);
    
    // Get the current transformation matrix from the canvas context
    const transform = this.ctx.getTransform();
    
    // Invert the transform to map screen to canvas coordinates
    const invertedTransform = transform.invertSelf();
    
    // Transform the point
    const canvasPoint = invertedTransform.transformPoint(screenPoint);
    
    // Apply bounds checking
    const boundedX = Math.max(0, Math.min(canvasPoint.x, this.state.displayWidth));
    const boundedY = Math.max(0, Math.min(canvasPoint.y, this.state.displayHeight));
    
    return { x: boundedX, y: boundedY };
  }

  /**
   * Convert canvas coordinates to screen coordinates
   */
  canvasToScreen(canvasX: number, canvasY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    
    // Convert from game coordinates to canvas coordinates
    const actualCanvasX = canvasX * this.state.pixelRatio;
    const actualCanvasY = canvasY * this.state.pixelRatio;
    
    // Convert to screen coordinates
    const screenX = (actualCanvasX / this.canvas.width) * rect.width + rect.left;
    const screenY = (actualCanvasY / this.canvas.height) * rect.height + rect.top;
    
    // Apply zoom correction
    const zoomCorrectedX = screenX / this.state.browserZoom;
    const zoomCorrectedY = screenY / this.state.browserZoom;
    
    return { x: zoomCorrectedX, y: zoomCorrectedY };
  }

  /**
   * Get current canvas state
   */
  getState(): CanvasState {
    return { ...this.state };
  }

  /**
   * Get game-safe canvas dimensions (what the game should use)
   */
  getGameDimensions(): { width: number; height: number } {
    return {
      width: this.state.displayWidth,
      height: this.state.displayHeight
    };
  }

  /**
   * Set resize callback
   */
  onResize(callback: (state: CanvasState) => void): void {
    this.onResizeCallback = callback;
  }

  /**
   * Force a resize check
   */
  forceResize(): void {
    this.detectBrowserZoom();
    this.resize();
  }

  /**
   * Check if coordinates are within canvas bounds
   */
  isInBounds(x: number, y: number): boolean {
    return x >= 0 && x <= this.state.displayWidth && 
           y >= 0 && y <= this.state.displayHeight;
  }

  /**
   * Get the browser zoom level
   */
  getBrowserZoom(): number {
    return this.state.browserZoom;
  }

  /**
   * Force update browser zoom detection
   */
  updateBrowserZoom(): void {
    this.detectBrowserZoom();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    } else {
      window.removeEventListener('resize', this.resize);
    }
    window.removeEventListener('orientationchange', this.resize);
    window.removeEventListener('resize', this.detectBrowserZoom);
  }
} 