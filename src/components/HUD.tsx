import React from 'react';
import { PerformanceMetrics } from '../game/utils/PerformanceMonitor';

interface HUDProps {
  score: number;
  time: number;
  fps: number;
  meteors?: number;
  particles?: number;
  poolSizes?: { meteors: number; particles: number };
  performance?: PerformanceMetrics;
}

export default function HUD({ score, time, fps, meteors = 0, particles = 0, poolSizes, performance }: HUDProps) {
  const getFPSColor = (fps: number) => {
    if (fps >= 55) return 'text-green-400';
    if (fps >= 45) return 'text-yellow-400';
    if (fps >= 30) return 'text-orange-400';
    return 'text-red-400';
  };

  const getPerformanceColor = (current: number, max: number) => {
    const ratio = current / max;
    if (ratio < 0.5) return 'text-green-400';
    if (ratio < 0.8) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 0.8) return 'text-green-400';
    if (quality >= 0.6) return 'text-yellow-400';
    if (quality >= 0.4) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="absolute top-4 left-4 flex flex-col gap-2 text-cyan-500 font-mono text-sm">
      <div className="flex gap-6">
        <div>Score: {score}</div>
        <div>Time: {Math.floor(time)}s</div>
        <div className={`${getFPSColor(fps)}`}>FPS: {fps}</div>
      </div>
      
      <div className="flex gap-6 text-xs opacity-80">
        <div className={getPerformanceColor(meteors, 50)}>
          Meteors: {meteors}/50
        </div>
        <div className={getPerformanceColor(particles, 300)}>
          Particles: {particles}/300
        </div>
        {poolSizes && (
          <div className="text-blue-400">
            Pool: M{poolSizes.meteors} P{poolSizes.particles}
          </div>
        )}
      </div>

      {performance && (
        <div className="flex gap-6 text-xs opacity-70">
          <div className={getQualityColor(performance.qualityLevel)}>
            Quality: {Math.round(performance.qualityLevel * 100)}%
          </div>
          <div className="text-purple-400">
            Render: {performance.renderTime.toFixed(1)}ms
          </div>
          <div className="text-purple-400">
            Update: {performance.updateTime.toFixed(1)}ms
          </div>
        </div>
      )}
      
      <div className="text-xs text-yellow-400 opacity-80">
        Double-click to use knockback power when available
      </div>
      
      {performance && performance.qualityLevel < 1.0 && (
        <div className="text-xs text-orange-400 opacity-90">
          Performance mode active - effects reduced
        </div>
      )}
    </div>
  );
}