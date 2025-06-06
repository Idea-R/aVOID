import { Meteor } from '../entities/Meteor';
import { Particle } from '../entities/Particle';
import { PowerUp } from '../entities/PowerUp';

interface GameSettings {
  volume: number;
  soundEnabled: boolean;
  showUI: boolean;
  showFPS: boolean;
  showPerformanceStats: boolean;
  showTrails: boolean;
}

interface RenderState {
  mouseX: number;
  mouseY: number;
  activeMeteors: Meteor[];
  activeParticles: Particle[];
  powerUps: PowerUp[];
  playerTrail: Array<{ x: number; y: number; alpha: number }>;
  isGameOver: boolean;
  hasKnockbackPower: boolean;
  playerRingPhase: number;
  screenShake: { x: number; y: number; intensity: number; duration: number };
  gameSettings: GameSettings;
}

export class RenderSystem {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not get canvas context');
    this.ctx = context;
  }

  render(state: RenderState): void {
    this.ctx.save();
    this.ctx.translate(state.screenShake.x, state.screenShake.y);
    
    // Clear canvas with fade effect
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    this.ctx.fillRect(-state.screenShake.x, -state.screenShake.y, this.canvas.width, this.canvas.height);
    
    this.ctx.globalCompositeOperation = 'lighter';
    
    // Draw power-ups
    this.drawPowerUps(state.powerUps);
    
    // Draw meteor trails (only if enabled)
    if (state.gameSettings.showTrails) {
      this.drawMeteorTrails(state.activeMeteors);
    }

    // Draw meteors
    this.drawMeteors(state.activeMeteors);
    
    this.ctx.globalCompositeOperation = 'source-over';
    
    // Draw player trail
    this.drawPlayerTrail(state.playerTrail);
    
    // Draw knockback power ring
    if (state.hasKnockbackPower) {
      this.drawKnockbackRing(state.mouseX, state.mouseY, state.playerRingPhase);
    }
    
    // Draw player
    if (!state.isGameOver) {
      this.drawPlayer(state.mouseX, state.mouseY);
    }

    // Draw particles
    this.drawParticles(state.activeParticles);
    
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.restore();
  }

  private drawPowerUps(powerUps: PowerUp[]): void {
    powerUps.forEach(powerUp => {
      // Outer glow
      this.ctx.beginPath();
      this.ctx.arc(powerUp.x, powerUp.y, powerUp.radius * 2, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 215, 0, ${powerUp.glowIntensity * 0.3})`;
      this.ctx.shadowBlur = 30;
      this.ctx.shadowColor = '#ffd700';
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
      
      // Main power-up body
      this.ctx.beginPath();
      this.ctx.arc(powerUp.x, powerUp.y, powerUp.radius, 0, Math.PI * 2);
      const gradient = this.ctx.createRadialGradient(
        powerUp.x, powerUp.y, 0,
        powerUp.x, powerUp.y, powerUp.radius
      );
      gradient.addColorStop(0, '#ffff80');
      gradient.addColorStop(0.7, '#ffd700');
      gradient.addColorStop(1, '#ffb000');
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
      
      // Highlight
      this.ctx.beginPath();
      this.ctx.arc(powerUp.x - 5, powerUp.y - 5, powerUp.radius * 0.3, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      this.ctx.fill();
    });
  }

  private drawMeteorTrails(meteors: Meteor[]): void {
    meteors.forEach(meteor => {
      if (!meteor.active) return;
      
      meteor.trail.forEach((point, index) => {
        const progress = 1 - index / meteor.trail.length;
        const trailRadius = meteor.radius * progress * (meteor.isSuper ? 1.8 : 1.3);
        
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, trailRadius, 0, Math.PI * 2);
        const gradient = this.createMeteorGradient(point.x, point.y, trailRadius, meteor.color, meteor.isSuper);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        this.ctx.shadowBlur = meteor.isSuper ? 20 : 12;
        this.ctx.shadowColor = meteor.color;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      });
    });
  }

  private drawMeteors(meteors: Meteor[]): void {
    meteors.forEach(meteor => {
      if (!meteor.active) return;
      
      this.ctx.beginPath();
      this.ctx.arc(meteor.x, meteor.y, meteor.radius * (meteor.isSuper ? 1.8 : 1.3), 0, Math.PI * 2);
      this.ctx.fillStyle = meteor.gradient || meteor.color;
      
      this.ctx.shadowBlur = meteor.isSuper ? 25 : 15;
      this.ctx.shadowColor = meteor.color;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    });
  }

  private drawPlayerTrail(trail: Array<{ x: number; y: number; alpha: number }>): void {
    trail.forEach((point, index) => {
      const progress = 1 - index / trail.length;
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, 8 * progress, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(6, 182, 212, ${point.alpha * 0.7})`;
      
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = '#06b6d4';
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    });
  }

  private drawKnockbackRing(x: number, y: number, phase: number): void {
    const ringRadius = 15 + Math.sin(phase) * 3;
    this.ctx.beginPath();
    this.ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
    this.ctx.strokeStyle = `rgba(255, 215, 0, ${0.8 + Math.sin(phase * 2) * 0.2})`;
    this.ctx.lineWidth = 3;
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#ffd700';
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;
  }

  private drawPlayer(x: number, y: number): void {
    this.ctx.beginPath();
    this.ctx.arc(x, y, 8, 0, Math.PI * 2);
    this.ctx.fillStyle = '#06b6d4';
    
    this.ctx.shadowBlur = 20;
    this.ctx.shadowColor = '#06b6d4';
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
  }

  private drawParticles(particles: Particle[]): void {
    this.ctx.globalCompositeOperation = 'lighter';
    particles.forEach(particle => {
      if (!particle.active) return;
      
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = particle.color.replace(/,\s*[\d.]+\)$/, `, ${particle.alpha})`);
      
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = particle.color;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    });
  }

  createMeteorGradient(x: number, y: number, radius: number, color: string, isSuper: boolean = false): CanvasGradient {
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
}