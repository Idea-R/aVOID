import { ComponentMetric, CulpritData } from '../types/PerformanceTypes';
import { performanceMonitor } from '../core/PerformanceMonitor';

export class AgentExporter {
  
  /**
   * Get performance culprits in minimal format
   */
  static getCulprits(threshold: number = 50): CulpritData[] {
    return performanceMonitor.getMetrics()
      .filter(m => m.renderCount > threshold || m.isProblematic)
      .map(m => ({
        component: m.componentName,
        renders: m.renderCount,
        avgMs: Math.round(m.averageRenderTime * 100) / 100,
        maxMs: Math.round(m.maxRenderTime * 100) / 100,
        warnings: m.warnings
      }))
      .sort((a, b) => b.renders - a.renders);
  }

  /**
   * Generate minimal agent prompt
   */
  static generateAgentPrompt(culprits: CulpritData[] = this.getCulprits()): string {
    if (culprits.length === 0) return "✅ No performance issues detected";

    const prompt = [
      "🚨 REACT PERFORMANCE ISSUES:",
      "",
      ...culprits.map(c => 
        `${c.component}: ${c.renders} renders, ${c.avgMs}ms avg${c.maxMs > 20 ? `, ${c.maxMs}ms max` : ''}${c.warnings.length ? ` - ${c.warnings[0]}` : ''}`
      ),
      "",
      "Fix excessive re-renders using React.memo, useCallback, useMemo."
    ].join('\n');

    return prompt;
  }

  /**
   * Get quick performance report (for hotkeys)
   */
  static getQuickReport(): string | null {
    const metrics = performanceMonitor.getMetrics();
    if (metrics.length === 0) return null;
    
    const now = Date.now();
    const issues = [];
    
    metrics.forEach(m => {
      // Calculate actual time elapsed since first render
      const timeElapsedSec = (now - m.firstRenderTime) / 1000;
      const rendersPerSec = timeElapsedSec > 0 ? (m.renderCount / timeElapsedSec) : 0;
      
      // Check if exceeds threshold
      if (rendersPerSec > 5) { // 5 renders/sec threshold
        issues.push({
          component: m.componentName,
          rendersPerSec: Math.round(rendersPerSec * 10) / 10, // 1 decimal place
          totalRenders: m.renderCount,
          timeElapsed: Math.round(timeElapsedSec)
        });
      }
    });
    
    if (issues.length === 0) return null;
    
    // Sort by renders per second
    issues.sort((a, b) => b.rendersPerSec - a.rendersPerSec);
    
    return issues.map(issue => 
      `- ${issue.component}: ${issue.rendersPerSec}/sec (${issue.totalRenders} total in ${issue.timeElapsed}s)`
    ).join('\n');
  }

  /**
   * Get agent-ready report (same as generateAgentPrompt)
   */
  static getAgentReport(): string | null {
    const culprits = this.getCulprits();
    if (culprits.length === 0) return null;
    return this.generateAgentPrompt(culprits);
  }

  /**
   * Get detailed summary report
   */
  static getSummaryReport(): string {
    const metrics = performanceMonitor.getMetrics();
    const culprits = this.getCulprits();
    
    if (metrics.length === 0) {
      return "📊 No components tracked yet";
    }
    
    const summary = [
      `📊 Performance Summary:`,
      `  Total components tracked: ${metrics.length}`,
      `  Performance violations: ${culprits.length}`,
      ``
    ];
    
    if (culprits.length > 0) {
      summary.push("🚨 Issues found:");
      culprits.forEach(c => {
        summary.push(`  - ${c.component}: ${c.renders} renders, ${c.avgMs}ms avg`);
      });
    } else {
      summary.push("✅ No performance issues detected");
    }
    
    return summary.join('\n');
  }

  /**
   * Get full export data
   */
  static getFullExport(): any {
    return {
      timestamp: new Date().toISOString(),
      metrics: performanceMonitor.getMetrics(),
      culprits: this.getCulprits(),
      summary: this.getSummaryReport()
    };
  }

  /**
   * Copy agent prompt to clipboard
   */
  static async copyToClipboard(): Promise<boolean> {
    try {
      const prompt = this.generateAgentPrompt();
      
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(prompt);
        console.log("📋 Performance prompt copied to clipboard");
        return true;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = prompt;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        console.log("📋 Performance prompt copied (fallback)");
        return true;
      }
    } catch (error) {
      console.error("❌ Failed to copy to clipboard:", error);
      return false;
    }
  }

  /**
   * Export raw data for manual analysis
   */
  static exportRawData(): string {
    const culprits = this.getCulprits();
    return JSON.stringify(culprits, null, 2);
  }

  /**
   * Generate quick summary for console
   */
  static quickSummary(): void {
    const culprits = this.getCulprits();
    
    if (culprits.length === 0) {
      console.log("✅ No performance issues");
      return;
    }

    console.group("🚨 Performance Culprits");
    culprits.forEach(c => {
      console.log(`${c.component}: ${c.renders}x renders (${c.avgMs}ms avg)`);
    });
    console.groupEnd();
    
    console.log("💡 Run performanceMonitor.copyPrompt() to copy agent-ready fix prompt");
  }

  /**
   * Smart threshold detection
   */
  static getSmartThreshold(): number {
    const allMetrics = performanceMonitor.getMetrics();
    if (allMetrics.length === 0) return 50;
    
    const renders = allMetrics.map(m => m.renderCount).sort((a, b) => b - a);
    const q75 = renders[Math.floor(renders.length * 0.25)] || 50;
    
    return Math.max(q75, 20); // At least 20 renders to be considered
  }
}

// Add global methods for easy access
if (typeof window !== 'undefined') {
  const monitor = performanceMonitor as any;
  
  monitor.getCulprits = () => AgentExporter.getCulprits();
  monitor.copyPrompt = () => AgentExporter.copyToClipboard();
  monitor.quickSummary = () => AgentExporter.quickSummary();
  monitor.exportRaw = () => AgentExporter.exportRawData();
}

export default AgentExporter; 