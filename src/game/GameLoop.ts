export interface GameSettings {
  volume: number;
  soundEnabled: boolean;
  showUI: boolean;
  showFPS: boolean;
  showPerformanceStats: boolean;
  showTrails: boolean;
  performanceMode: boolean;
  cursorColor: string;
  autoPerformanceModeEnabled?: boolean;
}

export class GameLoop {
  private animationFrame: number | null = null;
  private lastTime: number = 0;
  private gameTime: number = 0;
  private started: boolean = false;
  private gracePeriodActive: boolean = false;
  private gracePeriodDuration: number = 3000; // 3 seconds
  private gracePeriodStartTime: number = 0;
  private isPaused: boolean = false;
  private pausedTime: number = 0;
  private lastPauseTime: number = 0;
  
  // FPS tracking
  private frameCount: number = 0;
  private fpsLastTime: number = 0;
  private currentFPS: number = 0;
  private fpsUpdateInterval: number = 500;
  
  // Performance mode tracking
  private performanceModeActive: boolean = false;
  private autoPerformanceModeEnabled: boolean = false;
  private lowFPSStartTime: number = 0;
  private lowFPSThreshold: number = 45;
  private lowFPSDuration: number = 3000; // 3 seconds
  
  // Performance tracking
  private frameTimes: number[] = [];
  private averageFrameTime: number = 0;
  private memoryUsageEstimate: number = 0;
  private lastScalingEvent: string = 'none';
  private scalingEventTime: number = 0;
  
  // Callbacks
  private updateCallback: (deltaTime: number) => void;
  private renderCallback: () => void;
  private onStateUpdateCallback: (state: any) => void;
  private applyPerformanceModeCallback: (enabled: boolean) => void;
  
  constructor(
    updateCallback: (deltaTime: number) => void,
    renderCallback: () => void,
    onStateUpdateCallback: (state: any) => void,
    applyPerformanceModeCallback: (enabled: boolean) => void
  ) {
    this.updateCallback = updateCallback;
    this.renderCallback = renderCallback;
    this.onStateUpdateCallback = onStateUpdateCallback;
    this.applyPerformanceModeCallback = applyPerformanceModeCallback;
    
    // Add focus/blur event listeners for auto-pause
    window.addEventListener('blur', this.handleWindowBlur);
    window.addEventListener('focus', this.handleWindowFocus);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }
  
  private handleWindowBlur = () => {
    if (this.started && !this.isPaused) {
      this.pauseGame();
    }
  };

  private handleWindowFocus = () => {
    // Let the user manually resume if they want
  };

  private handleVisibilityChange = () => {
    if (document.hidden && this.started && !this.isPaused) {
      this.pauseGame();
    }
  };
  
