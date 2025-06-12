import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, Zap, Gauge, Wifi, Battery } from 'lucide-react';

interface MobileTestDashboardProps {
  isVisible: boolean;
}

interface DeviceMetrics {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  screenSize: { width: number; height: number };
  pixelRatio: number;
  orientation: 'portrait' | 'landscape';
  touchSupported: boolean;
  batteryLevel?: number;
  networkType?: string;
  memory?: number;
  cores?: number;
  performanceScore: number;
  uiMode: 'Simple' | 'Full' | 'Auto';
}

export default function MobileTestDashboard({ isVisible }: MobileTestDashboardProps) {
  const [metrics, setMetrics] = useState<DeviceMetrics | null>(null);
  const [fps, setFps] = useState<number>(0);
  const [testResults, setTestResults] = useState<{
    touchResponse: 'excellent' | 'good' | 'poor';
    uiScaling: 'excellent' | 'good' | 'poor';
    performance: 'excellent' | 'good' | 'poor';
    batteryImpact: 'low' | 'medium' | 'high';
  } | null>(null);

  useEffect(() => {
    if (!isVisible) return;

    const detectDevice = async (): Promise<DeviceMetrics> => {
      const nav = navigator as any;
      
      // Device type detection
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isTablet = window.innerWidth >= 768 && window.innerWidth <= 1024;
      const deviceType = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';
      
      // Screen metrics
      const screenSize = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      
      const pixelRatio = window.devicePixelRatio || 1;
      const orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
      const touchSupported = 'ontouchstart' in window;
      
      // Battery API (if available)
      let batteryLevel: number | undefined;
      try {
        if ('getBattery' in navigator) {
          const battery = await (navigator as any).getBattery();
          batteryLevel = battery.level * 100;
        }
      } catch (e) {
        // Battery API not available
      }
      
      // Network type
      const networkType = (nav.connection?.effectiveType) || 'unknown';
      
      // Device capabilities
      const memory = nav.deviceMemory;
      const cores = nav.hardwareConcurrency;
      
      // Performance score calculation
      let performanceScore = 100;
      if (deviceType === 'mobile') performanceScore -= 20;
      if (memory && memory < 2) performanceScore -= 30;
      if (cores && cores < 4) performanceScore -= 20;
      if (pixelRatio > 2) performanceScore -= 10;
      if (networkType === 'slow-2g' || networkType === '2g') performanceScore -= 20;
      
      // Determine UI mode based on our detection logic
      const uiMode = deviceType === 'mobile' ? 'Simple' : 'Full';
      
      return {
        deviceType,
        screenSize,
        pixelRatio,
        orientation,
        touchSupported,
        batteryLevel,
        networkType,
        memory,
        cores,
        performanceScore: Math.max(0, performanceScore),
        uiMode
      };
    };

    const runTests = () => {
      // Touch response test
      const touchResponse = metrics?.touchSupported && metrics.deviceType === 'mobile' ? 'excellent' : 'good';
      
      // UI scaling test
      const uiScaling = metrics?.screenSize.width && metrics.screenSize.width < 480 ? 'excellent' : 
                       metrics?.screenSize.width && metrics.screenSize.width < 768 ? 'good' : 'excellent';
      
      // Performance test
      const performance = fps > 45 ? 'excellent' : fps > 30 ? 'good' : 'poor';
      
      // Battery impact test
      const batteryImpact = metrics?.performanceScore && metrics.performanceScore > 70 ? 'low' : 
                           metrics?.performanceScore && metrics.performanceScore > 40 ? 'medium' : 'high';
      
      setTestResults({ touchResponse, uiScaling, performance, batteryImpact });
    };

    const measureFPS = () => {
      let frames = 0;
      let lastTime = performance.now();
      
      const loop = (currentTime: number) => {
        frames++;
        if (currentTime >= lastTime + 1000) {
          setFps(Math.round((frames * 1000) / (currentTime - lastTime)));
          frames = 0;
          lastTime = currentTime;
        }
        if (isVisible) requestAnimationFrame(loop);
      };
      
      requestAnimationFrame(loop);
    };

    detectDevice().then(setMetrics);
    measureFPS();
    
    const testInterval = setInterval(runTests, 2000);
    return () => clearInterval(testInterval);
  }, [isVisible, metrics, fps]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getTestResultColor = (result: string) => {
    if (result === 'excellent' || result === 'low') return 'text-green-400';
    if (result === 'good' || result === 'medium') return 'text-yellow-400';
    return 'text-red-400';
  };

  if (!isVisible || !metrics) return null;

  return (
    <div className="fixed top-4 left-4 bg-gray-900/95 border border-cyan-500 rounded-lg p-4 text-white text-sm max-w-sm z-50">
      <div className="flex items-center gap-2 mb-3">
        <Smartphone className="w-4 h-4 text-cyan-400" />
        <h3 className="font-bold text-cyan-300">Mobile Test Dashboard</h3>
      </div>
      
      {/* Device Info */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <span className="text-gray-300">Device:</span>
          <span className="capitalize">{metrics.deviceType}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Screen:</span>
          <span>{metrics.screenSize.width}×{metrics.screenSize.height}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Pixel Ratio:</span>
          <span>{metrics.pixelRatio}x</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">UI Mode:</span>
          <span className="text-cyan-400">{metrics.uiMode}</span>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1">
            <Gauge className="w-3 h-3 text-cyan-400" />
            <span className="text-gray-300">Performance:</span>
          </div>
          <span className={getScoreColor(metrics.performanceScore)}>
            {metrics.performanceScore}/100
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">FPS:</span>
          <span className={getScoreColor(fps * 1.67)}>{fps}</span>
        </div>
        {metrics.memory && (
          <div className="flex justify-between">
            <span className="text-gray-300">Memory:</span>
            <span>{metrics.memory}GB</span>
          </div>
        )}
        {metrics.cores && (
          <div className="flex justify-between">
            <span className="text-gray-300">CPU Cores:</span>
            <span>{metrics.cores}</span>
          </div>
        )}
      </div>

      {/* Battery & Network */}
      <div className="space-y-2 mb-4">
        {metrics.batteryLevel && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <Battery className="w-3 h-3 text-cyan-400" />
              <span className="text-gray-300">Battery:</span>
            </div>
            <span>{Math.round(metrics.batteryLevel)}%</span>
          </div>
        )}
        {metrics.networkType && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <Wifi className="w-3 h-3 text-cyan-400" />
              <span className="text-gray-300">Network:</span>
            </div>
            <span className="capitalize">{metrics.networkType}</span>
          </div>
        )}
      </div>

      {/* Test Results */}
      {testResults && (
        <div className="space-y-2 border-t border-gray-700 pt-3">
          <h4 className="text-cyan-300 font-semibold">Test Results:</h4>
          <div className="flex justify-between">
            <span className="text-gray-300">Touch Response:</span>
            <span className={getTestResultColor(testResults.touchResponse)}>
              {testResults.touchResponse}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">UI Scaling:</span>
            <span className={getTestResultColor(testResults.uiScaling)}>
              {testResults.uiScaling}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Performance:</span>
            <span className={getTestResultColor(testResults.performance)}>
              {testResults.performance}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Battery Impact:</span>
            <span className={getTestResultColor(testResults.batteryImpact)}>
              {testResults.batteryImpact}
            </span>
          </div>
        </div>
      )}
    </div>
  );
} 