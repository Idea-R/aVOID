import { ParticleSystem } from '../systems/ParticleSystem';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  frameCount: number;
  lastUpdate: number;
}

export class PerformanceMonitor {
  private frameCount: number = 0;
  private fpsCounter: number = 0;
  private lastFPSUpdate: number = 0;
  private performanceOptimizationsEnabled: boolean = false;
  private particleSystem: ParticleSystem | null = null;
  
  private readonly TARGET_FPS = 60;
  private readonly LOW_FPS_THRESHOLD = 45;
  private readonly HIGH_FPS_THRESHOLD = 55;

  setParticleSystem(particleSystem: ParticleSystem): void {
    this.particleSystem = particleSystem;
  }

  updatePerformanceMetrics(timestamp: number, deltaTime: number, enableAutoOptimization: boolean = false): void {
    this.frameCount++;
    
    // Update FPS every second
    if (timestamp - this.lastFPSUpdate >= 1000) {
      this.fpsCounter = Math.round((this.frameCount * 1000) / (timestamp - this.lastFPSUpdate));
      this.frameCount = 0;
      this.lastFPSUpdate = timestamp;
      
      // Auto-optimization if enabled
      if (enableAutoOptimization) {
        this.handleAutoOptimization();
      }
    }
  }

  private handleAutoOptimization(): void {
    if (this.fpsCounter < this.LOW_FPS_THRESHOLD && !this.performanceOptimizationsEnabled) {
      this.enablePerformanceOptimizations();
    } else if (this.fpsCounter > this.HIGH_FPS_THRESHOLD && this.performanceOptimizationsEnabled) {
      this.disablePerformanceOptimizations();
    }
  }

  enablePerformanceOptimizations(): void {
    if (this.performanceOptimizationsEnabled) return;
    
    this.performanceOptimizationsEnabled = true;
    
    if (this.particleSystem) {
      this.particleSystem.setMaxParticles(150);
    }
    
    console.log('🔧 Performance optimizations enabled (FPS < 45)');
  }

  disablePerformanceOptimizations(): void {
    if (!this.performanceOptimizationsEnabled) return;
    
    this.performanceOptimizationsEnabled = false;
    
    if (this.particleSystem) {
      this.particleSystem.setMaxParticles(300);
    }
    
    console.log('🔧 Performance optimizations disabled (FPS > 55)');
  }

  getFPS(): number {
    return this.fpsCounter;
  }

  getMetrics(): PerformanceMetrics {
    return {
      fps: this.fpsCounter,
      frameTime: this.frameCount > 0 ? 1000 / this.fpsCounter : 0,
      frameCount: this.frameCount,
      lastUpdate: this.lastFPSUpdate
    };
  }

  isPerformanceModeEnabled(): boolean {
    return this.performanceOptimizationsEnabled;
  }

  reset(): void {
    this.frameCount = 0;
    this.fpsCounter = 0;
    this.lastFPSUpdate = 0;
    this.performanceOptimizationsEnabled = false;
  }
}