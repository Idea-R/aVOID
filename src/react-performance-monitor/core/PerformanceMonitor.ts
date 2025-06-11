import {
  ComponentMetric,
  RenderEvent,
  PerformanceSnapshot,
  PerformanceConfig,
  PerformanceMetrics,
  MemoryInfo,
  FPSTracker
} from '../types/PerformanceTypes';
import { defaultConfig } from '../config/defaultConfig';

export class PerformanceMonitor {
  private config: PerformanceConfig;
  private metrics: PerformanceMetrics;
  private fpsTracker: FPSTracker;
  private renderTimeWindow: number[] = [];
  private lastSnapshotTime: number = 0;
  
  constructor(userConfig: Partial<PerformanceConfig> = {}) {
    this.config = { ...defaultConfig, ...userConfig };
    this.metrics = {
      components: new Map(),
      renderEvents: [],
      snapshots: [],
      startTime: Date.now(),
      isRecording: this.config.enabled
    };
    
    this.fpsTracker = {
      fps: 0,
      samples: [],
      lastTime: performance.now()
    };
    
    if (this.config.enabled) {
      this.initializeTracking();
    }
  }

  private initializeTracking() {
    // Initialize FPS tracking
    if (this.config.trackFPS) {
      this.startFPSTracking();
    }
    
    // Initialize memory tracking
    if (this.config.trackMemoryUsage) {
      this.startMemoryTracking();
    }
    
    // Initialize periodic snapshots
    this.startSnapshotInterval();
    
    // Make available globally for debugging
    if (typeof window !== 'undefined') {
      (window as any).performanceMonitor = this;
    }
  }

  public trackRender(
    componentName: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number = actualDuration,
    startTime: number = performance.now(),
    commitTime: number = performance.now()
  ) {
    if (!this.config.enabled) return;

    const timestamp = Date.now();
    const renderEvent: RenderEvent = {
      componentName,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
      timestamp
    };

    this.metrics.renderEvents.push(renderEvent);
    this.updateComponentMetric(componentName, actualDuration, phase, timestamp);
    this.checkForProblems(componentName, actualDuration);
    
    // Keep render events within reasonable limits
    if (this.metrics.renderEvents.length > 1000) {
      this.metrics.renderEvents = this.metrics.renderEvents.slice(-500);
    }
  }

  private updateComponentMetric(
    componentName: string,
    renderTime: number,
    phase: 'mount' | 'update',
    timestamp: number
  ) {
    let metric = this.metrics.components.get(componentName);
    
    if (!metric) {
      metric = {
        componentName,
        renderCount: 0,
        totalRenderTime: 0,
        averageRenderTime: 0,
        lastRenderTime: 0,
        maxRenderTime: 0,
        minRenderTime: Infinity,
        firstRenderTime: timestamp,
        isProblematic: false,
        warnings: []
      };
      this.metrics.components.set(componentName, metric);
    }

    metric.renderCount++;
    metric.totalRenderTime += renderTime;
    metric.averageRenderTime = metric.totalRenderTime / metric.renderCount;
    metric.lastRenderTime = renderTime;
    metric.maxRenderTime = Math.max(metric.maxRenderTime, renderTime);
    metric.minRenderTime = Math.min(metric.minRenderTime, renderTime);
    
    if (phase === 'mount') {
      metric.mountTime = renderTime;
    } else {
      metric.updateTime = renderTime;
    }
  }

  private checkForProblems(componentName: string, renderTime: number) {
    const metric = this.metrics.components.get(componentName);
    if (!metric) return;

    // Check for excessive render time
    if (renderTime > this.config.maxRenderTime) {
      const warning = `Slow render: ${renderTime.toFixed(2)}ms (threshold: ${this.config.maxRenderTime}ms)`;
      this.addWarning(componentName, warning);
    }

    // Check for excessive renders in time window
    const recentRenders = this.metrics.renderEvents
      .filter(event => 
        event.componentName === componentName && 
        Date.now() - event.timestamp < 1000
      ).length;

    if (recentRenders > this.config.maxRendersPerSecond) {
      const warning = `Excessive renders: ${recentRenders} renders/sec (threshold: ${this.config.maxRendersPerSecond})`;
      this.addWarning(componentName, warning);
      metric.isProblematic = true;
      
      if (this.config.onExcessiveRenders) {
        this.config.onExcessiveRenders(metric);
      }
    }
  }

  private addWarning(componentName: string, warning: string) {
    const metric = this.metrics.components.get(componentName);
    if (!metric) return;

    if (!metric.warnings.includes(warning)) {
      metric.warnings.push(warning);
      
      if (this.config.enableWarnings && this.config.logLevel !== 'silent') {
        console.warn(`🚨 Performance Warning [${componentName}]: ${warning}`);
      }
      
      if (this.config.onWarning) {
        this.config.onWarning(componentName, warning);
      }
    }
  }

  private startFPSTracking() {
    const trackFPS = () => {
      const now = performance.now();
      const delta = now - this.fpsTracker.lastTime;
      
      if (delta > 0) {
        const fps = 1000 / delta;
        this.fpsTracker.samples.push(fps);
        
        // Keep only last 60 samples (1 second at 60fps)
        if (this.fpsTracker.samples.length > 60) {
          this.fpsTracker.samples = this.fpsTracker.samples.slice(-60);
        }
        
        this.fpsTracker.fps = this.fpsTracker.samples.reduce((a, b) => a + b, 0) / this.fpsTracker.samples.length;
      }
      
      this.fpsTracker.lastTime = now;
      requestAnimationFrame(trackFPS);
    };
    
    requestAnimationFrame(trackFPS);
  }

