import { GameEngineCore } from './GameEngineCore';
import { GameSettings } from '../GameLogic';

export class GameEngineUtilities {
  private core: GameEngineCore;

  constructor(core: GameEngineCore) {
    this.core = core;
  }

  // State checking methods
  isStarted(): boolean {
    return this.core.getGameLoop().isStarted();
  }
  
  isPausedState(): boolean {
    return this.core.getGameLoop().isPausedState();
  }
  
  getGameOverState(): boolean {
    return this.core.getSystemManager().getEngineCore().getGameLogic().isGameOverState();
  }

  // Settings management
  getSettings(): GameSettings {
    return { ...this.core.getSystemManager().getEngineCore().getSettings() };
  }
  
  setPerformanceMode(enabled: boolean): void {
    const engineCore = this.core.getSystemManager().getEngineCore();
    engineCore.updateSettings({ performanceMode: enabled });
    this.handlePerformanceModeChange(enabled);
  }
  
  getPerformanceMode(): boolean {
    return this.core.getSystemManager().getEngineCore().getPerformanceSettings().performanceModeActive;
  }
  
  setAutoPerformanceModeEnabled(enabled: boolean): void {
    this.core.getSystemManager().getEngineCore().updateSettings({ autoPerformanceModeEnabled: enabled });
  }
  
  getAutoPerformanceModeEnabled(): boolean {
    return this.core.getSystemManager().getEngineCore().getSettings().autoPerformanceModeEnabled || false;
  }
  
  setAutoScalingEnabled(enabled: boolean): void {
    this.core.getSystemManager().getEngineCore().setAutoScalingEnabled(enabled);
    if (!enabled) {
      this.core.getPerformanceManager().setScalingEvent('auto-scaling-disabled');
    }
  }
  
  getAutoScalingEnabled(): boolean {
    return this.core.getSystemManager().getEngineCore().getAutoScalingEnabled();
  }

  // Performance monitoring
  getPerformanceStats() {
    return this.core.getPerformanceManager().getPerformanceStats(
      this.core.getSystemManager().getEngineCore().getPerformanceSettings()
    );
  }

  private handlePerformanceModeChange(enabled: boolean): void {
    const performanceSettings = this.core.getSystemManager().getEngineCore().getPerformanceSettings();
    this.core.getPerformanceManager().applyPerformanceMode(enabled, performanceSettings);
  }

  // Audio control methods
  getAudioManager() {
    return this.core.getSystemManager().getAudioManager();
  }
  
  async changeTrack(trackName: string): Promise<boolean> {
    return await this.core.getSystemManager().getAudioManager().playTrack(trackName, 3.0);
  }
  
  setMasterVolume(volume: number): void {
    this.core.getSystemManager().getAudioManager().setMasterVolume(volume);
  }
  
  setMusicVolume(volume: number): void {
    this.core.getSystemManager().getAudioManager().setMusicVolume(volume);
  }
  
  toggleMusic(): void {
    this.core.getSystemManager().getAudioManager().toggleMusic();
  }

  // Utility methods for device optimization
  static validateConfig(config: any): boolean {
    if (!config) return false;
    if (typeof config.canvas === 'undefined') return false;
    return true;
  }

  static calculateOptimalSettings(canvas: HTMLCanvasElement): any {
    const width = canvas.width;
    const height = canvas.height;
    const pixelRatio = window.devicePixelRatio || 1;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    return {
      renderScale: isMobile ? Math.min(pixelRatio, 2) : pixelRatio,
      maxParticles: isMobile ? 150 : 300,
      shadowsEnabled: !isMobile && pixelRatio <= 2,
      antiAliasing: !isMobile,
      adaptiveQuality: isMobile || width * height > 1920 * 1080
    };
  }

