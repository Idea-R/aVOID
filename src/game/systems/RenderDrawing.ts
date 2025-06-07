import { Meteor } from '../entities/Meteor';
import { Particle } from '../entities/Particle';
import { PowerUp } from '../entities/PowerUp';
import { ScoreText } from '../entities/ScoreText';
import { GameSettings, RenderObject } from './RenderCore';

export class RenderDrawing {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private shadowsEnabled: boolean = true;
  
  // Callbacks for external utilities
  onCreateGradient: (x: number, y: number, radius: number, color: string, isSuper?: boolean) => CanvasGradient = () => this.ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  onConvertColor: (hex: string, alpha: number) => string = (hex, alpha) => `rgba(0, 0, 0, ${alpha})`;

  constructor(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    this.ctx = ctx;
    this.canvas = canvas;
  }

  /**
   * Main object rendering dispatcher
   */
  public renderObject(obj: RenderObject, gameSettings?: GameSettings): void {
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

  /**
   * Draw power-up with atomic nucleus effect and orbiting electrons
   */
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

  /**
   * Draw meteor trail with level-of-detail optimization
   */
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

  /**
   * Draw meteor with gradient effects
   */
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

  /**
   * Draw player trail with color customization
   */
  private drawPlayerTrail(trail: Array<{ x: number; y: number; alpha: number }>, cursorColor: string): void {
    trail.forEach((point, index) => {
      const progress = 1 - index / trail.length;
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, 8 * progress, 0, Math.PI * 2);
      
      // Convert cursor color to rgba with alpha
      const color = this.onConvertColor(cursorColor, point.alpha * 0.7);
      this.ctx.fillStyle = color;
      this.ctx.fill();
    });
  }

  /**
   * Draw knockback ring with multiple charge visualization
   */
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
    
    const color = this.onConvertColor(cursorColor, alpha);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 3 - (ringIndex * 0.5); // Thinner outer rings
    this.ctx.stroke();
  }

  /**
   * Draw player cursor
   */
  private drawPlayer(x: number, y: number, cursorColor: string): void {
    this.ctx.beginPath();
    this.ctx.arc(x, y, 8, 0, Math.PI * 2);
    this.ctx.fillStyle = cursorColor;
    this.ctx.fill();
  }

  /**
   * Draw particle with color and alpha effects
   */
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

  /**
   * Draw score text with glow effects for special types
   */
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

  /**
   * Set shadows enabled/disabled for performance
   */
  public setShadowsEnabled(enabled: boolean): void {
    this.shadowsEnabled = enabled;
  }

  /**
   * Update canvas context and dimensions
   */
  public updateContext(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    this.ctx = ctx;
    this.canvas = canvas;
  }

  /**
   * Get drawing statistics for debugging
   */
  public getDrawingStats(): {
    shadowsEnabled: boolean;
    canvasWidth: number;
    canvasHeight: number;
  } {
    return {
      shadowsEnabled: this.shadowsEnabled,
      canvasWidth: this.canvas.width,
      canvasHeight: this.canvas.height
    };
  }
}