  private startMemoryTracking() {
    // Memory tracking is available in performance.memory (Chrome/Edge)
    if (typeof window !== 'undefined' && 'memory' in performance) {
      setInterval(() => {
        // Memory usage is tracked in snapshots
      }, 5000);
    }
  }

  private startSnapshotInterval() {
    setInterval(() => {
      if (Date.now() - this.lastSnapshotTime > 10000) { // Every 10 seconds
        this.takeSnapshot();
      }
    }, 10000);
  }

  public takeSnapshot(): PerformanceSnapshot {
    const now = Date.now();
    const components = Array.from(this.metrics.components.values());
    
    const snapshot: PerformanceSnapshot = {
      timestamp: now,
      totalComponents: components.length,
      totalRenders: components.reduce((sum, c) => sum + c.renderCount, 0),
      averageRenderTime: components.length > 0 
        ? components.reduce((sum, c) => sum + c.averageRenderTime, 0) / components.length 
        : 0,
      problematicComponents: components.filter(c => c.isProblematic).map(c => c.componentName),
      topRenderingComponents: components
        .sort((a, b) => b.renderCount - a.renderCount)
        .slice(0, 10),
      fpsEstimate: this.fpsTracker.fps
    };

    // Add memory info if available
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      snapshot.memoryUsage = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
    }

    this.metrics.snapshots.push(snapshot);
    this.lastSnapshotTime = now;

    // Keep snapshots within limits
    if (this.metrics.snapshots.length > this.config.maxStoredSnapshots) {
      this.metrics.snapshots = this.metrics.snapshots.slice(-this.config.maxStoredSnapshots);
    }

    if (this.config.onPerformanceSnapshot) {
      this.config.onPerformanceSnapshot(snapshot);
    }

    return snapshot;
  }

  // Public API methods
  public getMetrics(): ComponentMetric[] {
    return Array.from(this.metrics.components.values());
  }

  public getComponentMetric(componentName: string): ComponentMetric | undefined {
    return this.metrics.components.get(componentName);
  }

  public getTopRenderingComponents(limit: number = 10): ComponentMetric[] {
    return Array.from(this.metrics.components.values())
      .sort((a, b) => b.renderCount - a.renderCount)
      .slice(0, limit);
  }

  public getProblematicComponents(): ComponentMetric[] {
    return Array.from(this.metrics.components.values())
      .filter(metric => metric.isProblematic);
  }

  public getSnapshots(): PerformanceSnapshot[] {
    return [...this.metrics.snapshots];
  }

  public getLatestSnapshot(): PerformanceSnapshot | undefined {
    return this.metrics.snapshots[this.metrics.snapshots.length - 1];
  }

  public logSummary() {
    if (!this.config.enableConsoleLogging) return;

    console.group('📊 React Performance Monitor Summary');
    
    const topComponents = this.getTopRenderingComponents(5);
    console.log('Top Rendering Components:');
    topComponents.forEach(metric => {
      console.log(
        `  ${metric.componentName}: ${metric.renderCount} renders, ` +
        `avg: ${metric.averageRenderTime.toFixed(2)}ms, ` +
        `max: ${metric.maxRenderTime.toFixed(2)}ms`
      );
    });
    
    const problematic = this.getProblematicComponents();
    if (problematic.length > 0) {
      console.warn('⚠️ Problematic Components:');
      problematic.forEach(metric => {
        console.warn(`  ${metric.componentName}: ${metric.warnings.join(', ')}`);
      });
    }
    
    const totalRenders = Array.from(this.metrics.components.values())
      .reduce((sum, m) => sum + m.renderCount, 0);
    
    console.log(`📈 Total renders: ${totalRenders}`);
    console.log(`⚡ Current FPS: ${this.fpsTracker.fps.toFixed(1)}`);
    
    if (this.getLatestSnapshot()?.memoryUsage) {
      const memory = this.getLatestSnapshot()!.memoryUsage!;
      console.log(`💾 Memory: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB used`);
    }
    
    console.groupEnd();
  }

  public reset() {
    this.metrics.components.clear();
    this.metrics.renderEvents = [];
    this.metrics.snapshots = [];
    this.metrics.startTime = Date.now();
    console.log('🔄 Performance metrics reset');
  }

  public updateConfig(newConfig: Partial<PerformanceConfig>) {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.enabled && !this.metrics.isRecording) {
      this.metrics.isRecording = true;
      this.initializeTracking();
    } else if (!this.config.enabled && this.metrics.isRecording) {
      this.metrics.isRecording = false;
    }
  }

  public exportData() {
    return {
      config: this.config,
      metrics: {
        components: Array.from(this.metrics.components.entries()),
        renderEvents: this.metrics.renderEvents,
        snapshots: this.metrics.snapshots,
        startTime: this.metrics.startTime,
        isRecording: this.metrics.isRecording
      },
      exportTime: Date.now()
    };
  }
}

// Singleton instance for global use
export const performanceMonitor = new PerformanceMonitor(); 