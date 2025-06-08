export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  renderTime: number;
  updateTime: number;
}

export interface PerformanceSettings {
  targetFPS: number;
  maxParticles: number;
  shadowsEnabled: boolean;
  trailsEnabled: boolean;
  autoOptimize: boolean;
}

export class PerformanceManager {
  private metrics: PerformanceMetrics = {
    fps: 60,
    frameTime: 16.67,
    memoryUsage: 0,
    renderTime: 0,
    updateTime: 0
  };

  private settings: PerformanceSettings = {
    targetFPS: 60,
    maxParticles: 300,
    shadowsEnabled: true,
    trailsEnabled: true,
    autoOptimize: true
  };

  private frameTimes: number[] = [];
  private lastOptimizationTime: number = 0;
  private optimizationCooldown: number = 5000; // 5 seconds

  constructor(initialSettings?: Partial<PerformanceSettings>) {
    if (initialSettings) {
      this.settings = { ...this.settings, ...initialSettings };
    }

    // Detect mobile devices and apply initial optimizations
    this.detectDeviceCapabilities();
  }

  private detectDeviceCapabilities(): void {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isLowEnd = navigator.hardwareConcurrency <= 2;
    const hasLimitedMemory = (navigator as any).deviceMemory && (navigator as any).deviceMemory <= 4;

    if (isMobile || isLowEnd || hasLimitedMemory) {
      this.settings.maxParticles = 150;
      this.settings.shadowsEnabled = false;
      this.settings.trailsEnabled = false;
      console.log('🔧 Applied mobile/low-end device optimizations');
    }
  }

  public updateMetrics(frameTime: number, renderTime: number, updateTime: number): void {
    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift();
    }

    this.metrics.frameTime = frameTime;
    this.metrics.renderTime = renderTime;
    this.metrics.updateTime = updateTime;
    this.metrics.fps = 1000 / frameTime;

    // Update memory usage if available
    if ((performance as any).memory) {
      this.metrics.memoryUsage = (performance as any).memory.usedJSHeapSize / 1024 / 1024;
    }

    // Auto-optimize if enabled
    if (this.settings.autoOptimize) {
      this.autoOptimize();
    }
  }

  private autoOptimize(): void {
    const now = performance.now();
    if (now - this.lastOptimizationTime < this.optimizationCooldown) {
      return;
    }

    const avgFPS = this.getAverageFPS();
    
    if (avgFPS < this.settings.targetFPS * 0.8) {
      this.applyOptimizations();
      this.lastOptimizationTime = now;
    } else if (avgFPS > this.settings.targetFPS * 0.95 && this.canRestoreQuality()) {
      this.restoreQuality();
      this.lastOptimizationTime = now;
    }
  }

  private getAverageFPS(): number {
    if (this.frameTimes.length === 0) return 60;
    const avgFrameTime = this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length;
    return 1000 / avgFrameTime;
  }

  private applyOptimizations(): void {
    if (this.settings.shadowsEnabled) {
      this.settings.shadowsEnabled = false;
      console.log('🔧 Disabled shadows for performance');
      return;
    }

    if (this.settings.trailsEnabled) {
      this.settings.trailsEnabled = false;
      console.log('🔧 Disabled trails for performance');
      return;
    }

    if (this.settings.maxParticles > 100) {
      this.settings.maxParticles = Math.max(100, this.settings.maxParticles * 0.7);
      console.log(`🔧 Reduced particles to ${this.settings.maxParticles}`);
    }
  }

  private canRestoreQuality(): boolean {
    return !this.settings.shadowsEnabled || !this.settings.trailsEnabled || this.settings.maxParticles < 300;
  }

  private restoreQuality(): void {
    if (!this.settings.shadowsEnabled) {
      this.settings.shadowsEnabled = true;
      console.log('🔧 Restored shadows');
      return;
    }

    if (!this.settings.trailsEnabled) {
      this.settings.trailsEnabled = true;
      console.log('🔧 Restored trails');
      return;
    }

    if (this.settings.maxParticles < 300) {
      this.settings.maxParticles = Math.min(300, this.settings.maxParticles * 1.3);
      console.log(`🔧 Increased particles to ${this.settings.maxParticles}`);
    }
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public getSettings(): PerformanceSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<PerformanceSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  public reset(): void {
    this.frameTimes = [];
    this.lastOptimizationTime = 0;
    this.detectDeviceCapabilities();
  }
}