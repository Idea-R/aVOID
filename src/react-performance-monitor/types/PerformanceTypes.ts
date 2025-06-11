export interface ComponentMetric {
  componentName: string;
  renderCount: number;
  totalRenderTime: number;
  averageRenderTime: number;
  lastRenderTime: number;
  maxRenderTime: number;
  minRenderTime: number;
  firstRenderTime: number;
  mountTime?: number;
  updateTime?: number;
  isProblematic: boolean;
  warnings: string[];
}

export interface CulpritData {
  component: string;
  renders: number;
  avgMs: number;
  maxMs: number;
  warnings: string[];
}

export interface RenderEvent {
  componentName: string;
  phase: 'mount' | 'update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
  timestamp: number;
}

export interface PerformanceSnapshot {
  timestamp: number;
  totalComponents: number;
  totalRenders: number;
  averageRenderTime: number;
  problematicComponents: string[];
  topRenderingComponents: ComponentMetric[];
  memoryUsage?: MemoryInfo;
  fpsEstimate?: number;
}

export interface PerformanceConfig {
  enabled: boolean;
  environment: 'development' | 'production' | 'auto';
  
  // Thresholds
  maxRendersPerSecond: number;
  maxRenderTime: number;
  warningThreshold: number;
  
  // Logging
  enableConsoleLogging: boolean;
  enableWarnings: boolean;
  enableMetrics: boolean;
  logLevel: 'silent' | 'error' | 'warn' | 'info' | 'debug';
  
  // Storage
  enableLocalStorage: boolean;
  storageKey: string;
  maxStoredSnapshots: number;
  
  // Features
  trackMemoryUsage: boolean;
  trackFPS: boolean;
  enableHotSpots: boolean;
  enableRenderProfiling: boolean;
  
  // UI
  showWidget: boolean;
  widgetPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  
  // Reporting
  onExcessiveRenders?: (metric: ComponentMetric) => void;
  onPerformanceSnapshot?: (snapshot: PerformanceSnapshot) => void;
  onWarning?: (componentName: string, warning: string) => void;
}

export interface PerformanceMetrics {
  components: Map<string, ComponentMetric>;
  renderEvents: RenderEvent[];
  snapshots: PerformanceSnapshot[];
  startTime: number;
  isRecording: boolean;
}

export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export interface FPSTracker {
  fps: number;
  samples: number[];
  lastTime: number;
} 