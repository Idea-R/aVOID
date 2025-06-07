interface GradientCacheEntry {
  gradient: CanvasGradient;
  timestamp: number;
}

export class RenderUtils {
  private ctx: CanvasRenderingContext2D;
  
  // Gradient caching system
  private gradientCache: Map<string, GradientCacheEntry> = new Map();
  private cacheEnabled: boolean = true;
  private maxCacheSize: number = 200;
  private cacheCleanupInterval: number = 5000; // 5 seconds
  private lastCacheCleanup: number = 0;
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private lastPerformanceLog: number = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    
    // Listen for canvas resize to clear cache
    window.addEventListener('resize', this.handleCanvasResize);
  }

  private handleCanvasResize = (): void => {
    try {
      this.clearGradientCache();
    } catch (error) {
      console.warn('Error clearing gradient cache on resize:', error);
    }
  };

  /**
   * Convert hex color to rgba with alpha
   */
  public hexToRgba(hex: string, alpha: number): string {
    // Handle HSL colors
    if (hex.startsWith('hsl')) {
      // Extract HSL values and convert to rgba
      const hslMatch = hex.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
      if (hslMatch) {
        const h = parseInt(hslMatch[1]);
        const s = parseInt(hslMatch[2]) / 100;
        const l = parseInt(hslMatch[3]) / 100;
        
        const rgb = this.hslToRgb(h, s, l);
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
      }
    }
    
    // Handle hex colors
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      const r = parseInt(result[1], 16);
      const g = parseInt(result[2], 16);
      const b = parseInt(result[3], 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    // Fallback to original color with alpha
    return hex.replace(/rgb\(([^)]+)\)/, `rgba($1, ${alpha})`);
  }

  /**
   * Convert HSL to RGB
   */
  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    h /= 360;
    
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  /**
   * Create meteor gradient with caching
   */
  public createMeteorGradient(x: number, y: number, radius: number, color: string, isSuper: boolean = false): CanvasGradient {
    // Always create gradient directly with current position
    // Note: Gradient caching disabled due to position-dependent nature of radial gradients
    return this.createGradientInternal(x, y, radius, color, isSuper);
  }

  /**
   * Internal gradient creation method
   */
  private createGradientInternal(x: number, y: number, radius: number, color: string, isSuper: boolean): CanvasGradient {
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius * 2);
    
    if (isSuper) {
      gradient.addColorStop(0, '#fff');
      gradient.addColorStop(0.2, '#fff');
      gradient.addColorStop(0.4, color);
      gradient.addColorStop(0.6, color.replace(/,\s*[\d.]+\)$/, ', 0.8)'));
      gradient.addColorStop(0.8, color.replace(/,\s*[\d.]+\)$/, ', 0.4)'));
      gradient.addColorStop(1, color.replace(/,\s*[\d.]+\)$/, ', 0)'));
    } else {
      gradient.addColorStop(0, '#fff');
      gradient.addColorStop(0.2, color);
      gradient.addColorStop(0.5, color.replace(/,\s*[\d.]+\)$/, ', 0.6)'));
      gradient.addColorStop(0.8, color.replace(/,\s*[\d.]+\)$/, ', 0.3)'));
      gradient.addColorStop(1, color.replace(/,\s*[\d.]+\)$/, ', 0)'));
    }
    
    return gradient;
  }

  /**
   * Generate cache key for gradient
   */
  private generateGradientCacheKey(radius: number, color: string, isSuper: boolean): string {
    // Round radius to reduce cache fragmentation while maintaining visual quality
    const roundedRadius = Math.round(radius * 2) / 2; // Round to nearest 0.5
    return `${roundedRadius}:${color}:${isSuper}`;
  }

  /**
   * Get gradient from cache
   */
  private getFromGradientCache(key: string): CanvasGradient | null {
    try {
      const entry = this.gradientCache.get(key);
      if (entry) {
        // Update timestamp for LRU tracking
        entry.timestamp = Date.now();
        this.cacheHits++;
        return entry.gradient;
      }
      this.cacheMisses++;
    } catch (error) {
      console.warn('Error retrieving from gradient cache:', error);
    }
    return null;
  }

  /**
   * Add gradient to cache
   */
  private addToGradientCache(key: string, gradient: CanvasGradient): void {
    try {
      // Prevent cache from growing too large
      if (this.gradientCache.size >= this.maxCacheSize) {
        this.cleanupOldestCacheEntries();
      }
      
      this.gradientCache.set(key, {
        gradient,
        timestamp: Date.now()
      });
    } catch (error) {
      console.warn('Error adding to gradient cache:', error);
    }
  }

  /**
   * Clean up oldest cache entries
   */
  private cleanupOldestCacheEntries(): void {
    try {
      // Remove oldest 25% of entries to make room
      const entries = Array.from(this.gradientCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const removeCount = Math.floor(entries.length * 0.25);
      for (let i = 0; i < removeCount; i++) {
        this.gradientCache.delete(entries[i][0]);
      }
    } catch (error) {
      console.warn('Error cleaning up gradient cache:', error);
    }
  }

  /**
   * Maintain gradient cache - call periodically
   */
  public maintainGradientCache(): void {
    try {
      const now = Date.now();
      
      // Periodic cache cleanup
      if (now - this.lastCacheCleanup > this.cacheCleanupInterval) {
        this.performCacheCleanup();
        this.lastCacheCleanup = now;
      }
      
      // Log performance metrics every 10 seconds
      if (now - this.lastPerformanceLog > 10000) {
        this.logCachePerformance();
        this.lastPerformanceLog = now;
      }
    } catch (error) {
      console.warn('Error maintaining gradient cache:', error);
    }
  }

  /**
   * Perform cache cleanup based on age
   */
  private performCacheCleanup(): void {
    try {
      const now = Date.now();
      const maxAge = 30000; // 30 seconds
      
      for (const [key, entry] of this.gradientCache.entries()) {
        if (now - entry.timestamp > maxAge) {
          this.gradientCache.delete(key);
        }
      }
    } catch (error) {
      console.warn('Error performing cache cleanup:', error);
    }
  }

  /**
   * Log cache performance metrics
   */
  private logCachePerformance(): void {
    try {
      const totalRequests = this.cacheHits + this.cacheMisses;
      if (totalRequests > 0) {
        const hitRatio = (this.cacheHits / totalRequests * 100).toFixed(1);
        console.log(`Gradient Cache Performance: ${hitRatio}% hit ratio (${this.cacheHits}/${totalRequests}), ${this.gradientCache.size} entries`);
      }
    } catch (error) {
      console.warn('Error logging cache performance:', error);
    }
  }

  /**
   * Clear gradient cache
   */
  public clearGradientCache(): void {
    try {
      this.gradientCache.clear();
      this.cacheHits = 0;
      this.cacheMisses = 0;
    } catch (error) {
      console.warn('Error clearing gradient cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { hits: number; misses: number; size: number; hitRatio: number } {
    const totalRequests = this.cacheHits + this.cacheMisses;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      size: this.gradientCache.size,
      hitRatio: totalRequests > 0 ? this.cacheHits / totalRequests : 0
    };
  }

  /**
   * Set cache enabled/disabled
   */
  public setCacheEnabled(enabled: boolean): void {
    this.cacheEnabled = enabled;
    if (!enabled) {
      this.clearGradientCache();
    }
  }

  /**
   * Update canvas context
   */
  public updateContext(ctx: CanvasRenderingContext2D): void {
    this.ctx = ctx;
    // Clear cache when context changes
    this.clearGradientCache();
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): {
    cacheStats: { hits: number; misses: number; size: number; hitRatio: number };
    cacheEnabled: boolean;
    maxCacheSize: number;
    cleanupInterval: number;
  } {
    return {
      cacheStats: this.getCacheStats(),
      cacheEnabled: this.cacheEnabled,
      maxCacheSize: this.maxCacheSize,
      cleanupInterval: this.cacheCleanupInterval
    };
  }

  /**
   * Configure cache settings
   */
  public configureCacheSettings(settings: {
    maxCacheSize?: number;
    cleanupInterval?: number;
    enabled?: boolean;
  }): void {
    if (settings.maxCacheSize !== undefined) {
      this.maxCacheSize = settings.maxCacheSize;
    }
    if (settings.cleanupInterval !== undefined) {
      this.cacheCleanupInterval = settings.cleanupInterval;
    }
    if (settings.enabled !== undefined) {
      this.setCacheEnabled(settings.enabled);
    }
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    try {
      window.removeEventListener('resize', this.handleCanvasResize);
      this.clearGradientCache();
    } catch (error) {
      console.warn('Error during RenderUtils cleanup:', error);
    }
  }
}