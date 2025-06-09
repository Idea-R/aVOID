import { CanvasManager } from './core/CanvasManager';

export interface KnockbackHandler {
  (): void;
}

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private onKnockback: KnockbackHandler;
  private canvasManager?: CanvasManager;
  
  // Mouse and touch position tracking
  private mouseX: number = 0;
  private mouseY: number = 0;
  
  // Touch tracking
  private activeTouchId: number | null = null;
  private isTouchDevice: boolean = false;
  
  // Double-click/tap detection
  private lastClickTime: number = 0;
  private clickCount: number = 0;

  constructor(canvas: HTMLCanvasElement, onKnockback: KnockbackHandler) {
    this.canvas = canvas;
    this.onKnockback = onKnockback;
    
    this.setupEventListeners();
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
      
      if (this.canvasManager) {
        // Use CanvasManager for proper coordinate mapping
        const coords = this.canvasManager.screenToCanvas(touch.clientX, touch.clientY);
        this.mouseX = coords.x;
        this.mouseY = coords.y;
      } else {
        // Fallback to old method
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = touch.clientX - rect.left;
        this.mouseY = touch.clientY - rect.top;
      }
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
          if (this.canvasManager) {
            // Use CanvasManager for proper coordinate mapping
            const coords = this.canvasManager.screenToCanvas(touch.clientX, touch.clientY);
            this.mouseX = coords.x;
            this.mouseY = coords.y;
          } else {
            // Fallback to old method
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = touch.clientX - rect.left;
            this.mouseY = touch.clientY - rect.top;
          }
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
    
    // If active touch ended, clear it and potentially switch to another touch
    if (activeTouchEnded) {
      this.activeTouchId = null;
      
      // If there are still touches, use the first one as the new active touch
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        this.activeTouchId = touch.identifier;
        
        if (this.canvasManager) {
          // Use CanvasManager for proper coordinate mapping
          const coords = this.canvasManager.screenToCanvas(touch.clientX, touch.clientY);
          this.mouseX = coords.x;
          this.mouseY = coords.y;
        } else {
          // Fallback to old method
          const rect = this.canvas.getBoundingClientRect();
          this.mouseX = touch.clientX - rect.left;
          this.mouseY = touch.clientY - rect.top;
        }
      }
    }
    
    // Handle double-tap for knockback power (mobile equivalent of double-click)
    const now = Date.now();
    if (now - this.lastClickTime < 300) {
      this.clickCount++;
      if (this.clickCount >= 2) {
        this.onKnockback();
        this.clickCount = 0;
      }
    } else {
      this.clickCount = 1;
    }
    this.lastClickTime = now;
  };

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