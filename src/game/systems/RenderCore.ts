import { Meteor } from '../entities/Meteor';
import { Particle } from '../entities/Particle';
import { PowerUp } from '../entities/PowerUp';
import { ScoreText } from '../entities/ScoreText';

export interface GameSettings {
  volume: number;
  soundEnabled: boolean;
  showUI: boolean;
  showFPS: boolean;
  showPerformanceStats: boolean;
  showTrails: boolean;
  cursorColor: string;
}

export interface RenderState {
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

export interface ShadowGroup {
  blur: number;
  color: string;
  objects: Array<{
    type: 'meteor' | 'meteorTrail' | 'particle' | 'powerUp' | 'player' | 'playerTrail' | 'knockbackRing' | 'scoreText';
    data: any;
  }>;
}

export interface RenderObject {
  type: string;
  data: any;
}

export class RenderCore {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private shadowsEnabled: boolean = true;
  private shadowGroups: Map<string, ShadowGroup> = new Map();
  private currentGameSettings?: GameSettings;
  
  // Callbacks for drawing operations
  onDrawObject: (obj: RenderObject, gameSettings?: GameSettings) => void = () => {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not get canvas context');
    this.ctx = context;
    
    // Listen for canvas resize for cleanup
    window.addEventListener('resize', this.handleCanvasResize);
  }

  private handleCanvasResize = (): void => {
    try {
      // Clear any canvas-dependent state
      this.shadowGroups.clear();
    } catch (error) {
      console.warn('Error handling canvas resize in RenderCore:', error);
    }
  };

  /**
   * Main render method - orchestrates the rendering pipeline
   */
  public render(state: RenderState): void {
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
  }

  /**
   * Prepare shadow groups for optimal batch rendering
   */
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

  /**
   * Add objects to a shadow group for batch rendering
   */
  private addToShadowGroup(key: string, blur: number, color: string, objects: Array<{ type: any; data: any }>): void {
    if (!this.shadowGroups.has(key)) {
      this.shadowGroups.set(key, { blur, color, objects: [] });
    }
    this.shadowGroups.get(key)!.objects.push(...objects);
  }

  /**
   * Render all shadow groups in optimal order
   */
  private renderShadowGroups(): void {
    // Skip shadow rendering if disabled by auto-scaling
    if (!this.shadowsEnabled) {
      // Render without shadows
      for (const groupKey of this.getRenderOrder()) {
        const group = this.shadowGroups.get(groupKey);
        if (!group || group.objects.length === 0) continue;

        // Render all objects in this group without shadows
        for (const obj of group.objects) {
          this.onDrawObject(obj, this.currentGameSettings);
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
        this.onDrawObject(obj, this.currentGameSettings);
      }

      // Reset shadow after each group
      this.ctx.shadowBlur = 0;
    }
  }

  /**
   * Get optimal render order for shadow groups
   */
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

  /**
   * Set shadow rendering enabled/disabled for performance
   */
  public setShadowsEnabled(enabled: boolean): void {
    this.shadowsEnabled = enabled;
  }

  /**
   * Get canvas context for external use
   */
  public getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /**
   * Get canvas element
   */
  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Get current shadow groups for debugging
   */
  public getShadowGroups(): Map<string, ShadowGroup> {
    return new Map(this.shadowGroups);
  }

  /**
   * Get rendering statistics
   */
  public getRenderStats(): {
    shadowGroupCount: number;
    totalObjects: number;
    shadowsEnabled: boolean;
  } {
    let totalObjects = 0;
    for (const group of this.shadowGroups.values()) {
      totalObjects += group.objects.length;
    }

    return {
      shadowGroupCount: this.shadowGroups.size,
      totalObjects,
      shadowsEnabled: this.shadowsEnabled
    };
  }

  /**
   * Clear shadow groups (useful for frame resets)
   */
  public clearShadowGroups(): void {
    this.shadowGroups.clear();
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    try {
      window.removeEventListener('resize', this.handleCanvasResize);
      this.shadowGroups.clear();
    } catch (error) {
      console.warn('Error during RenderCore cleanup:', error);
    }
  }
}