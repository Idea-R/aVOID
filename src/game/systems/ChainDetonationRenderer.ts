import { ChainDetonation, ChainFragment } from '../entities/ChainDetonation';

export class ChainDetonationRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  // Performance optimization properties
  private isMobile: boolean;
  private performanceMode: boolean;
  private fragmentCache: Map<string, ImageData> = new Map();
  private lastCacheTime: number = 0;
  private readonly CACHE_DURATION = 100; // Cache for 100ms

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    
    // Detect mobile device for performance optimizations
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                    window.innerWidth < 768;
    this.performanceMode = this.isMobile; // Default to performance mode on mobile
    
    console.log('🔗🎨 ChainDetonationRenderer initialized:', {
      isMobile: this.isMobile,
      performanceMode: this.performanceMode
    });
  }

  // Update performance mode based on current settings
  updatePerformanceMode(enabled: boolean): void {
    this.performanceMode = enabled || this.isMobile; // Always use performance mode on mobile
  }

  renderChainDetonation(chain: ChainDetonation): void {
    if (!chain.active) return;
    
    console.log(`🔗🎨 Rendering chain with ${chain.fragments.length} fragments, active: ${chain.active}`);

    this.ctx.save();

    // Render screen effects first
    this.renderScreenEffects(chain);

    // Render completion effect
    if (chain.completionEffect.active) {
      this.renderCompletionEffect(chain);
    } else {
      // Render fragments and connections
      this.renderElectricConnections(chain);
      this.renderFragments(chain);
    }

    this.ctx.restore();
  }

  private renderScreenEffects(chain: ChainDetonation): void {
    // Skip intensive screen effects in performance mode
    if (this.performanceMode) {
      // Simple flash effect for mobile
      if (chain.screenEffect.pulseIntensity > 0) {
        this.ctx.fillStyle = `rgba(138, 43, 226, ${chain.screenEffect.pulseIntensity * 0.05})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      }
      return;
    }
    
    // Full effects for desktop
    // Purple edge glow
    if (chain.screenEffect.edgeGlow > 0) {
      const gradient = this.ctx.createRadialGradient(
        this.canvas.width / 2, this.canvas.height / 2, 0,
        this.canvas.width / 2, this.canvas.height / 2, Math.max(this.canvas.width, this.canvas.height) / 2
      );
      
      gradient.addColorStop(0, 'rgba(138, 43, 226, 0)');
      gradient.addColorStop(0.8, 'rgba(138, 43, 226, 0)');
      gradient.addColorStop(1, `rgba(138, 43, 226, ${chain.screenEffect.edgeGlow * 0.3})`);
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Pulse overlay
    if (chain.screenEffect.pulseIntensity > 0) {
      this.ctx.fillStyle = `rgba(138, 43, 226, ${chain.screenEffect.pulseIntensity * 0.1})`;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  private renderElectricConnections(chain: ChainDetonation): void {
    const collectedFragments = chain.fragments.filter(f => f.collected);
    const uncollectedFragments = chain.fragments.filter(f => !f.collected);

    // Draw connections between collected and uncollected fragments
    collectedFragments.forEach(collected => {
      uncollectedFragments.forEach(uncollected => {
        this.drawElectricArc(collected.x, collected.y, uncollected.x, uncollected.y, 0.6, '#9d4edd');
      });
    });

    // Draw faint connections between uncollected fragments
    for (let i = 0; i < uncollectedFragments.length; i++) {
      for (let j = i + 1; j < uncollectedFragments.length; j++) {
        const fragment1 = uncollectedFragments[i];
        const fragment2 = uncollectedFragments[j];
        this.drawElectricArc(fragment1.x, fragment1.y, fragment2.x, fragment2.y, 0.3, '#6a4c93');
      }
    }
  }

  private drawElectricArc(x1: number, y1: number, x2: number, y2: number, intensity: number, color: string): void {
    const segments = 8;
    const maxOffset = 15 * intensity;
    
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    
    for (let i = 1; i <= segments; i++) {
      const progress = i / segments;
      const baseX = x1 + (x2 - x1) * progress;
      const baseY = y1 + (y2 - y1) * progress;
      
      // Add random offset perpendicular to the line
      const perpAngle = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
      const offset = (Math.random() - 0.5) * maxOffset;
      const jaggedX = baseX + Math.cos(perpAngle) * offset;
      const jaggedY = baseY + Math.sin(perpAngle) * offset;
      
      this.ctx.lineTo(jaggedX, jaggedY);
    }
    
    // Draw with glow effect
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 3 * intensity;
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 10 * intensity;
    this.ctx.stroke();
    
    // Inner bright core
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1 * intensity;
    this.ctx.shadowBlur = 0;
    this.ctx.stroke();
  }

  private renderFragments(chain: ChainDetonation): void {
    chain.fragments.forEach(fragment => {
      if (fragment.collected) {
        this.renderCollectedFragment(fragment);
      } else {
        this.renderActiveFragment(fragment, chain.timeRemaining / chain.maxTime);
      }

      // Render collection effect particles
      if (fragment.collectionEffect.active) {
        this.renderCollectionEffect(fragment);
      }
    });
  }

  private renderActiveFragment(fragment: ChainFragment, timeRatio: number): void {
    this.ctx.save();
    
    this.ctx.translate(fragment.x, fragment.y);
    
    // Performance mode: simplified rendering
    if (this.performanceMode) {
      // Simple circular fragment for mobile
      const pulseScale = 1 + Math.sin(fragment.pulsePhase) * 0.1; // Reduced animation
      this.ctx.scale(pulseScale, pulseScale);
      
      // Simple color based on time
      let fragmentColor = '#9d4edd';
      if (timeRatio < 0.3) fragmentColor = '#ff6b6b';
      else if (timeRatio < 0.6) fragmentColor = '#ffa726';
      
      // Simple circle with minimal effects
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 12, 0, Math.PI * 2);
      this.ctx.fillStyle = fragmentColor;
      this.ctx.fill();
      
      // Simple border
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      
      this.ctx.restore();
      return;
    }
    
    // Full desktop rendering with all effects
    console.log(`🔗🎨 Rendering active fragment at x=${fragment.x}, y=${fragment.y}`);
    
    // Pulsing scale
    const pulseScale = 1 + Math.sin(fragment.pulsePhase) * 0.2;
    this.ctx.scale(pulseScale, pulseScale);
    
    // Fragment color based on time remaining
    let fragmentColor = '#9d4edd'; // Purple
    if (timeRatio < 0.3) fragmentColor = '#ff6b6b'; // Red
    else if (timeRatio < 0.6) fragmentColor = '#ffa726'; // Orange
    
    // Outer glow
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 25, 0, Math.PI * 2);
    this.ctx.fillStyle = `${fragmentColor}40`;
    this.ctx.shadowColor = fragmentColor;
    this.ctx.shadowBlur = 20;
    this.ctx.fill();
    
    // Crystal shape (hexagon)
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      const x = Math.cos(angle) * 15;
      const y = Math.sin(angle) * 15;
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.closePath();
    
    // Gradient fill
    const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.3, fragmentColor);
    gradient.addColorStop(1, '#4c1d95');
    
    this.ctx.fillStyle = gradient;
    this.ctx.shadowBlur = 0;
    this.ctx.fill();
    
    // Crystal facets
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // Inner sparkle
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 5, 0, Math.PI * 2);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fill();
    
    this.ctx.restore();
  }

  private renderCollectedFragment(fragment: ChainFragment): void {
    this.ctx.save();
    this.ctx.translate(fragment.x, fragment.y);
    
    // Faded collected fragment
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      const x = Math.cos(angle) * 10;
      const y = Math.sin(angle) * 10;
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.closePath();
    
    this.ctx.fillStyle = 'rgba(157, 78, 221, 0.3)';
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 1;
    this.ctx.fill();
    this.ctx.stroke();
    
    // Checkmark
    this.ctx.strokeStyle = '#00ff00';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(-5, 0);
    this.ctx.lineTo(-1, 4);
    this.ctx.lineTo(6, -4);
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  private renderCollectionEffect(fragment: ChainFragment): void {
    fragment.collectionEffect.particles.forEach(particle => {
      this.ctx.save();
      this.ctx.globalAlpha = particle.alpha;
      
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
      this.ctx.fillStyle = '#9d4edd';
      this.ctx.shadowColor = '#9d4edd';
      this.ctx.shadowBlur = 8;
      this.ctx.fill();
      
      this.ctx.restore();
    });
  }

  private renderCompletionEffect(chain: ChainDetonation): void {
    const effect = chain.completionEffect;
    
    // Gentle screen flash with theme colors (much less harsh)
    if (effect.flashIntensity > 0) {
      // Create a radial gradient from center for softer effect
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      const maxRadius = Math.max(this.canvas.width, this.canvas.height);
      
      const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
      
      // Use purple/cyan theme colors instead of harsh white
      const intensity = effect.flashIntensity * 0.3; // Reduced from 0.8 to 0.3
      gradient.addColorStop(0, `rgba(157, 78, 221, ${intensity * 0.6})`); // Purple center
      gradient.addColorStop(0.4, `rgba(6, 182, 212, ${intensity * 0.4})`); // Cyan middle  
      gradient.addColorStop(0.8, `rgba(139, 69, 19, ${intensity * 0.2})`); // Subtle brown
      gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity * 0.1})`);       // Dark edges
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    // Expanding explosion ring
    if (effect.explosionRadius > 0) {
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      
      // Outer ring
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, effect.explosionRadius, 0, Math.PI * 2);
      this.ctx.strokeStyle = '#9d4edd';
      this.ctx.lineWidth = 20;
      this.ctx.shadowColor = '#9d4edd';
      this.ctx.shadowBlur = 30;
      this.ctx.stroke();
      
      // Inner bright ring
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, effect.explosionRadius, 0, Math.PI * 2);
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 10;
      this.ctx.shadowBlur = 0;
      this.ctx.stroke();
      
      // Multiple expanding rings for depth
      for (let i = 1; i <= 3; i++) {
        const ringRadius = effect.explosionRadius - (i * 50);
        if (ringRadius > 0) {
          this.ctx.beginPath();
          this.ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
          this.ctx.strokeStyle = `rgba(157, 78, 221, ${0.5 / i})`;
          this.ctx.lineWidth = 15 / i;
          this.ctx.stroke();
        }
      }
    }
  }

  renderUI(chain: ChainDetonation): void {
    if (!chain.active || chain.completionEffect.active) return;

    this.ctx.save();
    
    // Progress indicator
    const progress = chain.collectedCount / chain.totalFragments;
    const timeRatio = chain.timeRemaining / chain.maxTime;
    
    // Position below scoreboard
    const centerX = this.canvas.width / 2;
    const baseY = 170; // Simplified positioning
    
    // Progress bar - clean and minimal
    const barWidth = 160;
    const barHeight = 8;
    const barX = centerX - barWidth / 2;
    const barY = baseY;
    
    // Subtle background with rounded corners
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    this.ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
    
    // Progress bar background
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Progress fill with time-based color
    let progressColor = '#9d4edd'; // Purple default
    if (timeRatio < 0.3) progressColor = '#ff6b6b'; // Red urgent
    else if (timeRatio < 0.6) progressColor = '#ffa726'; // Orange warning
    
    this.ctx.fillStyle = progress === 1 ? '#00ff00' : progressColor;
    this.ctx.fillRect(barX, barY, barWidth * progress, barHeight);
    
    // Subtle border glow
    this.ctx.strokeStyle = progressColor;
    this.ctx.lineWidth = 1;
    this.ctx.shadowColor = progressColor;
    this.ctx.shadowBlur = 8;
    this.ctx.strokeRect(barX, barY, barWidth, barHeight);
    this.ctx.shadowBlur = 0;
    
    // Mini collection symbols below progress bar
    this.renderCollectionSymbols(chain, centerX, baseY + 20);
    
    this.ctx.restore();
  }

  private renderCollectionSymbols(chain: ChainDetonation, centerX: number, symbolY: number): void {
    const symbolSize = 8;
    const symbolSpacing = 16;
    const totalWidth = (chain.totalFragments - 1) * symbolSpacing;
    const startX = centerX - totalWidth / 2;
    const timeRatio = chain.timeRemaining / chain.maxTime;
    
    for (let i = 0; i < chain.totalFragments; i++) {
      const x = startX + i * symbolSpacing;
      const collected = i < chain.collectedCount;
      
      this.ctx.save();
      this.ctx.translate(x, symbolY);
      
      if (collected) {
        // Collected - bright crystal symbol with gentle pulse
        const pulseScale = 1 + Math.sin(Date.now() * 0.005 + i) * 0.1;
        this.ctx.scale(pulseScale, pulseScale);
        
        this.ctx.beginPath();
        for (let j = 0; j < 6; j++) {
          const angle = (Math.PI * 2 * j) / 6;
          const px = Math.cos(angle) * symbolSize;
          const py = Math.sin(angle) * symbolSize;
          if (j === 0) this.ctx.moveTo(px, py);
          else this.ctx.lineTo(px, py);
        }
        this.ctx.closePath();
        
        // Bright fill
        this.ctx.fillStyle = '#9d4edd';
        this.ctx.shadowColor = '#9d4edd';
        this.ctx.shadowBlur = 8;
        this.ctx.fill();
        
        // White center
        this.ctx.beginPath();
        this.ctx.arc(0, 0, symbolSize * 0.3, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowBlur = 0;
        this.ctx.fill();
      } else {
        // Not collected - dim outline with subtle urgency animation
        const urgencyPulse = timeRatio < 0.5 ? 1 + Math.sin(Date.now() * 0.01) * 0.2 : 1;
        this.ctx.scale(urgencyPulse, urgencyPulse);
        
        this.ctx.beginPath();
        for (let j = 0; j < 6; j++) {
          const angle = (Math.PI * 2 * j) / 6;
          const px = Math.cos(angle) * symbolSize;
          const py = Math.sin(angle) * symbolSize;
          if (j === 0) this.ctx.moveTo(px, py);
          else this.ctx.lineTo(px, py);
        }
        this.ctx.closePath();
        
        // Dim stroke with time-based urgency color
        const baseAlpha = timeRatio < 0.5 ? 0.6 : 0.3;
        const urgencyAlpha = timeRatio < 0.3 ? 0.8 : baseAlpha;
        
        if (timeRatio < 0.3) {
          this.ctx.strokeStyle = `rgba(255, 107, 107, ${urgencyAlpha})`; // Red urgency
        } else if (timeRatio < 0.6) {
          this.ctx.strokeStyle = `rgba(255, 167, 38, ${urgencyAlpha})`; // Orange warning
        } else {
          this.ctx.strokeStyle = `rgba(157, 78, 221, ${urgencyAlpha})`; // Purple normal
        }
        
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
      }
      
      this.ctx.restore();
    }
  }
}