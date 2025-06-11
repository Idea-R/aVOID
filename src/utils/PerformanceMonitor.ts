interface PerformanceMetrics {
  componentName: string;
  renderCount: number;
  totalRenderTime: number;
  averageRenderTime: number;
  lastRenderTime: number;
  maxRenderTime: number;
  minRenderTime: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private isEnabled: boolean = process.env.NODE_ENV === 'development';

  public trackRender(componentName: string, renderTime: number) {
    if (!this.isEnabled) return;

    const existing = this.metrics.get(componentName);
    
    if (!existing) {
      this.metrics.set(componentName, {
        componentName,
        renderCount: 1,
        totalRenderTime: renderTime,
        averageRenderTime: renderTime,
        lastRenderTime: renderTime,
        maxRenderTime: renderTime,
        minRenderTime: renderTime
      });
    } else {
      existing.renderCount++;
      existing.totalRenderTime += renderTime;
      existing.averageRenderTime = existing.totalRenderTime / existing.renderCount;
      existing.lastRenderTime = renderTime;
      existing.maxRenderTime = Math.max(existing.maxRenderTime, renderTime);
      existing.minRenderTime = Math.min(existing.minRenderTime, renderTime);
    }

    // Log warning for excessive renders (more than 60 renders in 1 second)
    if (existing && existing.renderCount > 60) {
      console.warn(`🚨 PERFORMANCE WARNING: ${componentName} has rendered ${existing.renderCount} times`, {
        avgTime: `${existing.averageRenderTime.toFixed(2)}ms`,
        maxTime: `${existing.maxRenderTime.toFixed(2)}ms`,
        totalTime: `${existing.totalRenderTime.toFixed(2)}ms`
      });
    }
  }

  public getMetrics(): PerformanceMetrics[] {
    return Array.from(this.metrics.values());
  }

  public getComponentMetrics(componentName: string): PerformanceMetrics | undefined {
    return this.metrics.get(componentName);
  }

  public getTopRenderingComponents(limit: number = 10): PerformanceMetrics[] {
    return Array.from(this.metrics.values())
      .sort((a, b) => b.renderCount - a.renderCount)
      .slice(0, limit);
  }

  public logSummary() {
    if (!this.isEnabled) return;

    console.group('📊 React Render Performance Summary');
    
    const topComponents = this.getTopRenderingComponents(5);
    topComponents.forEach(metric => {
      console.log(`${metric.componentName}: ${metric.renderCount} renders, avg: ${metric.averageRenderTime.toFixed(2)}ms`);
    });
    
    const totalRenders = Array.from(this.metrics.values()).reduce((sum, m) => sum + m.renderCount, 0);
    console.log(`Total renders across all components: ${totalRenders}`);
    
    console.groupEnd();
  }

  public reset() {
    this.metrics.clear();
    console.log('🔄 Performance metrics reset');
  }

  public enableDebugging() {
    this.isEnabled = true;
    console.log('🐛 Performance monitoring enabled');
  }

  public disableDebugging() {
    this.isEnabled = false;
    console.log('⚡ Performance monitoring disabled');
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Helper hook for React components to track their render performance
export function useRenderTracker(componentName: string) {
  if (process.env.NODE_ENV === 'development') {
    const startTime = performance.now();
    
    // React will be imported by the component using this hook
    const { useEffect } = require('react');
    useEffect(() => {
      const endTime = performance.now();
      performanceMonitor.trackRender(componentName, endTime - startTime);
    });
  }
}

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).performanceMonitor = performanceMonitor;
}

export default performanceMonitor; 