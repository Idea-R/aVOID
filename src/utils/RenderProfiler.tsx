import React, { Profiler } from 'react';

interface RenderProfilerProps {
  id: string;
  children: React.ReactNode;
  enabled?: boolean;
}

let renderCounts: { [key: string]: number } = {};
let lastLogTime = Date.now();

const onRenderCallback = (
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number
) => {
  // SEND DATA TO NEW PERFORMANCE MONITOR
  try {
    // Try to access the new performance monitor if available
    if (typeof window !== 'undefined' && (window as any).performanceMonitor) {
      (window as any).performanceMonitor.trackRender(id, phase, actualDuration, baseDuration, startTime, commitTime);
    }
  } catch (error) {
    // Silently fail if new monitor not available
  }

  // Initialize render count if not exists
  if (!renderCounts[id]) {
    renderCounts[id] = 0;
  }
  
  renderCounts[id]++;
  
  // Log excessive renders (more than 5 renders per second)
  const now = Date.now();
  if (renderCounts[id] > 5 && now - lastLogTime > 1000) {
    console.warn(`🚨 EXCESSIVE RENDERS: ${id} has rendered ${renderCounts[id]} times`, {
      phase,
      actualDuration: `${actualDuration.toFixed(2)}ms`,
      baseDuration: `${baseDuration.toFixed(2)}ms`,
      renderCount: renderCounts[id]
    });
    
    // Reset counts every 5 seconds to prevent spam
    if (now - lastLogTime > 5000) {
      console.log('📊 RENDER STATS RESET:', renderCounts);
      renderCounts = {};
      lastLogTime = now;
    }
  }
};

export function RenderProfiler({ id, children, enabled = process.env.NODE_ENV === 'development' }: RenderProfilerProps) {
  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <Profiler id={id} onRender={onRenderCallback}>
      {children}
    </Profiler>
  );
}

// Helper function to get current render stats
export function getRenderStats() {
  return { ...renderCounts };
}

// Helper function to reset render stats
export function resetRenderStats() {
  renderCounts = {};
  lastLogTime = Date.now();
  console.log('🔄 Render stats reset');
}

export default RenderProfiler; 