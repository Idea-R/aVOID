import { PerformanceMonitor, performanceMonitor } from '../core/PerformanceMonitor';
import AgentExporter from '../utils/AgentExporter';
import { defaultConfig, developmentConfig, productionConfig } from '../config/defaultConfig';
import type { PerformanceConfig } from '../types/PerformanceTypes';

// Global hotkeys for instant performance reports
let hotkeyListenersAdded = false;

const addHotkeys = () => {
  if (hotkeyListenersAdded) return;
  
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl+Shift+P = Quick performance report
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      const report = AgentExporter.getQuickReport();
      
      if (report) {
        console.log('🚀 HOTKEY: Quick Performance Report\n', report);
        // Try clipboard, fallback to alert
        navigator.clipboard.writeText(report).catch(() => {
          alert(`Performance Report:\n\n${report}`);
        });
      } else {
        console.log('✅ No performance issues detected');
        const metrics = performanceMonitor.getMetrics();
        console.log(`🔍 Debug: Tracking ${metrics.length} components`);
      }
    }
    
    // Ctrl+Shift+R = Reset performance data  
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
      e.preventDefault();
      performanceMonitor.reset();
      console.log('🔄 HOTKEY: Performance data reset');
    }
    
    // Ctrl+Shift+S = Summary report
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      const summary = AgentExporter.getSummaryReport();
      console.log('📊 HOTKEY: Performance Summary\n', summary);
    }
  };
  
  // Add to both document and window for better compatibility
  document.addEventListener('keydown', handleKeyDown, true);
  window.addEventListener('keydown', handleKeyDown, true);
  
  hotkeyListenersAdded = true;
  
  // Show hotkey info once
  console.log(`
🎯 PERFORMANCE HOTKEYS ACTIVE:
  Ctrl+Shift+P = Quick report (copy-ready)
  Ctrl+Shift+S = Full summary  
  Ctrl+Shift+R = Reset data

⚡ BACKUP: Type perf.copy() in console if hotkeys don't work
  `);
};

