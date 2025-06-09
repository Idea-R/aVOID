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
   * Draw power-up as an energy capsule with glowing core
   */
  private drawPowerUp(powerUp: PowerUp): void {
    this.ctx.save();
    
    // Draw subtle energy waves first (much less prominent)
    powerUp.energyWaves.forEach(wave => {
      this.ctx.beginPath();
      this.ctx.arc(powerUp.x, powerUp.y, wave.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(100, 200, 255, ${wave.alpha * 0.2})`;
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    });
    
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
        this.ctx.fillStyle = `rgba(100, 200, 255, ${point.alpha * 0.6})`;
        this.ctx.fill();
      });
    }
    
    // Draw floating energy discharge sparkles
    powerUp.floatingSparkles.forEach(sparkle => {
      this.drawEnergyBolt(sparkle.x, sparkle.y, sparkle.size, `rgba(150, 220, 255, ${sparkle.alpha})`);
    });
    
    // Draw orbiting energy particles (more electrical looking)
    powerUp.orbitingParticles.forEach(particle => {
      const x = powerUp.x + Math.cos(particle.angle) * particle.distance;
      const y = powerUp.y + Math.sin(particle.angle) * particle.distance;
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      this.ctx.fillStyle = '#00bfff';
      this.ctx.shadowColor = '#00bfff';
      this.ctx.shadowBlur = 6;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
      
      // Add small electric arc effect
      this.drawMiniArc(x, y, 4, particle.angle);
    });
    
    // Very subtle outer energy field
    this.ctx.beginPath();
    this.ctx.arc(powerUp.x, powerUp.y, powerUp.radius * 1.6, 0, Math.PI * 2);
    this.ctx.fillStyle = `rgba(100, 200, 255, ${powerUp.glowIntensity * 0.05})`;
    this.ctx.fill();
    
    // Draw energy capsule instead of diamond
    this.drawEnergyCapsule(powerUp.x, powerUp.y, powerUp.radius, powerUp.pulsePhase);
    
    // Draw energy arcs around the capsule
    const arcCount = 8;
    for (let i = 0; i < arcCount; i++) {
      const angle = (powerUp.pulsePhase * 1.5 + i * Math.PI * 2 / arcCount);
      const distance = powerUp.radius * 1.4 + Math.sin(powerUp.pulsePhase * 2 + i * 0.8) * 6;
      const x = powerUp.x + Math.cos(angle) * distance;
      const y = powerUp.y + Math.sin(angle) * distance;
      const alpha = 0.4 + Math.sin(powerUp.pulsePhase * 3 + i) * 0.3;
      const size = 2 + Math.sin(powerUp.pulsePhase * 4 + i * 0.7) * 1;
      
      // Draw small energy bolts
      this.drawEnergyBolt(x, y, size, `rgba(150, 220, 255, ${alpha})`);
    }
    
    this.ctx.restore();
  }

  /**
   * Draw an energy capsule with glowing core and metal caps
   */
  private drawEnergyCapsule(x: number, y: number, size: number, pulsePhase: number): void {
    const capsuleWidth = size * 1.8;
    const capsuleHeight = size * 0.8;
    const capWidth = capsuleHeight * 0.3;
    
    // Draw glass tube (main body)
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, capsuleWidth * 0.5, capsuleHeight * 0.5, 0, 0, Math.PI * 2);
    
    // Glass tube gradient (clear with slight blue tint)
    const tubeGradient = this.ctx.createRadialGradient(x, y, 0, x, y, capsuleWidth * 0.5);
    tubeGradient.addColorStop(0, 'rgba(200, 230, 255, 0.3)');
    tubeGradient.addColorStop(0.7, 'rgba(150, 200, 255, 0.2)');
    tubeGradient.addColorStop(1, 'rgba(100, 150, 200, 0.4)');
    this.ctx.fillStyle = tubeGradient;
    this.ctx.fill();
    
    // Glass tube border
    this.ctx.strokeStyle = 'rgba(200, 230, 255, 0.6)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    
    // Left cap (metal)
    this.ctx.beginPath();
    this.ctx.ellipse(x - capsuleWidth * 0.35, y, capWidth, capsuleHeight * 0.5, 0, 0, Math.PI * 2);
    const leftCapGradient = this.ctx.createRadialGradient(
      x - capsuleWidth * 0.35, y, 0,
      x - capsuleWidth * 0.35, y, capWidth
    );
    leftCapGradient.addColorStop(0, '#87ceeb');
    leftCapGradient.addColorStop(0.5, '#4682b4');
    leftCapGradient.addColorStop(1, '#2f4f8f');
    this.ctx.fillStyle = leftCapGradient;
    this.ctx.fill();
    
    // Right cap (metal)
    this.ctx.beginPath();
    this.ctx.ellipse(x + capsuleWidth * 0.35, y, capWidth, capsuleHeight * 0.5, 0, 0, Math.PI * 2);
    const rightCapGradient = this.ctx.createRadialGradient(
      x + capsuleWidth * 0.35, y, 0,
      x + capsuleWidth * 0.35, y, capWidth
    );
    rightCapGradient.addColorStop(0, '#87ceeb');
    rightCapGradient.addColorStop(0.5, '#4682b4');
    rightCapGradient.addColorStop(1, '#2f4f8f');
    this.ctx.fillStyle = rightCapGradient;
    this.ctx.fill();
    
    // Glowing energy core inside
    const coreSize = size * (0.4 + Math.sin(pulsePhase * 3) * 0.1);
    this.ctx.beginPath();
    this.ctx.arc(x, y, coreSize, 0, Math.PI * 2);
    const coreGradient = this.ctx.createRadialGradient(x, y, 0, x, y, coreSize);
    coreGradient.addColorStop(0, '#ffffff');
    coreGradient.addColorStop(0.3, '#b3e5ff');
    coreGradient.addColorStop(0.7, '#00bfff');
    coreGradient.addColorStop(1, '#0080ff');
    this.ctx.fillStyle = coreGradient;
    this.ctx.shadowColor = '#00bfff';
    this.ctx.shadowBlur = 8;
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
    
    // Internal energy arcs
    for (let i = 0; i < 3; i++) {
      const arcAngle = pulsePhase * 4 + i * Math.PI * 0.7;
      const startX = x + Math.cos(arcAngle) * coreSize * 0.3;
      const startY = y + Math.sin(arcAngle) * coreSize * 0.3;
      const endX = x + Math.cos(arcAngle + Math.PI) * coreSize * 0.3;
      const endY = y + Math.sin(arcAngle + Math.PI) * coreSize * 0.3;
      
      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      this.ctx.quadraticCurveTo(
        x + Math.cos(arcAngle + Math.PI * 0.5) * coreSize * 0.6,
        y + Math.sin(arcAngle + Math.PI * 0.5) * coreSize * 0.6,
        endX, endY
      );
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 + Math.sin(pulsePhase * 5 + i) * 0.4})`;
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
    }
  }

  /**
   * Draw a small energy bolt
   */
  private drawEnergyBolt(x: number, y: number, size: number, color: string): void {
    this.ctx.save();
    this.ctx.translate(x, y);
    
    // Lightning bolt shape
    this.ctx.beginPath();
    this.ctx.moveTo(-size * 0.3, -size);
    this.ctx.lineTo(size * 0.1, -size * 0.3);
    this.ctx.lineTo(-size * 0.1, -size * 0.1);
    this.ctx.lineTo(size * 0.3, size);
    this.ctx.lineTo(-size * 0.1, size * 0.3);
    this.ctx.lineTo(size * 0.1, size * 0.1);
    this.ctx.closePath();
    
    this.ctx.fillStyle = color;
    this.ctx.shadowColor = '#00bfff';
    this.ctx.shadowBlur = 4;
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
    
    this.ctx.restore();
  }

  /**
   * Draw a mini electric arc
   */
  private drawMiniArc(x: number, y: number, radius: number, baseAngle: number): void {
    const arcCount = 2;
    for (let i = 0; i < arcCount; i++) {
      const angle = baseAngle + (i - 0.5) * 0.5;
      const endX = x + Math.cos(angle) * radius;
      const endY = y + Math.sin(angle) * radius;
      
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(endX, endY);
      this.ctx.strokeStyle = `rgba(100, 200, 255, ${0.3 + Math.random() * 0.4})`;
      this.ctx.lineWidth = 0.5;
      this.ctx.stroke();
    }
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
    // Special rendering for canvas ring particles
    if (particle.customBehavior === 'canvasRing') {
      this.drawCanvasRing(particle);
      return;
    }
    
    // Standard particle rendering
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
   * Draw expanding ring with chain detonation style
   */
  private drawCanvasRing(particle: Particle): void {
    if (particle.radius <= 0 || particle.alpha <= 0.01) return;
    
    this.ctx.save();
    this.ctx.globalAlpha = particle.alpha;
    
    // Calculate ring thickness based on ring index (outer rings are thicker)
    const baseThickness = 6;
    const thickness = baseThickness + (particle.ringIndex || 0) * 2;
    
    // Draw outer ring with shadow/glow
    this.ctx.beginPath();
    this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    this.ctx.strokeStyle = particle.color;
    this.ctx.lineWidth = thickness;
    
    if (this.shadowsEnabled) {
      this.ctx.shadowColor = particle.color;
      this.ctx.shadowBlur = 15;
    }
    this.ctx.stroke();
    
    // Draw inner bright ring (always white core for impact)
    this.ctx.beginPath();
    this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = thickness * 0.5;
    this.ctx.shadowBlur = 0;
    this.ctx.stroke();
    
    this.ctx.restore();
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