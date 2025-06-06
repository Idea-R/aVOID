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

interface ShadowGroup {
  blur: number;
  color: string;
  objects: Array<{
    type: 'meteor' | 'meteorTrail' | 'particle' | 'powerUp' | 'player' | 'playerTrail' | 'knockbackRing';
    data: any;
  }>;
}

export class RenderSystem {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private shadowGroups: Map<string, ShadowGroup> = new Map();

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
    
    // Prepare shadow groups for batching
    this.prepareShadowGroups(state);
    
    this.ctx.globalCompositeOperation = 'lighter';
    
    // Render all shadow groups in batches
    this.renderShadowGroups();
    
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.restore();
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
    if (state.gameSettings.showTrails) {
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

    // Group player trail (shadow blur: 15, color: #06b6d4)
    if (state.playerTrail.length > 0) {
      this.addToShadowGroup('15:#06b6d4', 15, '#06b6d4', 
        [{ type: 'playerTrail' as const, data: state.playerTrail }]
      );
    }

    // Group knockback ring (shadow blur: 10, color: #ffd700)
    if (state.hasKnockbackPower) {
      this.addToShadowGroup('10:#ffd700', 10, '#ffd700', 
        [{ type: 'knockbackRing' as const, data: { x: state.mouseX, y: state.mouseY, phase: state.playerRingPhase } }]
      );
    }

    // Group player (shadow blur: 20, color: #06b6d4)
    if (!state.isGameOver) {
      this.addToShadowGroup('20:#06b6d4', 20, '#06b6d4', 
        [{ type: 'player' as const, data: { x: state.mouseX, y: state.mouseY } }]
      );
    }

    // Group particles (shadow blur: 8, dynamic colors)
    if (state.activeParticles.length > 0) {
      this.addToShadowGroup('8:particle', 8, '', 
        state.activeParticles.filter(p => p.active).map(particle => ({ type: 'particle' as const, data: particle }))
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
    // Render groups in optimal order (background to foreground)
    const renderOrder = [
      '30:#ffd700',    // Power-ups (background glow)
      '12:meteor',     // Regular meteor trails
      '20:meteor',     // Super meteor trails
      '15:meteor',     // Regular meteors
      '25:meteor',     // Super meteors
      '15:#06b6d4',    // Player trail
      '10:#ffd700',    // Knockback ring
      '20:#06b6d4',    // Player
      '8:particle'     // Particles (foreground)
    ];

    for (const groupKey of renderOrder) {
      const group = this.shadowGroups.get(groupKey);
      if (!group || group.objects.length === 0) continue;

      // Set shadow properties once per group
      this.ctx.shadowBlur = group.blur;
      if (group.color) {
        this.ctx.shadowColor = group.color;
      }

      // Render all objects in this shadow group
      for (const obj of group.objects) {
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
            this.drawPlayerTrail(obj.data);
            break;
          case 'knockbackRing':
            this.drawKnockbackRing(obj.data.x, obj.data.y, obj.data.phase);
            break;
          case 'player':
            this.drawPlayer(obj.data.x, obj.data.y);
            break;
          case 'particle':
            this.drawParticle(obj.data);
            break;
        }
      }

      // Reset shadow after each group
      this.ctx.shadowBlur = 0;
    }
  }

  private drawPowerUp(powerUp: PowerUp): void {
    // Outer glow (uses current shadow settings)
    this.ctx.beginPath();
    this.ctx.arc(powerUp.x, powerUp.y, powerUp.radius * 2, 0, Math.PI * 2);
    this.ctx.fillStyle = `rgba(255, 215, 0, ${powerUp.glowIntensity * 0.3})`;
    this.ctx.fill();
    
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
  }

  private drawMeteorTrail(meteor: Meteor, trail: Array<{ x: number; y: number; alpha: number }>): void {
    trail.forEach((point, index) => {
      const progress = 1 - index / trail.length;
      const trailRadius = meteor.radius * progress * (meteor.isSuper ? 1.8 : 1.3);
      
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, trailRadius, 0, Math.PI * 2);
      const gradient = this.createMeteorGradient(point.x, point.y, trailRadius, meteor.color, meteor.isSuper);
      this.ctx.fillStyle = gradient;
      
      // Shadow color is set per meteor color
      this.ctx.shadowColor = meteor.color;
      this.ctx.fill();
    });
  }

  private drawMeteor(meteor: Meteor): void {
    this.ctx.beginPath();
    this.ctx.arc(meteor.x, meteor.y, meteor.radius * (meteor.isSuper ? 1.8 : 1.3), 0, Math.PI * 2);
    this.ctx.fillStyle = meteor.gradient || meteor.color;
    
    // Shadow color is set per meteor color
    this.ctx.shadowColor = meteor.color;
    this.ctx.fill();
  }

  private drawPlayerTrail(trail: Array<{ x: number; y: number; alpha: number }>): void {
    trail.forEach((point, index) => {
      const progress = 1 - index / trail.length;
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, 8 * progress, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(6, 182, 212, ${point.alpha * 0.7})`;
      this.ctx.fill();
    });
  }

  private drawKnockbackRing(x: number, y: number, phase: number): void {
    const ringRadius = 15 + Math.sin(phase) * 3;
    this.ctx.beginPath();
    this.ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
    this.ctx.strokeStyle = `rgba(255, 215, 0, ${0.8 + Math.sin(phase * 2) * 0.2})`;
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
  }

  private drawPlayer(x: number, y: number): void {
    this.ctx.beginPath();
    this.ctx.arc(x, y, 8, 0, Math.PI * 2);
    this.ctx.fillStyle = '#06b6d4';
    this.ctx.fill();
  }

  private drawParticle(particle: Particle): void {
    this.ctx.beginPath();
    this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = particle.color.replace(/,\s*[\d.]+\)$/, `, ${particle.alpha})`);
    
    // Shadow color is set per particle color
    this.ctx.shadowColor = particle.color;
    this.ctx.fill();
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