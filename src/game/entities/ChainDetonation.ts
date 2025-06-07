export interface ChainFragment {
  id: string;
  x: number;
  y: number;
  collected: boolean;
  pulsePhase: number;
  electricArcs: Array<{
    targetId: string;
    intensity: number;
    flickerPhase: number;
  }>;
  collectionEffect: {
    active: boolean;
    particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      alpha: number;
      life: number;
    }>;
  };
}

export interface ChainDetonation {
  id: string;
  active: boolean;
  fragments: ChainFragment[];
  timeRemaining: number;
  maxTime: number;
  collectedCount: number;
  totalFragments: number;
  screenEffect: {
    edgeGlow: number;
    pulseIntensity: number;
  };
  completionEffect: {
    active: boolean;
    explosionRadius: number;
    maxRadius: number;
    flashIntensity: number;
    shakeIntensity: number;
    duration: number;
    maxDuration: number;
  };
}

export class ChainDetonationManager {
  private activeChain: ChainDetonation | null = null;
  private lastSpawnTime: number = 0;
  private spawnCooldown: number = 15000; // 15 seconds minimum between spawns
  private spawnChance: number = 0.15; // 15% chance per check
  private checkInterval: number = 2000; // Check every 2 seconds
  private lastCheckTime: number = 0;

  constructor(private canvasWidth: number, private canvasHeight: number) {}

  update(deltaTime: number, currentTime: number): void {
    // Check for new chain spawns
    if (!this.activeChain && currentTime - this.lastCheckTime >= this.checkInterval) {
      this.checkForSpawn(currentTime);
      this.lastCheckTime = currentTime;
    }

    // Update active chain
    if (this.activeChain) {
      this.updateActiveChain(deltaTime, currentTime);
    }
  }

  private checkForSpawn(currentTime: number): void {
    if (currentTime - this.lastSpawnTime < this.spawnCooldown) return;

    if (Math.random() < this.spawnChance) {
      this.spawnChainDetonation(currentTime);
    }
  }

  private spawnChainDetonation(currentTime: number): void {
    const fragments: ChainFragment[] = [];
    const margin = 100; // Keep fragments away from edges
    const minDistance = 150; // Minimum distance between fragments

    // Generate 4 fragment positions
    for (let i = 0; i < 4; i++) {
      let attempts = 0;
      let validPosition = false;
      let x, y;

      while (!validPosition && attempts < 50) {
        x = margin + Math.random() * (this.canvasWidth - margin * 2);
        y = margin + Math.random() * (this.canvasHeight - margin * 2);

        // Check distance from other fragments
        validPosition = fragments.every(fragment => {
          const dx = fragment.x - x!;
          const dy = fragment.y - y!;
          return Math.sqrt(dx * dx + dy * dy) >= minDistance;
        });

        attempts++;
      }

      if (validPosition) {
        fragments.push({
          id: `fragment_${i}_${currentTime}`,
          x: x!,
          y: y!,
          collected: false,
          pulsePhase: Math.random() * Math.PI * 2,
          electricArcs: [],
          collectionEffect: {
            active: false,
            particles: []
          }
        });
      }
    }

    // Create electric arcs between fragments
    fragments.forEach((fragment, index) => {
      fragments.forEach((otherFragment, otherIndex) => {
        if (index !== otherIndex) {
          fragment.electricArcs.push({
            targetId: otherFragment.id,
            intensity: 0.5 + Math.random() * 0.5,
            flickerPhase: Math.random() * Math.PI * 2
          });
        }
      });
    });

    this.activeChain = {
      id: `chain_${currentTime}`,
      active: true,
      fragments,
      timeRemaining: 5000, // 5 seconds - much more urgent!
      maxTime: 5000,
      collectedCount: 0,
      totalFragments: 4,
      screenEffect: {
        edgeGlow: 0,
        pulseIntensity: 0
      },
      completionEffect: {
        active: false,
        explosionRadius: 0,
        maxRadius: Math.max(this.canvasWidth, this.canvasHeight) * 1.5,
        flashIntensity: 0,
        shakeIntensity: 0,
        duration: 0,
        maxDuration: 2000
      }
    };

    this.lastSpawnTime = currentTime;
    console.log('🔗 Chain Detonation spawned! Collect all 4 fragments within 5 seconds!');
  }

  private updateActiveChain(deltaTime: number, currentTime: number): void {
    if (!this.activeChain) return;

    // Update completion effect
    if (this.activeChain.completionEffect.active) {
      this.updateCompletionEffect(deltaTime);
      return;
    }

    // Update timer
    this.activeChain.timeRemaining -= deltaTime;

    // Update screen effects
    const timeProgress = 1 - (this.activeChain.timeRemaining / this.activeChain.maxTime);
    this.activeChain.screenEffect.edgeGlow = 0.3 + Math.sin(currentTime * 0.005) * 0.2;
    this.activeChain.screenEffect.pulseIntensity = timeProgress * 0.5;

    // Update fragments
    this.activeChain.fragments.forEach(fragment => {
      if (!fragment.collected) {
        fragment.pulsePhase += deltaTime * 0.008;
        
        // Update electric arcs
        fragment.electricArcs.forEach(arc => {
          arc.flickerPhase += deltaTime * 0.01;
          arc.intensity = 0.3 + Math.sin(arc.flickerPhase) * 0.4;
        });
      }

      // Update collection effect particles
      if (fragment.collectionEffect.active) {
        fragment.collectionEffect.particles = fragment.collectionEffect.particles.filter(particle => {
          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.vx *= 0.98;
          particle.vy *= 0.98;
          particle.alpha *= 0.95;
          particle.life--;
          return particle.life > 0 && particle.alpha > 0.01;
        });

        if (fragment.collectionEffect.particles.length === 0) {
          fragment.collectionEffect.active = false;
        }
      }
    });

    // Check for timeout
    if (this.activeChain.timeRemaining <= 0) {
      this.expireChain();
    }
  }

