import { DefenseRenderEffects } from './DefenseRenderEffects';
import { DefenseZone } from './DefenseCore';

interface LightningBolt {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  branches: Array<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    thickness: number;
  }>;
  thickness: number;
  alpha: number;
  flickerPhase: number;
  duration: number;
  maxDuration: number;
  type: 'destroy' | 'deflect';
}

interface ElectricParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface ElectricRing {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  thickness: number;
  duration: number;
  maxDuration: number;
}

interface EffectsData {
  lightningBolts: LightningBolt[];
  electricParticles: ElectricParticle[];
  electricRings: ElectricRing[];
  staticElectricityTimer: number;
}

/**
 * DefenseRenderer coordinates electrical effects through modular components.
 * Refactored to delegate functionality to DefenseRenderCore and DefenseRenderEffects.
 */
export class DefenseRenderer {
  private effectsRenderer: DefenseRenderEffects;

  constructor(canvas: HTMLCanvasElement) {
    this.effectsRenderer = new DefenseRenderEffects(canvas);
  }

  /**
   * Render all electrical effects - delegates to effects renderer
   */
  public render(effectsData: EffectsData, defenseZones: DefenseZone[]): void {
    this.effectsRenderer.render(effectsData, defenseZones);
  }

  /**
   * Render debug visualization of defense zones - delegates to effects renderer
   */
  public renderDebugZones(defenseZones: DefenseZone[], showDebug: boolean = false): void {
    this.effectsRenderer.renderDebugZones(defenseZones, showDebug);
  }
}