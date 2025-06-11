import { PerformanceConfig } from '../types/PerformanceTypes';

export const defaultConfig: PerformanceConfig = {
  enabled: process.env.NODE_ENV === 'development',
  environment: 'auto',
  
  // Thresholds - these are sensible defaults for most React apps
  maxRendersPerSecond: 60,
  maxRenderTime: 16, // 60fps = 16.67ms per frame
  warningThreshold: 10, // Warn after 10 renders in short time
  
  // Logging
  enableConsoleLogging: true,
  enableWarnings: true,
  enableMetrics: true,
  logLevel: 'warn',
  
  // Storage
  enableLocalStorage: false,
  storageKey: 'react-performance-monitor',
  maxStoredSnapshots: 100,
  
  // Features
  trackMemoryUsage: true,
  trackFPS: true,
  enableHotSpots: true,
  enableRenderProfiling: true,
  
  // UI
  showWidget: false, // Disabled by default to avoid clutter
  widgetPosition: 'bottom-right',
  
  // Callbacks - undefined by default, users can override
  onExcessiveRenders: undefined,
  onPerformanceSnapshot: undefined,
  onWarning: undefined,
};

// Environment-specific overrides
export const developmentConfig: Partial<PerformanceConfig> = {
  enabled: true,
  enableConsoleLogging: true,
  enableWarnings: true,
  logLevel: 'debug',
  showWidget: true,
};

export const productionConfig: Partial<PerformanceConfig> = {
  enabled: false,
  enableConsoleLogging: false,
  enableWarnings: false,
  logLevel: 'silent',
  showWidget: false,
  enableLocalStorage: false,
};

export const testingConfig: Partial<PerformanceConfig> = {
  enabled: true,
  enableConsoleLogging: false,
  enableWarnings: false,
  logLevel: 'silent',
  showWidget: false,
}; 