  private updateCompletionEffect(deltaTime: number): void {
    if (!this.activeChain?.completionEffect.active) return;

    const effect = this.activeChain.completionEffect;
    effect.duration += deltaTime;

    const progress = effect.duration / effect.maxDuration;
    
    // Explosion expansion
    if (progress < 0.3) {
      effect.explosionRadius = (progress / 0.3) * effect.maxRadius;
      effect.flashIntensity = 1;
      effect.shakeIntensity = 20;
    } else if (progress < 0.7) {
      effect.explosionRadius = effect.maxRadius;
      effect.flashIntensity = 1 - ((progress - 0.3) / 0.4);
      effect.shakeIntensity = 20 * (1 - ((progress - 0.3) / 0.4));
    } else {
      effect.flashIntensity = 0;
      effect.shakeIntensity = 0;
    }

    // Complete the effect
    if (progress >= 1) {
      this.activeChain = null;
    }
  }

  checkCollision(playerX: number, playerY: number): { collected: boolean; fragment?: ChainFragment; completed?: boolean } {
    if (!this.activeChain) return { collected: false };

    // Safety check to ensure activeChain is still valid
    if (!this.activeChain.active || !this.activeChain.fragments) {
      return { collected: false };
    }

    for (const fragment of this.activeChain.fragments) {
      if (fragment.collected) continue;

      const dx = fragment.x - playerX;
      const dy = fragment.y - playerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 25) { // Collection radius
        fragment.collected = true;
        this.activeChain.collectedCount++;

        // Create collection effect
        try {
          this.createCollectionEffect(fragment);
        } catch (error) {
          console.warn('Error creating collection effect:', error);
        }

        console.log(`🔗 Fragment collected! ${this.activeChain.collectedCount}/${this.activeChain.totalFragments}`);

        // Check for completion
        if (this.activeChain.collectedCount >= this.activeChain.totalFragments) {
          try {
            this.triggerCompletion();
          } catch (error) {
            console.error('Error triggering completion:', error);
            // Fallback: just clear the chain
            this.activeChain = null;
            return { collected: true, fragment };
          }
          return { collected: true, fragment, completed: true };
        }

        return { collected: true, fragment };
      }
    }

    return { collected: false };
  }

  private createCollectionEffect(fragment: ChainFragment): void {
    // Safety checks
    if (!fragment || !fragment.collectionEffect) {
      console.warn('Invalid fragment for collection effect');
      return;
    }

    fragment.collectionEffect.active = true;
    
    // Ensure particles array exists and is empty
    if (!Array.isArray(fragment.collectionEffect.particles)) {
      fragment.collectionEffect.particles = [];
    } else {
      fragment.collectionEffect.particles.length = 0;
    }

    // Create burst of purple particles
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const speed = 3 + Math.random() * 4;
      
      try {
        fragment.collectionEffect.particles.push({
          x: fragment.x || 0,
          y: fragment.y || 0,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          life: 30 + Math.random() * 20
        });
      } catch (error) {
        console.warn('Error adding particle:', error);
        break; // Stop adding particles if there's an error
      }
    }
  }

  private triggerCompletion(): void {
    if (!this.activeChain) return;

    // Safety check
    if (!this.activeChain.completionEffect) {
      console.warn('Invalid completion effect structure');
      this.activeChain = null;
      return;
    }

    this.activeChain.completionEffect.active = true;
    this.activeChain.completionEffect.duration = 0;
    
    console.log('🔗💥 CHAIN DETONATION COMPLETE! Screen clearing explosion triggered!');

    // Dispatch completion event for game engine with error handling
    try {
      window.dispatchEvent(new CustomEvent('chainDetonationComplete', {
        detail: {
          centerX: this.canvasWidth / 2,
          centerY: this.canvasHeight / 2,
          timestamp: performance.now()
        }
      }));
    } catch (error) {
      console.error('Error dispatching chain detonation event:', error);
    }
  }

  private expireChain(): void {
    console.log('🔗⏰ Chain Detonation expired - fragments disappeared');
    this.activeChain = null;
  }

  getActiveChain(): ChainDetonation | null {
    return this.activeChain;
  }

  getTimeRemaining(): number {
    return this.activeChain?.timeRemaining || 0;
  }

  getProgress(): { collected: number; total: number } {
    if (!this.activeChain) return { collected: 0, total: 0 };
    return {
      collected: this.activeChain.collectedCount,
      total: this.activeChain.totalFragments
    };
  }

  isActive(): boolean {
    return this.activeChain !== null && !this.activeChain.completionEffect.active;
  }

  isCompleting(): boolean {
    return this.activeChain?.completionEffect.active || false;
  }

  getScreenEffects(): { edgeGlow: number; pulseIntensity: number; flashIntensity: number; shakeIntensity: number } {
    if (!this.activeChain) return { edgeGlow: 0, pulseIntensity: 0, flashIntensity: 0, shakeIntensity: 0 };
    
    return {
      edgeGlow: this.activeChain.screenEffect.edgeGlow,
      pulseIntensity: this.activeChain.screenEffect.pulseIntensity,
      flashIntensity: this.activeChain.completionEffect.flashIntensity,
      shakeIntensity: this.activeChain.completionEffect.shakeIntensity
    };
  }

  updateCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  reset(): void {
    this.activeChain = null;
    this.lastSpawnTime = 0;
    this.lastCheckTime = 0;
  }
}