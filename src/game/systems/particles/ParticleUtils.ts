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
   * Get performance-optimized particle settings
   */
  static getOptimizedParticleSettings(isMobile: boolean, currentFPS: number) {
    const base = { maxParticles: isMobile ? 150 : 300, particleLifeMultiplier: 1.0, particleSizeMultiplier: 1.0, enableComplexEffects: true };
    if (currentFPS < 30) return { ...base, maxParticles: Math.floor(base.maxParticles * 0.5), particleLifeMultiplier: 0.7, particleSizeMultiplier: 0.8, enableComplexEffects: false };
    if (currentFPS < 45) return { ...base, maxParticles: Math.floor(base.maxParticles * 0.75), particleLifeMultiplier: 0.85, particleSizeMultiplier: 0.9, enableComplexEffects: !isMobile };
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