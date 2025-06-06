import { Meteor } from '../entities/Meteor';
import { Particle } from '../entities/Particle';
import { PowerUp } from '../entities/PowerUp';
import { ScoreText } from '../entities/ScoreText';

interface GameSettings {
  volume: number;
  soundEnabled: boolean;
  showUI: boolean;
  showFPS: boolean;
  showPerformanceStats: boolean;
  showTrails: boolean;
  cursorColor: string;
}

interface RenderState {
  mouseX: number;
  mouseY: number;
  activeMeteors: Meteor[];
  activeParticles: Particle[];
  powerUps: PowerUp[];
  scoreTexts: ScoreText[];
  playerTrail: Array<{ x: number; y: number; alpha: number }>;
  powerUpCharges: number;
  maxPowerUpCharges: number;
  isGameOver: boolean;
  playerRingPhase: number;
  screenShake: { x: number; y: number; intensity: number; duration: number };
  adaptiveTrailsActive: boolean;
  gameSettings: GameSettings;
}

interface ShadowGroup {
  blur: number;
  color: string;
  objects: Array<{
    type: 'meteor' | 'meteorTrail' | 'particle' | 'powerUp' | 'player' | 'playerTrail' | 'knockbackRing' | 'scoreText';
    data: any;
  }>;
}

interface GradientCacheEntry {
  gradient: CanvasGradient;
  timestamp: number;
}

export class RenderSystem {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private shadowsEnabled: boolean = true;
  private shadowGroups: Map<string, ShadowGroup> = new Map();
  private currentGameSettings?: GameSettings;
  
  // Gradient caching system
  private gradientCache: Map<string, GradientCacheEntry> = new Map();
  private cacheEnabled: boolean = true;
  private maxCacheSize: number = 200;
  private cacheCleanupInterval: number = 5000; // 5 seconds
  private lastCacheCleanup: number = 0;
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private lastPerformanceLog: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not get canvas context');
    this.ctx = context;
    
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

  render(state: RenderState): void {
    // Store current game settings for use in rendering
    this.currentGameSettings = state.gameSettings;
    
    this.ctx.save();
    this.ctx.translate(state.screenShake.x, state.screenShake.y);
    
    // Clear canvas with fade effect
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    this.ctx.fillRect(-state.screenShake.x, -state.screenShake.y, this.canvas.width, this.canvas.height);
    
    // Prepare shadow groups for batching
    this.prepareShadowGroups(state);
    
    this.ctx.globalCompositeOperation = 'lighter';
    
    // Render all shadow groups in batches
    this.renderShadowGroups();
    
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.restore();
    
    // Periodic cache maintenance
    this.maintainGradientCache();
  }

