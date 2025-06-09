/**
 * ZoomPrevention - Handles all browser zoom prevention mechanisms
 * Prevents zoom via gestures, keyboard shortcuts, and browser controls
 */

export interface ZoomPreventionConfig {
  enabled: boolean;
  preventKeyboardZoom: boolean;
  preventWheelZoom: boolean;
  preventTouchZoom: boolean;
  preventDoubleTapZoom: boolean;
}

export class ZoomPrevention {
  private canvas: HTMLCanvasElement;
  private config: ZoomPreventionConfig;
  private lastTouchEnd = 0;
  private lastTouchDistance = 0;
  private browserZoom = 1;

  constructor(canvas: HTMLCanvasElement, config: Partial<ZoomPreventionConfig> = {}) {
    this.canvas = canvas;
    this.config = {
      enabled: true,
      preventKeyboardZoom: true,
      preventWheelZoom: true,
      preventTouchZoom: true,
      preventDoubleTapZoom: true,
      ...config
    };

    if (this.config.enabled) {
      this.setupZoomPrevention();
      this.detectBrowserZoom();
    }
  }

  private setupZoomPrevention(): void {
    if (this.config.preventWheelZoom) {
      this.preventWheelZoom();
    }
    
    if (this.config.preventTouchZoom) {
      this.preventTouchZoom();
    }
    
    if (this.config.preventDoubleTapZoom) {
      this.preventDoubleTapZoom();
    }
    
    if (this.config.preventKeyboardZoom) {
      this.preventKeyboardZoom();
    }

    // Listen for zoom changes
    window.addEventListener('resize', this.detectBrowserZoom);
  }

  private preventWheelZoom(): void {
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
  }

  private preventTouchZoom(): void {
    // Prevent pinch zoom on touch devices
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        this.lastTouchDistance = Math.sqrt(
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
        if (Math.abs(currentDistance - this.lastTouchDistance) > 10) {
          return false;
        }
      }
    }, { passive: false });
  }

  private preventDoubleTapZoom(): void {
    // Prevent double-tap zoom
    this.canvas.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - this.lastTouchEnd <= 300) {
        e.preventDefault();
        e.stopPropagation();
      }
      this.lastTouchEnd = now;
    }, { passive: false });
  }

  private preventKeyboardZoom(): void {
    // Prevent keyboard zoom shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && 
          (e.key === '+' || e.key === '-' || e.key === '0' || 
           e.key === '=' || e.key === '_')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }, { passive: false });
  }

  private detectBrowserZoom = (): void => {
    // Detect browser zoom level using multiple methods for accuracy
    const devicePixelMethod = window.devicePixelRatio / (window.outerWidth / window.innerWidth);
    
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
    
    // Use the more reliable detection method
    this.browserZoom = detectedZoom;
  };

  /**
   * Get current browser zoom level
   */
  getBrowserZoom(): number {
    return this.browserZoom;
  }

  /**
   * Force update browser zoom detection
   */
  updateBrowserZoom(): void {
    this.detectBrowserZoom();
  }

  /**
   * Enable/disable zoom prevention
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (enabled) {
      this.setupZoomPrevention();
    } else {
      this.cleanup();
    }
  }

  /**
   * Cleanup event listeners
   */
  cleanup(): void {
    window.removeEventListener('resize', this.detectBrowserZoom);
    // Note: Canvas event listeners are automatically cleaned up when canvas is removed
  }
} 