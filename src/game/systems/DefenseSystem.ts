import { Meteor } from '../entities/Meteor';
import { DefenseCore, DefenseZone, DefenseResult } from './DefenseCore';
import { DefenseEffects } from './DefenseEffects';
import { DefenseRenderer } from './DefenseRenderer';

export type { DefenseZone } from './DefenseCore';

export class DefenseSystem {
  private defenseCore: DefenseCore;
  private defenseEffects: DefenseEffects;
  private defenseRenderer: DefenseRenderer;

  constructor(canvas: HTMLCanvasElement) {
    // Initialize the three defense modules
    this.defenseCore = new DefenseCore(canvas);
    this.defenseEffects = new DefenseEffects();
    this.defenseRenderer = new DefenseRenderer(canvas);
    
    // Set up callbacks from core to effects
    this.defenseCore.onEffectTriggered = (type, badgeX, badgeY, meteorX, meteorY) => {
      this.defenseEffects.createLocalizedLightningEffects(badgeX, badgeY, meteorX, meteorY, type);
    };
    
    this.defenseCore.onPlayerElimination = (badgeX, badgeY, playerX, playerY) => {
      this.defenseEffects.createPlayerEliminationEffect(badgeX, badgeY, playerX, playerY);
    };
  }

  /**
   * Update defense zone positions on canvas resize
   */
  public updateCanvasSize(width: number, height: number): void {
    this.defenseCore.updateCanvasSize(width, height);
  }

  /**
   * Update all defense systems
   */
  public update(deltaTime: number): void {
    this.defenseEffects.update(deltaTime);
    this.defenseCore.cleanupOldTrackers();
  }

  /**
   * Render all defense effects
   */
  public render(): void {
    const effectsData = this.defenseEffects.getEffectsForRendering();
    const defenseZones = this.defenseCore.getDefenseZones();
    
    this.defenseRenderer.render(effectsData, defenseZones);
  }

  /**
   * Process meteor defense interactions
   */
  public processMeteorDefense(meteors: Meteor[]): DefenseResult {
    return this.defenseCore.processMeteorDefense(meteors);
  }

  /**
   * Check if player is in an active electrical defense zone
   */
  public checkPlayerCollision(playerX: number, playerY: number): boolean {
    return this.defenseCore.checkPlayerCollision(playerX, playerY);
  }

  /**
   * Add new defense zone
   */
  public addDefenseZone(zone: DefenseZone): void {
    this.defenseCore.addDefenseZone(zone);
  }

  /**
   * Remove defense zone by index
   */
  public removeDefenseZone(index: number): void {
    this.defenseCore.removeDefenseZone(index);
  }

  /**
   * Get all defense zones (read-only)
   */
  public getDefenseZones(): DefenseZone[] {
    return this.defenseCore.getDefenseZones();
  }

  /**
   * Clear all defense zones and reset state
   */
  public clear(): void {
    this.defenseCore.clear();
    this.defenseEffects.clear();
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStats(): {
    core: {
      defenseZones: number;
      trackedMeteors: number;
      lastActivation: number;
      isActive: boolean;
    };
    effects: {
      lightningBolts: number;
      electricParticles: number;
      electricRings: number;
      staticElectricityActive: boolean;
    };
  } {
    return {
      core: this.defenseCore.getPerformanceStats(),
      effects: this.defenseEffects.getPerformanceStats()
    };
  }

  /**
   * Check if defense system is currently active
   */
  public isActive(): boolean {
    return this.defenseCore.isActive();
  }

  /**
   * Get time since last activation
   */
  public getTimeSinceActivation(): number {
    return this.defenseCore.getTimeSinceActivation();
  }

  /**
   * Render debug visualization (optional)
   */
  public renderDebug(showDebug: boolean = false): void {
    const defenseZones = this.defenseCore.getDefenseZones();
    this.defenseRenderer.renderDebugZones(defenseZones, showDebug);
  }
}