export interface PowerUp {
  x: number;
  y: number;
  radius: number;
  type: 'knockback';
  collected: boolean;
  pulsePhase: number;
  glowIntensity: number;
  orbitingParticles: Array<{
    angle: number;
    distance: number;
    speed: number;
  }>;
  magneticEffect: {
    isActive: boolean;
    targetX: number;
    targetY: number;
  };
  breathingScale: number;
  collectionTrail: Array<{ x: number; y: number; alpha: number }>;
}

export class PowerUpManager {
  private powerUps: PowerUp[] = [];
  private lastSpawnTime: number = 0;
  private spawnInterval: number = 15000; // Start at 15 seconds
  private playerCharges: number = 0;
  private maxCharges: number = 3;
  private readonly MAX_POWERUPS_ON_SCREEN = 2;

  update(gameTime: number, deltaTime: number) {
    // Dynamic spawn rate based on game time
    const progressiveSpawnRate = this.getProgressiveSpawnRate(gameTime);
    
    // Spawn power-up based on dynamic interval
    if (gameTime * 1000 - this.lastSpawnTime >= progressiveSpawnRate) {
      // Only spawn if we haven't reached the screen limit
      if (this.getActivePowerUps().length < this.MAX_POWERUPS_ON_SCREEN) {
        this.spawnPowerUp();
        this.lastSpawnTime = gameTime * 1000;
      }
    }

    // Update existing power-ups
    this.powerUps.forEach(powerUp => {
      if (powerUp.collected) return;

      // Update pulsing animation
      powerUp.pulsePhase += deltaTime * 0.005;
      powerUp.glowIntensity = 0.5 + Math.sin(powerUp.pulsePhase) * 0.5;
      
      // Update breathing scale effect
      powerUp.breathingScale = 0.9 + Math.sin(powerUp.pulsePhase * 1.5) * 0.1;
      
      // Update orbiting particles
      powerUp.orbitingParticles.forEach(particle => {
        particle.angle += particle.speed * deltaTime * 0.001;
        if (particle.angle > Math.PI * 2) particle.angle -= Math.PI * 2;
      });
      
      // Update magnetic effect trail
      if (powerUp.magneticEffect.isActive) {
        // Move toward target with smooth interpolation
        const dx = powerUp.magneticEffect.targetX - powerUp.x;
        const dy = powerUp.magneticEffect.targetY - powerUp.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 5) {
          const moveSpeed = 0.15; // Gentle magnetic pull
          powerUp.x += dx * moveSpeed;
          powerUp.y += dy * moveSpeed;
          
          // Add trail points during magnetic movement
          powerUp.collectionTrail.unshift({ x: powerUp.x, y: powerUp.y, alpha: 1 });
          if (powerUp.collectionTrail.length > 8) powerUp.collectionTrail.pop();
          powerUp.collectionTrail.forEach(point => point.alpha *= 0.85);
        }
      }
    });
  }

  private getProgressiveSpawnRate(gameTime: number): number {
    // After 60 seconds, reduce spawn interval from 5-20s to 3-12s
    if (gameTime >= 60) {
      return Math.random() * 9000 + 3000; // 3-12 seconds
    } else {
      return Math.random() * 15000 + 5000; // 5-20 seconds
    }
  }

  private spawnPowerUp() {
    // Spawn away from edges to ensure visibility
    const margin = 100;
    const x = margin + Math.random() * (window.innerWidth - margin * 2);
    const y = margin + Math.random() * (window.innerHeight - margin * 2);

    // Create orbiting particles (3-4 cyan particles)
    const particleCount = 3 + Math.floor(Math.random() * 2); // 3 or 4 particles
    const orbitingParticles = [];
    
    for (let i = 0; i < particleCount; i++) {
      orbitingParticles.push({
        angle: (Math.PI * 2 * i) / particleCount,
        distance: 35 + Math.random() * 10, // Vary distance slightly
        speed: 0.8 + Math.random() * 0.4 // Vary speed slightly
      });
    }

    this.powerUps.push({
      x,
      y,
      radius: 20,
      type: 'knockback',
      collected: false,
      pulsePhase: 0,
      glowIntensity: 1,
      orbitingParticles,
      magneticEffect: {
        isActive: false,
        targetX: x,
        targetY: y
      },
      breathingScale: 1,
      collectionTrail: []
    });
  }

  checkCollision(playerX: number, playerY: number): PowerUp | null {
    for (const powerUp of this.powerUps) {
      if (powerUp.collected) continue;

      const dx = powerUp.x - playerX;
      const dy = powerUp.y - playerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Activate magnetic effect when player gets within 50px
      if (distance <= 50 && !powerUp.magneticEffect.isActive) {
        powerUp.magneticEffect.isActive = true;
        powerUp.magneticEffect.targetX = playerX;
        powerUp.magneticEffect.targetY = playerY;
      }
      
      // Update magnetic target if already active
      if (powerUp.magneticEffect.isActive && distance <= 50) {
        powerUp.magneticEffect.targetX = playerX;
        powerUp.magneticEffect.targetY = playerY;
      }
      
      // Deactivate magnetic effect if player moves away
      if (distance > 50) {
        powerUp.magneticEffect.isActive = false;
        powerUp.collectionTrail.length = 0; // Clear trail
      }

      // Check for collection
      if (distance < powerUp.radius + 8) { // 8 is player radius
        powerUp.collected = true;
        
        // Add charge (up to max)
        if (this.playerCharges < this.maxCharges) {
          this.playerCharges++;
          return powerUp;
        }
      }
    }
    return null;
  }

  // Use one charge for knockback
  useCharge(): boolean {
    if (this.playerCharges > 0) {
      this.playerCharges--;
      return true;
    }
    return false;
  }

  // Get current charge count
  getCharges(): number {
    return this.playerCharges;
  }

  // Check if player has any charges
  hasCharges(): boolean {
    return this.playerCharges > 0;
  }

  // Get max charges for UI display
  getMaxCharges(): number {
    return this.maxCharges;
  }

  getPowerUps(): PowerUp[] {
    return this.getActivePowerUps();
  }

  private getActivePowerUps(): PowerUp[] {
    return this.powerUps.filter(p => !p.collected);
  }

  reset() {
    this.powerUps = [];
    this.lastSpawnTime = 0;
    this.playerCharges = 0;
  }
}