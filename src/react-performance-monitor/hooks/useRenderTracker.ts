import { useEffect, useRef } from 'react';
import { performanceMonitor } from '../core/PerformanceMonitor';

/**
 * Hook to track render performance of a component
 * @param componentName - Name to identify the component
 * @param enabled - Whether tracking is enabled (default: true)
 */
export function useRenderTracker(componentName: string, enabled: boolean = true) {
  const renderStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);
  const isMounted = useRef<boolean>(false);

  // Track render start time
  renderStartTime.current = performance.now();
  renderCount.current++;

  useEffect(() => {
    if (!enabled) return;

    const renderEndTime = performance.now();
    const renderTime = renderEndTime - renderStartTime.current;
    const phase = isMounted.current ? 'update' : 'mount';
    
    // Track the render
    performanceMonitor.trackRender(
      componentName,
      phase,
      renderTime,
      renderTime,
      renderStartTime.current,
      renderEndTime
    );

    isMounted.current = true;
  });

  return {
    renderCount: renderCount.current,
    lastRenderTime: performance.now() - renderStartTime.current
  };
}

/**
 * Hook to track expensive operations within components
 * @param operationName - Name of the operation being tracked
 */
export function useOperationTracker(operationName: string) {
  const trackOperation = (operation: () => void | Promise<void>) => {
    const startTime = performance.now();
    
    try {
      const result = operation();
      
      if (result instanceof Promise) {
        return result.finally(() => {
          const endTime = performance.now();
          performanceMonitor.trackRender(
            operationName,
            'update',
            endTime - startTime,
            endTime - startTime,
            startTime,
            endTime
          );
        });
      } else {
        const endTime = performance.now();
        performanceMonitor.trackRender(
          operationName,
          'update',
          endTime - startTime,
          endTime - startTime,
          startTime,
          endTime
        );
        return result;
      }
    } catch (error) {
      const endTime = performance.now();
      performanceMonitor.trackRender(
        `${operationName} (ERROR)`,
        'update',
        endTime - startTime,
        endTime - startTime,
        startTime,
        endTime
      );
      throw error;
    }
  };

  return trackOperation;
} 