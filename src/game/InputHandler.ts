import { CanvasManager } from './core/CanvasManager';

export interface KnockbackHandler {
  (): void;
}

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private onKnockback: KnockbackHandler;
  private canvasManager: CanvasManager | null = null;
  
  // Mouse and touch position tracking
  private mouseX: number = 0;
  private mouseY: number = 0;
  
  // Touch tracking
  private activeTouchId: number | null = null;
  private isTouchDevice: boolean = false;
  
  // Double-click/tap detection
  private lastClickTime: number = 0;
  private clickCount: number = 0;

  // Enhanced touch interaction properties
  private touchStartTime: number = 0;
  private touchStartPos: { x: number; y: number } = { x: 0, y: 0 };
  private doubleTapTimeout: NodeJS.Timeout | null = null;
  private hapticSupported: boolean = false;
  private lastMoveUpdate: number = 0;
  
  // Touch gesture thresholds
  private readonly DOUBLE_TAP_MAX_TIME = 300;
  private readonly DOUBLE_TAP_MAX_DISTANCE = 50;
  private readonly TOUCH_RESPONSE_DELAY = 16; // ~60fps response

  constructor(canvas: HTMLCanvasElement, onKnockback: KnockbackHandler) {
    this.canvas = canvas;
    this.onKnockback = onKnockback;
    
    this.setupEventListeners();
    this.initializeTouchOptimizations();
  }

  setCanvasManager(canvasManager: CanvasManager): void {
    this.canvasManager = canvasManager;
  }

  private setupEventListeners(): void {
    // Mouse events
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('dblclick', this.handleDoubleClick);
    
    // Touch events for mobile
    window.addEventListener('touchstart', this.handleTouchStart);
    window.addEventListener('touchmove', this.handleTouchMove);
    window.addEventListener('touchend', this.handleTouchEnd);
  }

  private initializeTouchOptimizations(): void {
    // Check for haptic feedback support
    this.hapticSupported = 'vibrate' in navigator;
    
    // Set up optimal touch event handling
    const touchOptions = { passive: false, capture: true };
    this.canvas.addEventListener('touchstart', this.handleTouchStart, touchOptions);
    this.canvas.addEventListener('touchmove', this.handleTouchMove, touchOptions);
    this.canvas.addEventListener('touchend', this.handleTouchEnd, touchOptions);
    
    console.log('🎮 Touch optimizations initialized:', {
      hapticSupported: this.hapticSupported,
      touchEventsActive: true
    });
  }

  private triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light'): void {
    if (!this.hapticSupported) return;
    
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [50]
    };
    
    try {
      navigator.vibrate(patterns[type]);
    } catch (error) {
      // Silently fail if haptic feedback isn't available
    }
  }

  private handleMouseMove = (e: MouseEvent) => {
    if (this.isTouchDevice) return;
    
    if (this.canvasManager) {
      // Use CanvasManager for proper coordinate mapping
      const coords = this.canvasManager.screenToCanvas(e.clientX, e.clientY);
      this.mouseX = coords.x;
      this.mouseY = coords.y;
    } else {
      // Fallback to old method
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    }
  };

  private handleTouchStart = (e: TouchEvent) => {
    e.preventDefault(); // Prevent scrolling and other default behaviors
    this.isTouchDevice = true;
    
    // Use the first touch if no active touch
    if (this.activeTouchId === null && e.touches.length > 0) {
      const touch = e.touches[0];
      this.activeTouchId = touch.identifier;
      this.touchStartTime = Date.now();
      
      // Use our enhanced coordinate mapping
      this.updateTouchPosition(touch.clientX, touch.clientY);
      this.touchStartPos = { x: this.mouseX, y: this.mouseY };
      
      // Light haptic feedback on touch start
      this.triggerHapticFeedback('light');
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    e.preventDefault(); // Prevent scrolling
    this.isTouchDevice = true;
    
    // Find the active touch among current touches
    if (this.activeTouchId !== null) {
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        if (touch.identifier === this.activeTouchId) {
          // Throttle touch move updates for better performance
          const now = Date.now();
          if (now - this.lastMoveUpdate < this.TOUCH_RESPONSE_DELAY) {
            return;
          }
          this.lastMoveUpdate = now;
          
          // Use our enhanced coordinate mapping
          this.updateTouchPosition(touch.clientX, touch.clientY);
          break;
        }
      }
    }
  };

  private handleDoubleClick = (e: MouseEvent) => {
    if (this.isTouchDevice) return;
    this.onKnockback();
  };

  private handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    this.isTouchDevice = true;
    
    // Check if our active touch ended
    let activeTouchEnded = false;
    if (this.activeTouchId !== null) {
      activeTouchEnded = true;
      // Check if the active touch is still in the remaining touches
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === this.activeTouchId) {
          activeTouchEnded = false;
          break;
        }
      }
    }
    
    // Handle enhanced double-tap gesture for knockback
    if (activeTouchEnded) {
      const now = Date.now();
      const touchDuration = now - this.touchStartTime;
      
      // Calculate touch distance for gesture validation
      const currentPos = this.getLastTouchPosition(e);
      const touchDistance = this.calculateDistance(this.touchStartPos, currentPos);
      
      // Enhanced double-tap detection with distance validation
      if (touchDuration < 200 && touchDistance < this.DOUBLE_TAP_MAX_DISTANCE) {
        if (this.doubleTapTimeout) {
          // Second tap detected within time window
          clearTimeout(this.doubleTapTimeout);
          this.doubleTapTimeout = null;
          
          // Trigger knockback with haptic feedback
          this.triggerHapticFeedback('heavy');
          this.onKnockback();
          console.log('🎮 Double-tap knockback activated');
        } else {
          // First tap - start timeout
          this.doubleTapTimeout = setTimeout(() => {
            this.doubleTapTimeout = null;
          }, this.DOUBLE_TAP_MAX_TIME);
        }
      }
      
      // Clear active touch and switch to next available touch
      this.activeTouchId = null;
      
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        this.activeTouchId = touch.identifier;
        
        if (this.canvasManager) {
          const coords = this.canvasManager.screenToCanvas(touch.clientX, touch.clientY);
          this.mouseX = coords.x;
          this.mouseY = coords.y;
        } else {
          const rect = this.canvas.getBoundingClientRect();
          this.mouseX = touch.clientX - rect.left;
          this.mouseY = touch.clientY - rect.top;
        }
      }
    }
  };

  private getLastTouchPosition(e: TouchEvent): { x: number; y: number } {
    if (e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      if (this.canvasManager) {
        return this.canvasManager.screenToCanvas(touch.clientX, touch.clientY);
      } else {
        const rect = this.canvas.getBoundingClientRect();
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
      }
    }
    return { x: this.mouseX, y: this.mouseY };
  }

  private calculateDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getAccurateCanvasCoordinates(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    
    // Account for CSS transforms and scaling
    const canvasStyle = window.getComputedStyle(this.canvas);
    const transform = canvasStyle.transform;
    
    // Get the actual canvas dimensions
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    const displayWidth = rect.width;
    const displayHeight = rect.height;
    
    // Calculate scale factors
    const scaleX = canvasWidth / displayWidth;
    const scaleY = canvasHeight / displayHeight;
    
    // Get position relative to canvas
    let relativeX = clientX - rect.left;
    let relativeY = clientY - rect.top;
    
    // Account for any CSS transforms (particularly important for mobile)
    if (transform && transform !== 'none') {
      // Handle common transform scenarios
      const matrix = new DOMMatrix(transform);
      const point = new DOMPoint(relativeX, relativeY);
      const transformed = point.matrixTransform(matrix.inverse());
      relativeX = transformed.x;
      relativeY = transformed.y;
    }
    
    // Apply scaling to get canvas coordinates
    const canvasX = relativeX * scaleX;
    const canvasY = relativeY * scaleY;
    
    // Ensure coordinates are within canvas bounds
    const clampedX = Math.max(0, Math.min(canvasX, canvasWidth));
    const clampedY = Math.max(0, Math.min(canvasY, canvasHeight));
    
    return { x: clampedX, y: clampedY };
  }

  private updateTouchPosition(clientX: number, clientY: number): void {
    if (this.canvasManager) {
      // Use CanvasManager for proper coordinate mapping
      const coords = this.canvasManager.screenToCanvas(clientX, clientY);
      this.mouseX = coords.x;
      this.mouseY = coords.y;
    } else {
      // Use our enhanced coordinate mapping as fallback
      const coords = this.getAccurateCanvasCoordinates(clientX, clientY);
      this.mouseX = coords.x;
      this.mouseY = coords.y;
    }
    
    // Add visual feedback for touch (debugging)
    if (this.isTouchDevice) {
      console.log(`👆 Touch position updated: (${this.mouseX.toFixed(1)}, ${this.mouseY.toFixed(1)})`);
    }
  }

  // Public interface methods
  getMousePosition(): { x: number; y: number } {
    return { x: this.mouseX, y: this.mouseY };
  }

  getIsTouchDevice(): boolean {
    return this.isTouchDevice;
  }

  // Reset method to fix cursor position bug after game reset
  reset(): void {
    this.mouseX = 0;
    this.mouseY = 0;
    this.activeTouchId = null;
    this.clickCount = 0;
    this.lastClickTime = 0;
    console.log('🎮 InputHandler reset - cursor position cleared');
  }

  // Cleanup method to remove event listeners
  cleanup(): void {
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('dblclick', this.handleDoubleClick);
    window.removeEventListener('touchstart', this.handleTouchStart);
    window.removeEventListener('touchmove', this.handleTouchMove);
    window.removeEventListener('touchend', this.handleTouchEnd);
  }
}