  private pauseGame(): void {
    if (this.isPaused || !this.started) return;
    
    this.isPaused = true;
    this.lastPauseTime = performance.now();
    
    // Cancel animation frame
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  private resumeGame(): void {
    if (!this.isPaused || !this.started) return;
    
    this.isPaused = false;
    
    // Account for paused time
    const pauseDuration = performance.now() - this.lastPauseTime;
    this.pausedTime += pauseDuration;
    
    // Adjust grace period if active
    if (this.gracePeriodActive) {
      this.gracePeriodStartTime += pauseDuration;
    }
    
    // Restart game loop
    this.animationFrame = requestAnimationFrame(this.gameLoop);
  }
  
  private applyPerformanceMode(enabled: boolean): void {
    this.performanceModeActive = enabled;
    this.applyPerformanceModeCallback(enabled);
    
    if (enabled) {
      this.lastScalingEvent = 'Performance mode enabled';
    } else {
      this.lastScalingEvent = 'Performance mode disabled';
    }
    this.scalingEventTime = Date.now();
  }
  
  private updateFPS(timestamp: number) {
    this.frameCount++;
    
    // Calculate frame time for performance tracking
    if (this.lastTime > 0) {
      const frameTime = timestamp - this.lastTime;
      this.frameTimes.push(frameTime);
      
      // Keep only last 60 frames for rolling average
      if (this.frameTimes.length > 60) {
        this.frameTimes.shift();
      }
      
      // Calculate average frame time
      this.averageFrameTime = this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length;
    }
    
    // Update FPS every 500ms
    if (timestamp - this.fpsLastTime >= this.fpsUpdateInterval) {
      const timeDiff = timestamp - this.fpsLastTime;
      this.currentFPS = Math.round((this.frameCount * 1000) / timeDiff);
      
      this.frameCount = 0;
      this.fpsLastTime = timestamp;
      
      // Update memory usage estimate (simplified)
      this.memoryUsageEstimate = (performance as any).memory ? 
        Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) : 0;
      
      // Auto-performance mode check
      if (this.autoPerformanceModeEnabled && !this.performanceModeActive) {
        if (this.currentFPS < this.lowFPSThreshold) {
          if (this.lowFPSStartTime === 0) {
            this.lowFPSStartTime = timestamp;
          } else if (timestamp - this.lowFPSStartTime >= this.lowFPSDuration) {
            this.applyPerformanceMode(true);
            this.lowFPSStartTime = 0;
          }
        } else {
          this.lowFPSStartTime = 0;
        }
      }
    }
  }
  
  private gameLoop = (timestamp: number) => {
    if (!this.started || this.isPaused) return;
    
    this.updateFPS(timestamp);
    
    const deltaTime = Math.min(timestamp - this.lastTime, 50); // Cap at 50ms
    this.lastTime = timestamp;
    this.gameTime = timestamp - this.pausedTime;
    
    // Handle grace period
    if (this.gracePeriodActive) {
      if (this.gameTime - this.gracePeriodStartTime >= this.gracePeriodDuration) {
        this.gracePeriodActive = false;
      }
    }
    
    // Update game state
    this.updateCallback(deltaTime);
    
    // Render
    this.renderCallback();
    
    this.animationFrame = requestAnimationFrame(this.gameLoop);
  };
  
  start() {
    if (this.started) return;
    
    this.started = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.gameTime = 0;
    this.pausedTime = 0;
    this.gracePeriodActive = true;
    this.gracePeriodStartTime = 0;
    
    this.animationFrame = requestAnimationFrame(this.gameLoop);
  }
  
  stop() {
    this.started = false;
    this.isPaused = false;
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
  
  pause(): void {
    this.pauseGame();
  }

  resume(): void {
    this.resumeGame();
  }

  isPausedState(): boolean {
    return this.isPaused;
  }
  
  isStarted(): boolean {
    return this.started;
  }
  
  getGameTime(): number {
    return this.gameTime;
  }
  
  isGracePeriodActive(): boolean {
    return this.gracePeriodActive;
  }
  
  getFPS(): number {
    return this.currentFPS;
  }
  
  setPerformanceMode(enabled: boolean): void {
    this.applyPerformanceMode(enabled);
  }

  getPerformanceMode(): boolean {
    return this.performanceModeActive;
  }

  setAutoPerformanceModeEnabled(enabled: boolean): void {
    this.autoPerformanceModeEnabled = enabled;
    this.lowFPSStartTime = 0; // Reset tracking
  }

  getAutoPerformanceModeEnabled(): boolean {
    return this.autoPerformanceModeEnabled;
  }
  
  getPerformanceStats(): {
    fps: number;
    averageFrameTime: number;
    memoryUsage: number;
    lastScalingEvent: string;
    scalingEventTime: number;
  } {
    return {
      fps: this.currentFPS,
      averageFrameTime: this.averageFrameTime,
      memoryUsage: this.memoryUsageEstimate,
      lastScalingEvent: this.lastScalingEvent,
      scalingEventTime: this.scalingEventTime
    };
  }
  
  cleanup() {
    this.stop();
    window.removeEventListener('blur', this.handleWindowBlur);
    window.removeEventListener('focus', this.handleWindowFocus);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
} 