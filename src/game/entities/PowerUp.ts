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
  driftDirection: { x: number; y: number };
  driftSpeed: number;
  driftChangeTimer: number;
  floatingSparkles: Array<{
    x: number;
    y: number;
    angle: number;
    distance: number;
    alpha: number;
    size: number;
    rotationSpeed: number;
  }>;
  energyWaves: Array<{
    radius: number;
    alpha: number;
    growthRate: number;
  }>;
}

export class PowerUpManager {
  private powerUps: PowerUp[] = [];
  private lastSpawnTime: number = 0;
  private spawnInterval: number = 15000; // Start at 15 seconds
  private playerCharges: number = 0;
  private maxCharges: number = 3;
  private readonly MAX_POWERUPS_ON_SCREEN = 2;
  private canvasWidth: number = window.innerWidth;
  private canvasHeight: number = window.innerHeight;
  
  // Performance optimization properties
  private performanceMode: boolean = false;
  private isMobile: boolean = false;

  constructor() {
    // Detect mobile device for performance optimizations
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                    window.innerWidth < 768;
    this.performanceMode = this.isMobile; // Default to performance mode on mobile
    
    console.log('🔋 PowerUpManager initialized:', {
      isMobile: this.isMobile,
      performanceMode: this.performanceMode
    });
  }

  // Update performance mode based on current settings
  updatePerformanceMode(enabled: boolean): void {
    this.performanceMode = enabled || this.isMobile; // Always use performance mode on mobile
  }

  update(gameTime: number, deltaTime: number) {
    // Update canvas dimensions for boundary detection
    this.canvasWidth = window.innerWidth;
    this.canvasHeight = window.innerHeight;

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

      // Handle movement - either magnetic attraction or random drift
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
      } else {
        // Random drift movement when not magnetically attracted
        this.updateDriftMovement(powerUp, deltaTime);
      }

      // Update floating sparkles
      this.updateFloatingSparkles(powerUp, deltaTime);

      // Update energy waves
      this.updateEnergyWaves(powerUp, deltaTime);
    });
  }

  private updateDriftMovement(powerUp: PowerUp, deltaTime: number): void {
    // Update drift direction change timer
    powerUp.driftChangeTimer -= deltaTime;
    
    // Change drift direction periodically (every 3-6 seconds)
    if (powerUp.driftChangeTimer <= 0) {
      const angle = Math.random() * Math.PI * 2;
      powerUp.driftDirection.x = Math.cos(angle);
      powerUp.driftDirection.y = Math.sin(angle);
      powerUp.driftSpeed = 0.3 + Math.random() * 0.4; // Speed between 0.3-0.7
      powerUp.driftChangeTimer = 3000 + Math.random() * 3000; // 3-6 seconds
    }

    // Apply drift movement
    const moveX = powerUp.driftDirection.x * powerUp.driftSpeed * deltaTime * 0.1;
    const moveY = powerUp.driftDirection.y * powerUp.driftSpeed * deltaTime * 0.1;
    
    powerUp.x += moveX;
    powerUp.y += moveY;

    // Keep power-up within screen bounds with padding
    const padding = 50;
    if (powerUp.x < padding) {
      powerUp.x = padding;
      powerUp.driftDirection.x = Math.abs(powerUp.driftDirection.x); // Bounce off left edge
    } else if (powerUp.x > this.canvasWidth - padding) {
      powerUp.x = this.canvasWidth - padding;
      powerUp.driftDirection.x = -Math.abs(powerUp.driftDirection.x); // Bounce off right edge
    }
    
    if (powerUp.y < padding) {
      powerUp.y = padding;
      powerUp.driftDirection.y = Math.abs(powerUp.driftDirection.y); // Bounce off top edge
    } else if (powerUp.y > this.canvasHeight - padding) {
      powerUp.y = this.canvasHeight - padding;
      powerUp.driftDirection.y = -Math.abs(powerUp.driftDirection.y); // Bounce off bottom edge
    }
  }

  private updateFloatingSparkles(powerUp: PowerUp, deltaTime: number): void {
    powerUp.floatingSparkles.forEach(sparkle => {
      // Update sparkle rotation around power-up
      sparkle.angle += sparkle.rotationSpeed * deltaTime * 0.001;
      if (sparkle.angle > Math.PI * 2) sparkle.angle -= Math.PI * 2;

      // Update position based on angle and distance
      sparkle.x = powerUp.x + Math.cos(sparkle.angle) * sparkle.distance;
      sparkle.y = powerUp.y + Math.sin(sparkle.angle) * sparkle.distance;

      // Pulsing alpha animation
      sparkle.alpha = 0.4 + Math.sin(powerUp.pulsePhase * 2 + sparkle.angle) * 0.3;
      
      // Slight size variation
      sparkle.size = 1.5 + Math.sin(powerUp.pulsePhase * 3 + sparkle.angle) * 0.5;
    });
  }

  private updateEnergyWaves(powerUp: PowerUp, deltaTime: number): void {
    // Skip expensive energy waves in performance mode
    if (this.performanceMode) {
      // Simple breathing effect only
      powerUp.energyWaves = []; // Clear existing waves
      return;
    }
    
    // Full desktop effect
    // Update existing waves
    powerUp.energyWaves.forEach((wave, index) => {
      wave.radius += wave.growthRate * deltaTime * 0.1;
      wave.alpha *= 0.995; // Fade out gradually
      
      // Remove waves that are too faded or too large
      if (wave.alpha < 0.05 || wave.radius > 80) {
        powerUp.energyWaves.splice(index, 1);
      }
    });

    // Spawn new energy waves periodically (reduced frequency for performance)
    if (Math.random() < 0.001 * deltaTime) { // Reduced from 0.002 to 0.001
      powerUp.energyWaves.push({
        radius: powerUp.radius * 1.2,
        alpha: 0.6,
        growthRate: 0.8 + Math.random() * 0.4
      });
    }
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

    // Initialize drift movement
    const driftAngle = Math.random() * Math.PI * 2;
    const driftDirection = {
      x: Math.cos(driftAngle),
      y: Math.sin(driftAngle)
    };

    // Create floating sparkles around the power-up
    const sparkleCount = 8 + Math.floor(Math.random() * 4); // 8-12 sparkles
    const floatingSparkles = [];
    for (let i = 0; i < sparkleCount; i++) {
      floatingSparkles.push({
        x: x,
        y: y,
        angle: (Math.PI * 2 * i) / sparkleCount + Math.random() * 0.5,
        distance: 50 + Math.random() * 30, // 50-80px from center
        alpha: 0.5 + Math.random() * 0.3,
        size: 1 + Math.random() * 2,
        rotationSpeed: 0.2 + Math.random() * 0.6 // Varying rotation speeds
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
      collectionTrail: [],
      driftDirection,
      driftSpeed: 0.3 + Math.random() * 0.4,
      driftChangeTimer: 3000 + Math.random() * 3000, // 3-6 seconds
      floatingSparkles,
      energyWaves: []
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
          console.log('🔋 Power-up collected! Charges:', this.playerCharges, '/', this.maxCharges);
          return powerUp;
        } else {
          console.log('🔋 Power-up collected but charges are full:', this.playerCharges, '/', this.maxCharges);
          return powerUp; // Still return the power-up for visual effects
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