export class MemoryManager {
  private static instance: MemoryManager;
  private cleanupCallbacks: Array<() => void> = [];
  private lastCleanup: number = 0;
  private cleanupInterval: number = 30000; // 30 seconds

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  private constructor() {
    this.setupPeriodicCleanup();
    this.setupMemoryPressureHandling();
  }

  private setupPeriodicCleanup(): void {
    setInterval(() => {
      this.performCleanup();
    }, this.cleanupInterval);
  }

  private setupMemoryPressureHandling(): void {
    // Listen for memory pressure events (if supported)
    if ('memory' in performance) {
      setInterval(() => {
        const memInfo = (performance as any).memory;
        const usedRatio = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;
        
        if (usedRatio > 0.8) {
          console.warn('🚨 High memory usage detected, performing cleanup');
          this.performCleanup();
        }
      }, 5000);
    }

    // Listen for page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.performCleanup();
      }
    });
  }

  public registerCleanupCallback(callback: () => void): void {
    this.cleanupCallbacks.push(callback);
  }

  public unregisterCleanupCallback(callback: () => void): void {
    const index = this.cleanupCallbacks.indexOf(callback);
    if (index > -1) {
      this.cleanupCallbacks.splice(index, 1);
    }
  }

  public performCleanup(): void {
    const now = performance.now();
    if (now - this.lastCleanup < 1000) {
      return; // Prevent too frequent cleanups
    }

    console.log('🧹 Performing memory cleanup');
    
    // Execute all registered cleanup callbacks
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.warn('Error during cleanup:', error);
      }
    });

    // Force garbage collection if available (development only)
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
    }

    this.lastCleanup = now;
  }

  public getMemoryUsage(): { used: number; total: number; percentage: number } | null {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      return {
        used: memInfo.usedJSHeapSize / 1024 / 1024, // MB
        total: memInfo.jsHeapSizeLimit / 1024 / 1024, // MB
        percentage: (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100
      };
    }
    return null;
  }

  public isMemoryPressureHigh(): boolean {
    const usage = this.getMemoryUsage();
    return usage ? usage.percentage > 80 : false;
  }
}