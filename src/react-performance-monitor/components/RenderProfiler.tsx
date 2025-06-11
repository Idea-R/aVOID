import React, { Profiler, ReactNode } from 'react';
import { performanceMonitor } from '../core/PerformanceMonitor';

interface RenderProfilerProps {
  id: string;
  children: ReactNode;
  enabled?: boolean;
  onRender?: (id: string, phase: 'mount' | 'update', actualDuration: number) => void;
}

export function RenderProfiler({ 
  id, 
  children, 
  enabled = true,
  onRender 
}: RenderProfilerProps) {
  
  const handleRender = (
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => {
    // Track in performance monitor
    performanceMonitor.trackRender(
      id, 
      phase, 
      actualDuration, 
      baseDuration, 
      startTime, 
      commitTime
    );
    
    // Call custom callback if provided
    if (onRender) {
      onRender(id, phase, actualDuration);
    }
  };

  // Don't wrap if disabled
  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <Profiler id={id} onRender={handleRender}>
      {children}
    </Profiler>
  );
}

// HOC version for class components or easier wrapping
export function withRenderProfiler<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const ProfiledComponent = (props: P) => (
    <RenderProfiler id={componentName || WrappedComponent.displayName || WrappedComponent.name || 'Unknown'}>
      <WrappedComponent {...props} />
    </RenderProfiler>
  );

  ProfiledComponent.displayName = `Profiled(${WrappedComponent.displayName || WrappedComponent.name})`;
  return ProfiledComponent;
} 