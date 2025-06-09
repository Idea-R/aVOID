import { ParticleSystemCore } from './particles/ParticleSystemCore';
import { StandardParticleEffects } from './particles/StandardParticleEffects';
import { ChainDetonationEffects } from './particles/ChainDetonationEffects';
import { Particle } from '../entities/Particle';

export class ParticleSystem {
  private core: ParticleSystemCore;
  private standardEffects: StandardParticleEffects;
  private chainDetonationEffects: ChainDetonationEffects;

  constructor() {
    this.core = new ParticleSystemCore();
    this.standardEffects = new StandardParticleEffects(this.core);
    this.chainDetonationEffects = new ChainDetonationEffects(this.core);
  }

  // Core management methods - delegate to core
  setMaxParticles(maxParticles: number): void {
    this.core.setMaxParticles(maxParticles);
  }

  update(deltaTime: number): void {
    this.core.update(deltaTime);
    this.chainDetonationEffects.update(); // Update frame-based delays
  }

  getActiveParticles(): Particle[] {
    return this.core.getActiveParticles();
  }

  getParticleCount(): number {
    return this.core.getParticleCount();
  }

  getPoolSize(): number {
    return this.core.getPoolSize();
  }

  getMaxParticles(): number {
    return this.core.getMaxParticles();
  }

  clear(): void {
    this.core.clear();
    this.chainDetonationEffects.clear();
  }

  reset(): void {
    this.core.reset();
    this.chainDetonationEffects.clear();
  }

  // Standard particle effects - delegate to standardEffects
  createExplosion(x: number, y: number, color: string, isSuper: boolean = false): void {
    this.standardEffects.createExplosion(x, y, color, isSuper);
  }

  createShockwave(x: number, y: number): void {
    this.standardEffects.createShockwave(x, y);
  }

  createDefenseEffect(x: number, y: number, type: 'destroy' | 'deflect'): void {
    this.standardEffects.createDefenseEffect(x, y, type);
  }

  // Chain detonation effects - delegate to chainDetonationEffects
  createChainDetonationExplosion(x: number, y: number): void {
    this.chainDetonationEffects.createChainDetonationExplosion(x, y);
  }

  createEnhancedChainDetonation(meteors: Array<{ x: number; y: number; color: string; isSuper: boolean }>, centerX: number, centerY: number): void {
    this.chainDetonationEffects.createEnhancedChainDetonation(meteors, centerX, centerY);
  }
}