export const setupPerformanceMonitoring = (config: Partial<PerformanceConfig> = {}) => {
  const finalConfig = { ...defaultConfig, ...config };
  performanceMonitor.updateConfig(finalConfig);
  
  // Add hotkeys for instant access
  if (typeof document !== 'undefined') {
    addHotkeys();
  }

  // Enhanced console shortcuts with better clipboard handling
  if (typeof window !== 'undefined') {
    (window as any).perf = {
      quick: () => {
        const report = AgentExporter.getQuickReport();
        console.log(report || 'No performance issues detected ✅');
        return report;
      },
      copy: async () => {
        const report = AgentExporter.getAgentReport();
        if (!report) {
          console.log('✅ No performance issues to report');
          return true;
        }
        
        try {
          await navigator.clipboard.writeText(report);
          console.log('📋 Performance report copied to clipboard!');
          return true;
        } catch (error) {
          // Fallback: Show in prompt for manual copy
          prompt('📋 Copy this performance report (Ctrl+C):', report);
          console.log('📋 Performance report ready to copy manually');
          return false;
        }
      },
      summary: () => {
        const summary = AgentExporter.getSummaryReport();
        console.log(summary);
        return summary;
      },
      culprits: () => {
        const culprits = AgentExporter.getCulprits();
        console.log(culprits);
        return culprits;
      },
      reset: () => {
        performanceMonitor.reset();
        console.log('🔄 Performance data reset');
      },
      export: () => {
        const data = AgentExporter.getFullExport();
        console.log('📤 Full performance data:', data);
        return data;
      },
      // NEW DEBUG COMMANDS
      debug: () => {
        const metrics = performanceMonitor.getMetrics();
        console.log('🐛 All tracked components:', metrics);
        console.log('🔍 Component count:', metrics.length);
        if (metrics.length > 0) {
          console.log('📊 Top renderers:', metrics.sort((a, b) => b.renderCount - a.renderCount).slice(0, 5));
        }
        return metrics;
      },
      status: () => {
        const metrics = performanceMonitor.getMetrics();
        console.log(`📊 Performance Monitor Status:
        - Tracking: ${metrics.length} components
        - Total renders recorded: ${metrics.reduce((sum, m) => sum + m.renderCount, 0)}
        - Components with issues: ${metrics.filter(m => m.isProblematic).length}`);
        
        if (metrics.length > 0) {
          console.log('📈 Recent activity:');
          metrics.forEach(m => {
            console.log(`  - ${m.componentName}: ${m.renderCount} renders (avg: ${m.averageRenderTime.toFixed(1)}ms)`);
          });
        }
      },
      all: () => {
        // Show all data with very low threshold
        const culprits = AgentExporter.getCulprits(1); // threshold of 1 render
        console.log('🔍 ALL COMPONENTS (threshold: 1 render):', culprits);
        return culprits;
      },
      // NEW TIME-BASED MEASUREMENT
      measure: (seconds = 10) => {
        console.log(`🕐 Starting ${seconds}-second measurement...`);
        performanceMonitor.reset(); // Clear existing data
        
        setTimeout(() => {
          const report = AgentExporter.getQuickReport();
          console.log(`📊 Performance Report (${seconds}s measurement):`);
          console.log(report || 'No performance issues detected in measurement period');
        }, seconds * 1000);
        
        return `Measuring for ${seconds} seconds...`;
      },
      // REACT DEVTOOLS-INSPIRED RECORDING SESSIONS
      startRecording: () => {
        (window as any).perfRecordingStart = Date.now();
        performanceMonitor.reset();
        console.log('🎬 Performance recording STARTED');
        console.log('  Run perf.stopRecording() when done');
        return 'Recording started...';
      },
      stopRecording: () => {
        const startTime = (window as any).perfRecordingStart;
        if (!startTime) {
          console.log('❌ No recording in progress. Run perf.startRecording() first.');
          return 'No recording to stop';
        }
        
        const duration = (Date.now() - startTime) / 1000;
        const metrics = performanceMonitor.getMetrics();
        
        console.log(`🏁 Performance recording STOPPED (${duration.toFixed(1)}s)`);
        console.log('');
        console.log('📊 RECORDING RESULTS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        if (metrics.length === 0) {
          console.log('✅ No components tracked during recording');
          return 'No data recorded';
        }
        
        // Sort by renders per second (like React DevTools)
        const rankedComponents = metrics.map(m => ({
          name: m.componentName,
          totalRenders: m.renderCount,
          rendersPerSec: Math.round((m.renderCount / duration) * 10) / 10,
          avgTime: Math.round(m.averageRenderTime * 100) / 100,
          maxTime: Math.round(m.maxRenderTime * 100) / 100
        })).sort((a, b) => b.rendersPerSec - a.rendersPerSec);
        
        rankedComponents.forEach((comp, index) => {
          const emoji = comp.rendersPerSec > 10 ? '🚨' : comp.rendersPerSec > 5 ? '⚠️' : '✅';
          console.log(`${emoji} ${index + 1}. ${comp.name}`);
          console.log(`   ${comp.rendersPerSec}/sec | ${comp.totalRenders} total | ${comp.avgTime}ms avg | ${comp.maxTime}ms max`);
        });
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Generate agent-ready report
        const issues = rankedComponents.filter(c => c.rendersPerSec > 5);
        if (issues.length > 0) {
          const agentReport = [
            '🚨 REACT PERFORMANCE ISSUES:',
            '',
            ...issues.map(c => `${c.name}: ${c.rendersPerSec}/sec (${c.totalRenders} renders in ${duration.toFixed(1)}s)`),
            '',
            'Fix excessive re-renders using React.memo, useCallback, useMemo.'
          ].join('\n');
          
          console.log('📋 Agent-ready report:');
          console.log(agentReport);
          
          // Try to copy to clipboard
          navigator.clipboard.writeText(agentReport).catch(() => {
            console.log('💡 Copy the agent report above to share with AI assistants');
          });
        }
        
        delete (window as any).perfRecordingStart;
        return rankedComponents;
      }
    };
    
    console.log('🚀 Performance Monitor Active - Use HOTKEYS or perf.debug()');
  }

  return performanceMonitor;
};

export const presets = {
  development: () => setupPerformanceMonitoring(developmentConfig),
  production: () => setupPerformanceMonitoring(productionConfig),
  debugging: () => setupPerformanceMonitoring({
    ...developmentConfig,
    maxRendersPerSecond: 5,
    warningThreshold: 3,
    enableConsoleLogging: true
  })
}; 