  private prepareShadowGroups(state: RenderState): void {
    this.shadowGroups.clear();

    // Group power-ups (shadow blur: 30, color: #ffd700)
    if (state.powerUps.length > 0) {
      this.addToShadowGroup('30:#ffd700', 30, '#ffd700', 
        state.powerUps.map(powerUp => ({ type: 'powerUp' as const, data: powerUp }))
      );
    }

    // Group meteor trails by shadow level (only if trails enabled)
    if (state.gameSettings.showTrails && state.adaptiveTrailsActive) {
      const regularTrails: any[] = [];
      const superTrails: any[] = [];

      state.activeMeteors.forEach(meteor => {
        if (!meteor.active || meteor.trail.length === 0) return;
        
        if (meteor.isSuper) {
          superTrails.push({ meteor, trail: meteor.trail });
        } else {
          regularTrails.push({ meteor, trail: meteor.trail });
        }
      });

      if (regularTrails.length > 0) {
        this.addToShadowGroup('12:meteor', 12, '', 
          regularTrails.map(data => ({ type: 'meteorTrail' as const, data }))
        );
      }

      if (superTrails.length > 0) {
        this.addToShadowGroup('20:meteor', 20, '', 
          superTrails.map(data => ({ type: 'meteorTrail' as const, data }))
        );
      }
    }

    // Group meteors by shadow level
    const regularMeteors = state.activeMeteors.filter(m => m.active && !m.isSuper);
    const superMeteors = state.activeMeteors.filter(m => m.active && m.isSuper);

    if (regularMeteors.length > 0) {
      this.addToShadowGroup('15:meteor', 15, '', 
        regularMeteors.map(meteor => ({ type: 'meteor' as const, data: meteor }))
      );
    }

    if (superMeteors.length > 0) {
      this.addToShadowGroup('25:meteor', 25, '', 
        superMeteors.map(meteor => ({ type: 'meteor' as const, data: meteor }))
      );
    }

    // Group player trail (shadow blur: 15, color: cursor color)
    if (state.playerTrail.length > 0) {
      const cursorColor = state.gameSettings.cursorColor || '#06b6d4';
      this.addToShadowGroup(`15:${cursorColor}`, 15, cursorColor, 
        [{ type: 'playerTrail' as const, data: state.playerTrail }]
      );
    }

    // Group knockback ring (shadow blur: 10, color: cursor color)
    if (state.powerUpCharges > 0) {
      const cursorColor = state.gameSettings.cursorColor || '#06b6d4';
      
      // Create multiple rings based on charge count
      const ringData = [];
      for (let i = 0; i < state.powerUpCharges; i++) {
        ringData.push({ 
          type: 'knockbackRing' as const, 
          data: { 
            x: state.mouseX, 
            y: state.mouseY, 
            phase: state.playerRingPhase, 
            ringIndex: i,
            totalRings: state.powerUpCharges
          } 
        });
      }
      
      this.addToShadowGroup(`10:${cursorColor}`, 10, cursorColor, ringData);
    }

    // Group player (shadow blur: 20, color: cursor color)
    if (!state.isGameOver) {
      const cursorColor = state.gameSettings.cursorColor || '#06b6d4';
      this.addToShadowGroup(`20:${cursorColor}`, 20, cursorColor, 
        [{ type: 'player' as const, data: { x: state.mouseX, y: state.mouseY } }]
      );
    }

    // Group particles (shadow blur: 8, dynamic colors)
    if (state.activeParticles.length > 0) {
      this.addToShadowGroup('8:particle', 8, '', 
        state.activeParticles.filter(p => p.active).map(particle => ({ type: 'particle' as const, data: particle }))
      );
    }

    // Group score texts (no shadow for performance)
    if (state.scoreTexts.length > 0) {
      this.addToShadowGroup('0:scoreText', 0, '', 
        state.scoreTexts.filter(st => st.active).map(scoreText => ({ type: 'scoreText' as const, data: scoreText }))
      );
    }
  }

  private addToShadowGroup(key: string, blur: number, color: string, objects: Array<{ type: any; data: any }>): void {
    if (!this.shadowGroups.has(key)) {
      this.shadowGroups.set(key, { blur, color, objects: [] });
    }
    this.shadowGroups.get(key)!.objects.push(...objects);
  }

  private renderShadowGroups(): void {
    // Skip shadow rendering if disabled by auto-scaling
    if (!this.shadowsEnabled) {
      // Render without shadows
      for (const groupKey of this.getRenderOrder()) {
        const group = this.shadowGroups.get(groupKey);
        if (!group || group.objects.length === 0) continue;

        // Render all objects in this group without shadows
        for (const obj of group.objects) {
          this.renderObject(obj, this.currentGameSettings);
        }
      }
      return;
    }

    // Render groups in optimal order (background to foreground)
    for (const groupKey of this.getRenderOrder()) {
      const group = this.shadowGroups.get(groupKey);
      if (!group || group.objects.length === 0) continue;

      // Set shadow properties once per group
      this.ctx.shadowBlur = group.blur;
      if (group.color) {
        this.ctx.shadowColor = group.color;
      }

      // Render all objects in this shadow group
      for (const obj of group.objects) {
        this.renderObject(obj, this.currentGameSettings);
      }

      // Reset shadow after each group
      this.ctx.shadowBlur = 0;
    }
  }

