// Extracted from Engine.ts on January 7, 2025
// Original Engine.ts: 887 lines -> Refactored into modular architecture

import { PerformanceSettings } from '../EngineCore';

/**
 * PerformanceManager handles FPS tracking, auto-scaling, and performance optimization.
 * Extracted from Engine.ts to maintain separation of concerns and stay under 500-line limit.
 */
export class PerformanceManager {
  // FPS tracking
  private frameCount: number = 0;
  private fpsLastTime: number = 0;
  private currentFPS: number = 0;
  private fpsUpdateInterval: number = 500;
  
  // Performance tracking
  private frameTimes: number[] = [];
  private averageFrameTime: number = 0;
  private memoryUsageEstimate: number = 0;
  private lastScalingEvent: string = 'none';
  private scalingEventTime: number = 0;
  private lowFPSStartTime: number = 0;
  
  // Callbacks for performance events
  private onAutoScalingChange: (event: string) => void = () => {};
  private onPerformanceModeChange: (enabled: boolean) => void = () => {};
  
  constructor() {
    console.log('[PERFORMANCE] PerformanceManager initialized');
  }
  
  /**
   * Set callback functions for performance events
   */
  setCallbacks(
    onAutoScalingChange: (event: string) => void,
    onPerformanceModeChange: (enabled: boolean) => void
  ) {
    this.onAutoScalingChange = onAutoScalingChange;
    this.onPerformanceModeChange = onPerformanceModeChange;
  }
  
  /**
   * Update FPS tracking and auto-scaling logic
   */
  updateFPS(
    timestamp: number, 
    performanceSettings: PerformanceSettings,
    meteorCount: number,
    particleCount: number,
    autoPerformanceModeEnabled: boolean
  ): void {
    this.frameCount++;
    
    // Track frame times for average calculation
    const frameTime = timestamp - this.fpsLastTime;
    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > 60) { // Keep last 60 frames
      this.frameTimes.shift();
    }
    
    if (timestamp - this.fpsLastTime >= this.fpsUpdateInterval) {
      this.currentFPS = Math.round((this.frameCount * 1000) / (timestamp - this.fpsLastTime));
      this.frameCount = 0;
      this.fpsLastTime = timestamp;
      
      // Calculate average frame time
      if (this.frameTimes.length > 0) {
        this.averageFrameTime = this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length;
      }
      
      // Apply auto-scaling logic
      this.handleAutoScaling(performanceSettings);
      
      // Handle auto-performance mode detection
      this.handleAutoPerformanceMode(timestamp, performanceSettings, autoPerformanceModeEnabled);
      
      // Calculate memory usage estimate
      this.memoryUsageEstimate = meteorCount + particleCount;
    }
  }
  
  /**
   * Handle auto-scaling based on FPS performance
   */
  private handleAutoScaling(performanceSettings: PerformanceSettings): void {
    if (!performanceSettings.autoScaleEnabled || performanceSettings.performanceModeActive) {
      return;
    }
    
    let scalingEventOccurred = false;
    
    if (this.currentFPS < 30) {
      this.lastScalingEvent = 'low-performance';
      this.scalingEventTime = Date.now();
      this.onPerformanceModeChange(true);
      this.onAutoScalingChange('low-performance');
      scalingEventOccurred = true;
      console.log('🔧 Auto-scaling: Low performance mode activated (FPS < 30) - Trails disabled');
    } else if (this.currentFPS < 45) {
      this.lastScalingEvent = 'medium-performance';
      this.scalingEventTime = Date.now();
      this.onAutoScalingChange('medium-performance');
      scalingEventOccurred = true;
      console.log('🔧 Auto-scaling: Medium performance mode activated (FPS < 45) - Trails disabled');
    } else if (this.currentFPS >= 55) {
      this.lastScalingEvent = 'high-performance';
      this.scalingEventTime = Date.now();
      this.onAutoScalingChange('high-performance');
      scalingEventOccurred = true;
      console.log('🔧 Auto-scaling: High performance mode activated (FPS >= 55) - Trails enabled');
    }
  }
  
  /**
   * Handle auto-performance mode detection
   */
  private handleAutoPerformanceMode(
    timestamp: number,
    performanceSettings: PerformanceSettings,
    autoPerformanceModeEnabled: boolean
  ): void {
    if (!autoPerformanceModeEnabled || performanceSettings.performanceModeActive) {
      return;
    }
    
    if (this.currentFPS < performanceSettings.lowFPSThreshold) {
      if (this.lowFPSStartTime === 0) {
        this.lowFPSStartTime = timestamp;
      } else if (timestamp - this.lowFPSStartTime >= performanceSettings.lowFPSDuration) {
        // Trigger auto performance mode activation
        this.onPerformanceModeChange(true);
        
        // Dispatch event to update UI
        window.dispatchEvent(new CustomEvent('autoPerformanceModeActivated', {
          detail: { 
            reason: 'low-fps', 
            fps: this.currentFPS, 
            duration: performanceSettings.lowFPSDuration 
          }
        }));
        
        console.log(`🔧 Auto Performance Mode activated - FPS below ${performanceSettings.lowFPSThreshold} for ${performanceSettings.lowFPSDuration/1000}s`);
        this.lowFPSStartTime = 0;
      }
    } else {
      // Reset low FPS timer if FPS improves
      this.lowFPSStartTime = 0;
    }
  }
  
  /**
   * Performance mode is handled by EngineCore - PerformanceManager only monitors
   * Auto-performance mode detection is handled in handleAutoPerformanceMode()
   */
  
  /**
   * Adjust timing for pause/resume
   */
  adjustForPause(pauseDuration: number): void {
    this.fpsLastTime += pauseDuration;
  }
  
  /**
   * Reset performance tracking
   */
  reset(): void {
    this.frameTimes.length = 0;
    this.averageFrameTime = 0;
    this.memoryUsageEstimate = 0;
    this.lastScalingEvent = 'reset';
    this.scalingEventTime = Date.now();
    this.lowFPSStartTime = 0;
    console.log('[PERFORMANCE] Performance tracking reset');
  }
  
  /**
   * Set scaling event
   */
  setScalingEvent(event: string): void {
    this.lastScalingEvent = event;
    this.scalingEventTime = Date.now();
  }
  
  // Getters
  getCurrentFPS(): number {
    return this.currentFPS;
  }
  
  getAverageFrameTime(): number {
    return this.averageFrameTime;
  }
  
  getMemoryUsageEstimate(): number {
    return this.memoryUsageEstimate;
  }
  
  getLastScalingEvent(): string {
    return this.lastScalingEvent;
  }
  
  getScalingEventTime(): number {
    return this.scalingEventTime;
  }
  
  /**
   * Get comprehensive performance stats
   */
  getPerformanceStats(performanceSettings: PerformanceSettings): {
    fps: number;
    averageFrameTime: number;
    memoryUsage: number;
    shadowsEnabled: boolean;
    maxParticles: number;
    adaptiveTrailsActive: boolean;
    lastScalingEvent: string;
    scalingEventTime: number;
  } {
    return {
      fps: this.currentFPS,
      averageFrameTime: this.averageFrameTime,
      memoryUsage: this.memoryUsageEstimate,
      shadowsEnabled: performanceSettings.shadowsEnabled,
      maxParticles: performanceSettings.dynamicMaxParticles,
      adaptiveTrailsActive: performanceSettings.adaptiveTrailsActive,
      lastScalingEvent: this.lastScalingEvent,
      scalingEventTime: this.scalingEventTime
    };
  }
}