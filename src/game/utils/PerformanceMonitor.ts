export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  renderTime: number;
  updateTime: number;
  meteorCount: number;
  particleCount: number;
  qualityLevel: number;
}

export class PerformanceMonitor {
  private frameCount: number = 0;
  private lastTime: number = 0;
  private fpsHistory: number[] = [];
  private frameTimeHistory: number[] = [];
  private renderTimeHistory: number[] = [];
  private updateTimeHistory: number[] = [];
  private currentFPS: number = 60;
  private qualityLevel: number = 1.0; // 1.0 = highest quality, 0.3 = lowest
  private lastQualityAdjustment: number = 0;
  
  private readonly FPS_HISTORY_SIZE = 30;
  private readonly TARGET_FPS = 45;
  private readonly QUALITY_ADJUSTMENT_COOLDOWN = 2000; // 2 seconds

  update(timestamp: number, renderTime: number, updateTime: number): PerformanceMetrics {
    this.frameCount++;
    
    const deltaTime = timestamp - this.lastTime;
    if (deltaTime >= 1000) {
      this.currentFPS = Math.round((this.frameCount * 1000) / deltaTime);
      this.frameCount = 0;
      this.lastTime = timestamp;
      
      // Update FPS history
      this.fpsHistory.push(this.currentFPS);
      if (this.fpsHistory.length > this.FPS_HISTORY_SIZE) {
        this.fpsHistory.shift();
      }
      
      // Update performance histories
      this.frameTimeHistory.push(deltaTime / this.frameCount);
      this.renderTimeHistory.push(renderTime);
      this.updateTimeHistory.push(updateTime);
      
      if (this.frameTimeHistory.length > this.FPS_HISTORY_SIZE) {
        this.frameTimeHistory.shift();
        this.renderTimeHistory.shift();
        this.updateTimeHistory.shift();
      }
      
      // Adjust quality based on performance
      this.adjustQuality(timestamp);
    }
    
    return {
      fps: this.currentFPS,
      frameTime: this.getAverageFrameTime(),
      renderTime: this.getAverageRenderTime(),
      updateTime: this.getAverageUpdateTime(),
      meteorCount: 0, // Will be set by caller
      particleCount: 0, // Will be set by caller
      qualityLevel: this.qualityLevel
    };
  }

  private adjustQuality(timestamp: number): void {
    if (timestamp - this.lastQualityAdjustment < this.QUALITY_ADJUSTMENT_COOLDOWN) {
      return;
    }

    const avgFPS = this.getAverageFPS();
    
    if (avgFPS < this.TARGET_FPS && this.qualityLevel > 0.3) {
      // Reduce quality
      this.qualityLevel = Math.max(0.3, this.qualityLevel - 0.1);
      this.lastQualityAdjustment = timestamp;
      console.log(`Performance: Reducing quality to ${this.qualityLevel.toFixed(1)} (FPS: ${avgFPS})`);
    } else if (avgFPS > this.TARGET_FPS + 10 && this.qualityLevel < 1.0) {
      // Increase quality
      this.qualityLevel = Math.min(1.0, this.qualityLevel + 0.05);
      this.lastQualityAdjustment = timestamp;
      console.log(`Performance: Increasing quality to ${this.qualityLevel.toFixed(1)} (FPS: ${avgFPS})`);
    }
  }

  private getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 60;
    return this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
  }

  private getAverageFrameTime(): number {
    if (this.frameTimeHistory.length === 0) return 16.67;
    return this.frameTimeHistory.reduce((sum, time) => sum + time, 0) / this.frameTimeHistory.length;
  }

  private getAverageRenderTime(): number {
    if (this.renderTimeHistory.length === 0) return 0;
    return this.renderTimeHistory.reduce((sum, time) => sum + time, 0) / this.renderTimeHistory.length;
  }

  private getAverageUpdateTime(): number {
    if (this.updateTimeHistory.length === 0) return 0;
    return this.updateTimeHistory.reduce((sum, time) => sum + time, 0) / this.updateTimeHistory.length;
  }

  getQualityLevel(): number {
    return this.qualityLevel;
  }

  getCurrentFPS(): number {
    return this.currentFPS;
  }

  reset(): void {
    this.frameCount = 0;
    this.lastTime = 0;
    this.fpsHistory.length = 0;
    this.frameTimeHistory.length = 0;
    this.renderTimeHistory.length = 0;
    this.updateTimeHistory.length = 0;
    this.qualityLevel = 1.0;
    this.lastQualityAdjustment = 0;
  }
}