// Universal React Performance Monitor
// A drop-in performance monitoring solution for React applications

export { PerformanceMonitor, performanceMonitor } from './core/PerformanceMonitor';
export { RenderProfiler, withRenderProfiler } from './components/RenderProfiler';
export { useRenderTracker, useOperationTracker } from './hooks/useRenderTracker';
export { default as AgentExporter } from './utils/AgentExporter';

// Types
export type {
  PerformanceMetrics,
  PerformanceConfig,
  ComponentMetric,
  RenderEvent,
  PerformanceSnapshot,
  CulpritData
} from './types/PerformanceTypes';

// Configuration
export { defaultConfig, developmentConfig, productionConfig } from './config/defaultConfig';

// Quick setup function for easy integration
export { setupPerformanceMonitoring, presets } from './setup/quickSetup'; 