  private getRenderOrder(): string[] {
    const cursorColor = this.currentGameSettings?.cursorColor || '#06b6d4';
    return [
      '30:#ffd700',    // Power-ups (background glow)
      '12:meteor',     // Regular meteor trails
      '20:meteor',     // Super meteor trails
      '15:meteor',     // Regular meteors
      '25:meteor',     // Super meteors
      `15:${cursorColor}`,    // Player trail
      `10:${cursorColor}`,    // Knockback ring
      `20:${cursorColor}`,    // Player
     '8:particle',    // Particles
     '0:scoreText'    // Score texts (foreground, no shadow)
    ];
  }

  private renderObject(obj: { type: string; data: any }, gameSettings?: GameSettings): void {
    switch (obj.type) {
      case 'powerUp':
        this.drawPowerUp(obj.data);
        break;
      case 'meteorTrail':
        this.drawMeteorTrail(obj.data.meteor, obj.data.trail);
        break;
      case 'meteor':
        this.drawMeteor(obj.data);
        break;
      case 'playerTrail':
        this.drawPlayerTrail(obj.data, gameSettings?.cursorColor || '#06b6d4');
        break;
      case 'knockbackRing':
        this.drawKnockbackRing(obj.data.x, obj.data.y, obj.data.phase, gameSettings?.cursorColor || '#06b6d4', obj.data.ringIndex, obj.data.totalRings);
        break;
      case 'player':
        this.drawPlayer(obj.data.x, obj.data.y, gameSettings?.cursorColor || '#06b6d4');
        break;
      case 'particle':
        this.drawParticle(obj.data);
        break;
      case 'scoreText':
        this.drawScoreText(obj.data);
        break;
    }
  }

