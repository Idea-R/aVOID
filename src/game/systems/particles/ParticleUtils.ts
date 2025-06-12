export class ParticleUtils {
  /**
   * Calculate optimal particle count based on device capabilities and current load
   */
  static calculateOptimalParticleCount(baseCount: number, isMobile: boolean, currentLoad: number): number {
    let optimizedCount = isMobile ? Math.floor(baseCount * 0.6) : baseCount;
    if (currentLoad > 0.8) optimizedCount = Math.floor(optimizedCount * 0.5);
    else if (currentLoad > 0.6) optimizedCount = Math.floor(optimizedCount * 0.75);
    return Math.max(1, optimizedCount);
  }

  /**
   * Advanced device capability detection for better performance scaling
   */
  static getDeviceCapabilities(): {
    isMobile: boolean;
    isLowEnd: boolean;
    memoryLevel: 'low' | 'medium' | 'high';
    gpuLevel: 'low' | 'medium' | 'high';
    batteryLevel: 'unknown' | 'low' | 'medium' | 'high';
  } {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     window.innerWidth < 768;
    
    // Memory detection
    const nav = navigator as any;
    const deviceMemory = nav.deviceMemory || 2; // Default to 2GB if unknown
    const memoryLevel = deviceMemory < 2 ? 'low' : deviceMemory < 4 ? 'medium' : 'high';
    
    // Hardware concurrency (CPU cores)
    const cores = nav.hardwareConcurrency || 2;
    const isLowEnd = cores < 4 || deviceMemory < 2;
    
    // GPU detection (basic heuristic)
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    let gpuLevel: 'low' | 'medium' | 'high' = 'medium';
    
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
      
      if (renderer.toLowerCase().includes('intel') || renderer.toLowerCase().includes('software')) {
        gpuLevel = 'low';
      } else if (renderer.toLowerCase().includes('nvidia') || renderer.toLowerCase().includes('amd')) {
        gpuLevel = 'high';
      }
    }
    
    // Battery detection (if available)
    let batteryLevel: 'unknown' | 'low' | 'medium' | 'high' = 'unknown';
    if ('getBattery' in navigator) {
      // Note: Battery API is deprecated but still available in some browsers
      try {
        (navigator as any).getBattery().then((battery: any) => {
          if (battery.level < 0.2) batteryLevel = 'low';
          else if (battery.level < 0.5) batteryLevel = 'medium';
          else batteryLevel = 'high';
        });
      } catch (e) {
        // Silently fail if battery API not available
      }
    }
    
    return { isMobile, isLowEnd, memoryLevel, gpuLevel, batteryLevel };
  }

  /**
   * Get color variation for particle diversity
   */
  static getParticleColorVariation(baseColor: string, variation: number): string {
    const hex = baseColor.replace('#', '');
    let r = parseInt(hex.substr(0, 2), 16), g = parseInt(hex.substr(2, 2), 16), b = parseInt(hex.substr(4, 2), 16);
    const v = Math.floor(variation * 255);
    r = Math.max(0, Math.min(255, r + (Math.random() - 0.5) * v));
    g = Math.max(0, Math.min(255, g + (Math.random() - 0.5) * v));
    b = Math.max(0, Math.min(255, b + (Math.random() - 0.5) * v));
    return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
  }

  /**
   * Optimize particle lifetime based on performance mode
   */
  static optimizeParticleLifetime(baseLifetime: number, performanceMode: boolean): number {
    return performanceMode ? Math.floor(baseLifetime * 0.7) : baseLifetime;
  }

  /**
   * Create particle distribution patterns
   */
  static createParticleDistributionPattern(count: number, pattern: 'circle' | 'burst' | 'line'): Array<{angle: number, velocity: number}> {
    const distribution: Array<{angle: number, velocity: number}> = [];
    for (let i = 0; i < count; i++) {
      switch (pattern) {
        case 'circle': distribution.push({ angle: (Math.PI * 2 * i) / count, velocity: 1 + Math.random() * 2 }); break;
        case 'burst': distribution.push({ angle: Math.random() * Math.PI * 2, velocity: 2 + Math.random() * 4 }); break;
        case 'line': distribution.push({ angle: Math.PI + ((i / (count - 1)) - 0.5) * Math.PI * 0.5, velocity: 1 + Math.random() * 3 }); break;
      }
    }
    return distribution;
  }

  /**
   * Calculate particle fade based on distance from camera/center
   */
  static calculateDistanceFade(particleX: number, particleY: number, centerX: number, centerY: number, maxDistance: number): number {
    return Math.max(0, 1 - (Math.sqrt((particleX - centerX) ** 2 + (particleY - centerY) ** 2) / maxDistance));
  }

  /**
   * Get performance-optimized particle settings with enhanced device detection
   */
  static getOptimizedParticleSettings(isMobile: boolean, currentFPS: number) {
    const capabilities = this.getDeviceCapabilities();
    const base = { 
      maxParticles: isMobile ? 150 : 300, 
      particleLifeMultiplier: 1.0, 
      particleSizeMultiplier: 1.0, 
      enableComplexEffects: true,
      renderQuality: 1.0
    };
    
    // Adjust based on memory level
    if (capabilities.memoryLevel === 'low') {
      base.maxParticles = Math.floor(base.maxParticles * 0.5);
      base.particleLifeMultiplier = 0.6;
      base.enableComplexEffects = false;
      base.renderQuality = 0.7;
    } else if (capabilities.memoryLevel === 'medium') {
      base.maxParticles = Math.floor(base.maxParticles * 0.75);
      base.particleLifeMultiplier = 0.8;
      base.renderQuality = 0.85;
    }
    
    // Adjust based on GPU level
    if (capabilities.gpuLevel === 'low') {
      base.maxParticles = Math.floor(base.maxParticles * 0.6);
      base.enableComplexEffects = false;
      base.renderQuality = 0.6;
    }
    
    // FPS-based dynamic adjustments
    if (currentFPS < 30) {
      return { 
        ...base, 
        maxParticles: Math.floor(base.maxParticles * 0.4), 
        particleLifeMultiplier: 0.5, 
        particleSizeMultiplier: 0.7, 
        enableComplexEffects: false,
        renderQuality: 0.5
      };
    }
    
    if (currentFPS < 45) {
      return { 
        ...base, 
        maxParticles: Math.floor(base.maxParticles * 0.7), 
        particleLifeMultiplier: 0.75, 
        particleSizeMultiplier: 0.85, 
        enableComplexEffects: !isMobile,
        renderQuality: 0.75
      };
    }
    
    return base;
  }

  /**
   * Create smooth particle interpolation for animation
   */
  static interpolateParticlePosition(startX: number, startY: number, endX: number, endY: number, progress: number, easing: 'linear' | 'easeOut' | 'easeIn' | 'bounce' = 'linear') {
    let p = progress;
    if (easing === 'easeOut') p = 1 - Math.pow(1 - progress, 2);
    else if (easing === 'easeIn') p = progress * progress;
    else if (easing === 'bounce') p = progress < 0.5 ? 2 * progress * progress : 1 - 2 * (1 - progress) * (1 - progress);
    return { x: startX + (endX - startX) * p, y: startY + (endY - startY) * p };
  }

  /**
   * Calculate particle collision bounds for optimization
   */
  static getParticleBounds(particles: Array<{x: number, y: number, size: number}>) {
    if (particles.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    let minX = particles[0].x - particles[0].size, minY = particles[0].y - particles[0].size;
    let maxX = particles[0].x + particles[0].size, maxY = particles[0].y + particles[0].size;
    for (let i = 1; i < particles.length; i++) {
      const p = particles[i];
      minX = Math.min(minX, p.x - p.size); minY = Math.min(minY, p.y - p.size);
      maxX = Math.max(maxX, p.x + p.size); maxY = Math.max(maxY, p.y + p.size);
    }
    return { minX, minY, maxX, maxY };
  }

  /**
   * Convert milliseconds to frame count (assuming 60 FPS)
   */
  static msToFrames(ms: number, fps: number = 60): number { return Math.floor(ms / (1000 / fps)); }

  /**
   * Convert frame count to milliseconds (assuming 60 FPS)
   */
  static framesToMs(frames: number, fps: number = 60): number { return frames * (1000 / fps); }

  /**
   * Check if particle is visible within viewport bounds
   */
  static isParticleVisible(pX: number, pY: number, pSize: number, vX: number, vY: number, vW: number, vH: number): boolean {
    return !(pX + pSize < vX || pX - pSize > vX + vW || pY + pSize < vY || pY - pSize > vY + vH);
  }

  /**
   * Generate random particle spawn positions in a shape
   */
  static generateSpawnPositions(count: number, shape: 'circle' | 'rectangle' | 'ring', bounds: { x: number, y: number, width?: number, height?: number, radius?: number, innerRadius?: number }) {
    const positions = [];
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      if (shape === 'circle') {
        const angle = Math.random() * Math.PI * 2, radius = Math.random() * (bounds.radius || 50);
        x = bounds.x + Math.cos(angle) * radius; y = bounds.y + Math.sin(angle) * radius;
      } else if (shape === 'rectangle') {
        x = bounds.x + Math.random() * (bounds.width || 100); y = bounds.y + Math.random() * (bounds.height || 100);
      } else if (shape === 'ring') {
        const angle = Math.random() * Math.PI * 2, inner = bounds.innerRadius || 20, outer = bounds.radius || 50;
        const radius = inner + Math.random() * (outer - inner);
        x = bounds.x + Math.cos(angle) * radius; y = bounds.y + Math.sin(angle) * radius;
      } else { x = bounds.x; y = bounds.y; }
      positions.push({ x, y });
    }
    return positions;
  }
}