  static getSystemMetrics(): any {
    const nav = navigator as any;
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      hardwareConcurrency: nav.hardwareConcurrency || 4,
      memory: nav.deviceMemory || 'unknown',
      connection: nav.connection ? {
        effectiveType: nav.connection.effectiveType,
        downlink: nav.connection.downlink,
        rtt: nav.connection.rtt
      } : null,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      screenSize: {
        width: screen.width,
        height: screen.height,
        availWidth: screen.availWidth,
        availHeight: screen.availHeight
      }
    };
  }

  static handleResize(canvas: HTMLCanvasElement, core: GameEngineCore): void {
    const rect = canvas.getBoundingClientRect();
    // Cap device pixel ratio to prevent insane UI scaling
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    
    canvas.width = rect.width * pixelRatio;
    canvas.height = rect.height * pixelRatio;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(pixelRatio, pixelRatio);
    }
    
    console.log(`[ENGINE UTILS] Canvas resized to ${canvas.width}x${canvas.height} (${rect.width}x${rect.height} CSS) - pixelRatio: ${pixelRatio} (capped from ${window.devicePixelRatio})`);
  }

  static optimizeForDevice(): any {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isLowEnd = this.isLowEndDevice();
    const nav = navigator as any;
    
    return {
      particleCount: isLowEnd ? 50 : (isMobile ? 150 : 300),
      shadowsEnabled: !isMobile && !isLowEnd,
      antiAliasing: !isMobile,
      highResolutionTimer: 'performance' in window,
      hardwareConcurrency: nav.hardwareConcurrency || 4,
      memoryLimit: nav.deviceMemory ? nav.deviceMemory * 1024 : 2048, // MB
      preferredFrameRate: isMobile ? 30 : 60,
      adaptiveRendering: isMobile || isLowEnd
    };
  }

  private static isLowEndDevice(): boolean {
    const nav = navigator as any;
    
    // Check device memory
    if (nav.deviceMemory && nav.deviceMemory < 4) {
      return true;
    }
    
    // Check hardware concurrency
    if (nav.hardwareConcurrency && nav.hardwareConcurrency < 4) {
      return true;
    }
    
    // Check connection
    if (nav.connection) {
      if (nav.connection.effectiveType === 'slow-2g' || nav.connection.effectiveType === '2g') {
        return true;
      }
      if (nav.connection.saveData) {
        return true;
      }
    }
    
    return false;
  }

  // Performance monitoring utilities
  static monitorPerformance(callback: (metrics: any) => void, intervalMs: number = 5000): () => void {
    const startTime = performance.now();
    let frameCount = 0;
    let lastTime = startTime;
    
    const monitor = () => {
      const now = performance.now();
      frameCount++;
      
      if (now - lastTime >= intervalMs) {
        const fps = (frameCount * 1000) / (now - lastTime);
        const memoryInfo = (performance as any).memory;
        
        const metrics = {
          fps: Math.round(fps),
          frameTime: (now - lastTime) / frameCount,
          memory: memoryInfo ? {
            used: Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024),
            total: Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024),
            limit: Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024)
          } : null,
          uptime: now - startTime
        };
        
        callback(metrics);
        frameCount = 0;
        lastTime = now;
      }
      
      requestAnimationFrame(monitor);
    };
    
    const animationId = requestAnimationFrame(monitor);
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }

  // Debug utilities
  static enableDebugMode(core: GameEngineCore): void {
    (window as any).gameEngine = core;
    (window as any).gameDebug = {
      getSystemManager: () => core.getSystemManager(),
      getPerformanceStats: () => core.getPerformanceManager().getPerformanceStats(
        core.getSystemManager().getEngineCore().getPerformanceSettings()
      ),
      triggerChainDetonation: () => {
        const engineCore = core.getSystemManager().getEngineCore();
        const meteors = engineCore.getGameLogic().getActiveMeteors();
        if (meteors.length > 0) {
          const event = new CustomEvent('chainDetonationComplete', {
            detail: { centerX: 400, centerY: 300 }
          });
          document.dispatchEvent(event);
        }
      }
    };
    console.log('[ENGINE UTILS] Debug mode enabled. Access via window.gameDebug');
  }
}