  private drawPowerUp(powerUp: PowerUp): void {
    this.ctx.save();
    
    // Apply breathing scale effect
    this.ctx.translate(powerUp.x, powerUp.y);
    this.ctx.scale(powerUp.breathingScale, powerUp.breathingScale);
    this.ctx.translate(-powerUp.x, -powerUp.y);
    
    // Draw collection trail if magnetic effect is active
    if (powerUp.magneticEffect.isActive && powerUp.collectionTrail.length > 0) {
      powerUp.collectionTrail.forEach((point, index) => {
        const progress = 1 - index / powerUp.collectionTrail.length;
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, 3 * progress, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(255, 215, 0, ${point.alpha * 0.6})`;
        this.ctx.fill();
      });
    }
    
    // Draw orbiting particles (cyan electrons)
    powerUp.orbitingParticles.forEach(particle => {
      const x = powerUp.x + Math.cos(particle.angle) * particle.distance;
      const y = powerUp.y + Math.sin(particle.angle) * particle.distance;
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, 3, 0, Math.PI * 2);
      this.ctx.fillStyle = '#06b6d4';
      this.ctx.shadowColor = '#06b6d4';
      this.ctx.shadowBlur = 8;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    });
    
    // Outer glow (uses current shadow settings)
    this.ctx.beginPath();
    this.ctx.arc(powerUp.x, powerUp.y, powerUp.radius * 2, 0, Math.PI * 2);
    this.ctx.fillStyle = `rgba(255, 215, 0, ${powerUp.glowIntensity * 0.3})`;
    this.ctx.fill();
    
    // Main power-up body (atomic nucleus)
    this.ctx.beginPath();
    this.ctx.arc(powerUp.x, powerUp.y, powerUp.radius, 0, Math.PI * 2);
    const gradient = this.ctx.createRadialGradient(
      powerUp.x, powerUp.y, 0,
      powerUp.x, powerUp.y, powerUp.radius
    );
    gradient.addColorStop(0, '#ffffff'); // Bright white core
    gradient.addColorStop(0.3, '#ffff80');
    gradient.addColorStop(0.7, '#ffd700');
    gradient.addColorStop(1, '#ffb000');
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
    
    // Core highlight (nucleus)
    this.ctx.beginPath();
    this.ctx.arc(powerUp.x, powerUp.y, powerUp.radius * 0.4, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.fill();
    
    // Sparkle particles around the power-up
    const sparkleCount = 6;
    for (let i = 0; i < sparkleCount; i++) {
      const angle = (powerUp.pulsePhase + i * Math.PI * 2 / sparkleCount) * 0.5;
      const distance = powerUp.radius * 2.5 + Math.sin(powerUp.pulsePhase * 2 + i) * 10;
      const x = powerUp.x + Math.cos(angle) * distance;
      const y = powerUp.y + Math.sin(angle) * distance;
      const alpha = 0.3 + Math.sin(powerUp.pulsePhase * 3 + i) * 0.3;
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, 2, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }

  private drawMeteorTrail(meteor: Meteor, trail: Array<{ x: number; y: number; alpha: number }>): void {
    const LOD_THRESHOLD_SQUARED = 300 * 300; // Distance threshold for LOD
    
    trail.forEach((point, index) => {
      const progress = 1 - index / trail.length;
      const trailRadius = meteor.radius * progress * (meteor.isSuper ? 1.8 : 1.3);
      
      // Calculate distance from player for LOD (assuming player is at center of screen)
      const playerX = this.canvas.width / 2;
      const playerY = this.canvas.height / 2;
      const dx = point.x - playerX;
      const dy = point.y - playerY;
      const distanceSquared = dx * dx + dy * dy;
      
      // Apply LOD: reduce alpha for distant trails
      let effectiveAlpha = progress;
      if (distanceSquared > LOD_THRESHOLD_SQUARED) {
        effectiveAlpha *= 0.3;
      }
      
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, trailRadius, 0, Math.PI * 2);
      
      // Use simple alpha-blended solid colors instead of gradients
      this.ctx.fillStyle = meteor.color.replace(/,\s*[\d.]+\)$/, `, ${effectiveAlpha})`);
      
      // Shadow color is set per meteor color (only if shadows enabled)
      if (this.shadowsEnabled) {
        this.ctx.shadowColor = meteor.color;
      }
      this.ctx.fill();
    });
  }

  private drawMeteor(meteor: Meteor): void {
    this.ctx.beginPath();
    this.ctx.arc(meteor.x, meteor.y, meteor.radius * (meteor.isSuper ? 1.8 : 1.3), 0, Math.PI * 2);
    this.ctx.fillStyle = meteor.gradient || meteor.color;
    
    // Shadow color is set per meteor color (only if shadows enabled)
    if (this.shadowsEnabled) {
      this.ctx.shadowColor = meteor.color;
    }
    this.ctx.fill();
  }

  private drawPlayerTrail(trail: Array<{ x: number; y: number; alpha: number }>, cursorColor: string): void {
    trail.forEach((point, index) => {
      const progress = 1 - index / trail.length;
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, 8 * progress, 0, Math.PI * 2);
      
      // Convert cursor color to rgba with alpha
      const color = this.hexToRgba(cursorColor, point.alpha * 0.7);
      this.ctx.fillStyle = color;
      this.ctx.fill();
    });
  }

  private drawKnockbackRing(x: number, y: number, phase: number, cursorColor: string, ringIndex: number = 0, totalRings: number = 1): void {
    // Multiple rings with different radii based on charge count
    const baseRadius = 15;
    const ringSpacing = 8;
    const ringRadius = baseRadius + (ringIndex * ringSpacing) + Math.sin(phase + ringIndex * 0.5) * 3;
    
    // Vary opacity based on ring index (inner rings brighter)
    const baseAlpha = 0.8 - (ringIndex * 0.2);
    const alpha = Math.max(0.3, baseAlpha + Math.sin(phase * 2 + ringIndex) * 0.2);
    
    this.ctx.beginPath();
    this.ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
    
    const color = this.hexToRgba(cursorColor, alpha);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 3 - (ringIndex * 0.5); // Thinner outer rings
    this.ctx.stroke();
  }

  private drawPlayer(x: number, y: number, cursorColor: string): void {
    this.ctx.beginPath();
    this.ctx.arc(x, y, 8, 0, Math.PI * 2);
    this.ctx.fillStyle = cursorColor;
    this.ctx.fill();
  }

  private drawParticle(particle: Particle): void {
    this.ctx.beginPath();
    this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = particle.color.replace(/,\s*[\d.]+\)$/, `, ${particle.alpha})`);
    
    // Shadow color is set per particle color (only if shadows enabled)
    if (this.shadowsEnabled) {
      this.ctx.shadowColor = particle.color;
    }
    this.ctx.fill();
  }

  private drawScoreText(scoreText: ScoreText): void {
    this.ctx.save();
    
    // Set font properties
    const weight = scoreText.type === 'combo' ? 'bold' : 'normal';
    this.ctx.font = `${weight} ${scoreText.fontSize}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // Apply alpha
    this.ctx.globalAlpha = scoreText.alpha;
    
    // Add glow effect for combo and perfect scores
    if (scoreText.type === 'combo' || scoreText.type === 'perfect') {
      this.ctx.shadowColor = scoreText.color;
      this.ctx.shadowBlur = 10;
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      this.ctx.lineWidth = 3;
      this.ctx.strokeText(scoreText.text, scoreText.x, scoreText.y);
    }
    
    // Draw main text
    this.ctx.fillStyle = scoreText.color;
    this.ctx.fillText(scoreText.text, scoreText.x, scoreText.y);
    
    // Reset shadow
    this.ctx.shadowBlur = 0;
    
    this.ctx.restore();
  }

  // Helper function to convert hex color to rgba
  private hexToRgba(hex: string, alpha: number): string {
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

  // Convert HSL to RGB
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

  // GRADIENT CACHING SYSTEM - STABILITY-FIRST IMPLEMENTATION
  createMeteorGradient(x: number, y: number, radius: number, color: string, isSuper: boolean = false): CanvasGradient {
    // Always create gradient directly with current position
    // Note: Gradient caching disabled due to position-dependent nature of radial gradients
    return this.createGradientInternal(x, y, radius, color, isSuper);
  }

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

  private generateGradientCacheKey(radius: number, color: string, isSuper: boolean): string {
    // Round radius to reduce cache fragmentation while maintaining visual quality
    const roundedRadius = Math.round(radius * 2) / 2; // Round to nearest 0.5
    return `${roundedRadius}:${color}:${isSuper}`;
  }

  private getFromGradientCache(key: string): CanvasGradient | null {
    try {
      const entry = this.gradientCache.get(key);
      if (entry) {
        // Update timestamp for LRU tracking
        entry.timestamp = Date.now();
        return entry.gradient;
      }
    } catch (error) {
      console.warn('Error retrieving from gradient cache:', error);
    }
    return null;
  }

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

  private maintainGradientCache(): void {
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

  // PUBLIC CACHE MANAGEMENT METHODS
  clearGradientCache(): void {
    try {
      this.gradientCache.clear();
      this.cacheHits = 0;
      this.cacheMisses = 0;
    } catch (error) {
      console.warn('Error clearing gradient cache:', error);
    }
  }

  getCacheStats(): { hits: number; misses: number; size: number; hitRatio: number } {
    const totalRequests = this.cacheHits + this.cacheMisses;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      size: this.gradientCache.size,
      hitRatio: totalRequests > 0 ? this.cacheHits / totalRequests : 0
    };
  }

  setShadowsEnabled(enabled: boolean): void {
    this.shadowsEnabled = enabled;
  }

  destroy(): void {
    try {
      window.removeEventListener('resize', this.handleCanvasResize);
      this.clearGradientCache();
    } catch (error) {
      console.warn('Error during RenderSystem cleanup:', error);
    }
  }
}