import { PerformanceMonitor } from './PerformanceMonitor';

export interface RenderSettings {
  particleLimit: number;
  trailLength: number;
  shadowBlur: number;
  glowIntensity: number;
  useTrails: boolean;
  useGlow: boolean;
  useParticles: boolean;
  meteorLimit: number;
}

export class AdaptiveRenderer {
  private performanceMonitor: PerformanceMonitor;
  private baseSettings: RenderSettings;
  private currentSettings: RenderSettings;

  constructor(performanceMonitor: PerformanceMonitor) {
    this.performanceMonitor = performanceMonitor;
    
    this.baseSettings = {
      particleLimit: 300,
      trailLength: 15,
      shadowBlur: 20,
      glowIntensity: 1.0,
      useTrails: true,
      useGlow: true,
      useParticles: true,
      meteorLimit: 50
    };

    this.currentSettings = { ...this.baseSettings };
  }

  updateSettings(): RenderSettings {
    const qualityLevel = this.performanceMonitor.getQualityLevel();
    
    // Adjust settings based on quality level
    this.currentSettings = {
      particleLimit: Math.floor(this.baseSettings.particleLimit * qualityLevel),
      trailLength: Math.floor(this.baseSettings.trailLength * qualityLevel),
      shadowBlur: Math.floor(this.baseSettings.shadowBlur * qualityLevel),
      glowIntensity: this.baseSettings.glowIntensity * qualityLevel,
      useTrails: qualityLevel > 0.5,
      useGlow: qualityLevel > 0.4,
      useParticles: qualityLevel > 0.3,
      meteorLimit: Math.floor(this.baseSettings.meteorLimit * Math.max(0.6, qualityLevel))
    };

    return this.currentSettings;
  }

  getCurrentSettings(): RenderSettings {
    return this.currentSettings;
  }

  shouldSkipFrame(): boolean {
    return this.performanceMonitor.getCurrentFPS() < 30;
  }

  getParticleSkipRatio(): number {
    const qualityLevel = this.performanceMonitor.getQualityLevel();
    if (qualityLevel >= 0.8) return 1; // Render all particles
    if (qualityLevel >= 0.6) return 0.8; // Skip 20%
    if (qualityLevel >= 0.4) return 0.6; // Skip 40%
    return 0.4; // Skip 60%
  }
}