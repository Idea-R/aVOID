// Extracted from Engine.ts on January 7, 2025
// Original Engine.ts: 887 lines -> Refactored into modular architecture

/**
 * GameLoop manages the core game animation loop, timing, and pause/resume functionality.
 * Extracted from Engine.ts to maintain separation of concerns and stay under 500-line limit.
 */
export class GameLoop {
  private animationFrame: number | null = null;
  private lastTime: number = 0;
  private started: boolean = false;
  private isPaused: boolean = false;
  private pausedTime: number = 0;
  private lastPauseTime: number = 0;
  
  // Callbacks for the main game loop
  private updateCallback: (deltaTime: number) => void = () => {};
  private renderCallback: () => void = () => {};
  private fpsUpdateCallback: (timestamp: number) => void = () => {};
  
  constructor() {
    console.log('[GAMELOOP] GameLoop initialized');
    
    // Setup window event listeners for auto-pause/resume
    this.setupEventListeners();
  }
  
  /**
   * Set the callback functions for the game loop
   */
  setCallbacks(
    updateCallback: (deltaTime: number) => void,
    renderCallback: () => void,
    fpsUpdateCallback: (timestamp: number) => void
  ) {
    this.updateCallback = updateCallback;
    this.renderCallback = renderCallback;
    this.fpsUpdateCallback = fpsUpdateCallback;
  }
  
  /**
   * Setup window event listeners for automatic pause/resume
   */
  private setupEventListeners(): void {
    window.addEventListener('blur', this.handleWindowBlur);
    window.addEventListener('focus', this.handleWindowFocus);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }
  
  /**
   * Clean up event listeners
   */
  cleanup(): void {
    window.removeEventListener('blur', this.handleWindowBlur);
    window.removeEventListener('focus', this.handleWindowFocus);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
  
  /**
   * Auto-pause when window loses focus
   */
  private handleWindowBlur = () => {
    if (!this.isPaused && this.started) {
      this.pause();
      console.log('🎮 Game paused - window lost focus');
    }
  };
  
  /**
   * Auto-resume when window gains focus
   */
  private handleWindowFocus = () => {
    if (this.isPaused && this.started) {
      this.resume();
      console.log('🎮 Game resumed - window gained focus');
    }
  };
  
  /**
   * Handle browser tab visibility changes
   */
  private handleVisibilityChange = () => {
    if (document.hidden) {
      if (!this.isPaused && this.started) {
        this.pause();
        console.log('🎮 Game paused - tab hidden');
      }
    } else {
      if (this.isPaused && this.started) {
        this.resume();
        console.log('🎮 Game resumed - tab visible');
      }
    }
  };
  
  /**
   * Main game loop function
   */
  private gameLoop = (timestamp: number) => {
    if (this.isPaused) return;
    
    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;

    // Call the callbacks in order
    this.fpsUpdateCallback(timestamp);
    this.updateCallback(deltaTime);
    this.renderCallback();

    // Schedule next frame
    this.animationFrame = requestAnimationFrame(this.gameLoop);
  };
  
  /**
   * Start the game loop
   */
  start(): void {
    console.log('[GAMELOOP] Starting game loop');
    if (this.animationFrame === null) {
      this.lastTime = performance.now();
      this.started = true;
      this.isPaused = false;
      this.animationFrame = requestAnimationFrame(this.gameLoop);
      console.log('[GAMELOOP] Game loop started successfully');
    }
  }
  
  /**
   * Stop the game loop
   */
  stop(): void {
    console.log('[GAMELOOP] Stopping game loop');
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
      this.started = false;
      this.isPaused = false;
    }
  }
  
  /**
   * Pause the game loop
   */
  pause(): void {
    if (!this.started || this.isPaused) return;
    
    this.isPaused = true;
    this.lastPauseTime = performance.now();
    
    // Stop the animation frame loop
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    console.log('⏸️ Game loop paused');
  }
  
  /**
   * Resume the game loop
   */
  resume(): void {
    if (!this.started || !this.isPaused) return;
    
    this.isPaused = false;
    
    // Calculate how long we were paused and adjust timers
    const pauseDuration = performance.now() - this.lastPauseTime;
    this.pausedTime += pauseDuration;
    
    // Reset last time to prevent large delta
    this.lastTime = performance.now();
    
    // Resume the game loop
    this.animationFrame = requestAnimationFrame(this.gameLoop);
    console.log('▶️ Game loop resumed');
  }
  
  /**
   * Pre-warm the game loop (initialize timing without starting)
   */
  preWarm(): void {
    console.log('🔥 Pre-warming game loop timing');
    this.lastTime = performance.now();
  }
  
  /**
   * Reset game loop state
   */
  reset(): void {
    this.isPaused = false;
    this.pausedTime = 0;
    this.lastPauseTime = 0;
    console.log('[GAMELOOP] Game loop state reset');
  }
  
  // Getters
  isStarted(): boolean {
    return this.started;
  }
  
  isPausedState(): boolean {
    return this.isPaused;
  }
  
  getTotalPausedTime(): number {
    return this.pausedTime;
  }
  
  getLastTime(): number {
    return this.lastTime;
  }
}