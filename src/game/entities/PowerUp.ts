export interface PowerUp {
  x: number;
  y: number;
  radius: number;
  type: 'knockback';
  collected: boolean;
  pulsePhase: number;
  glowIntensity: number;
}

export class PowerUpManager {
  private powerUps: PowerUp[] = [];
  private lastSpawnTime: number = 0;
  private spawnInterval: number = 30000; // 30 seconds

  update(gameTime: number, deltaTime: number) {
    // Spawn power-up every 30 seconds
    if (gameTime * 1000 - this.lastSpawnTime >= this.spawnInterval) {
      this.spawnPowerUp();
      this.lastSpawnTime = gameTime * 1000;
    }

    // Update existing power-ups
    this.powerUps.forEach(powerUp => {
      powerUp.pulsePhase += deltaTime * 0.005;
      powerUp.glowIntensity = 0.5 + Math.sin(powerUp.pulsePhase) * 0.5;
    });
  }

  private spawnPowerUp() {
    // Spawn away from edges to ensure visibility
    const margin = 100;
    const x = margin + Math.random() * (window.innerWidth - margin * 2);
    const y = margin + Math.random() * (window.innerHeight - margin * 2);

    this.powerUps.push({
      x,
      y,
      radius: 20,
      type: 'knockback',
      collected: false,
      pulsePhase: 0,
      glowIntensity: 1
    });
  }

  checkCollision(playerX: number, playerY: number): PowerUp | null {
    for (const powerUp of this.powerUps) {
      if (powerUp.collected) continue;

      const dx = powerUp.x - playerX;
      const dy = powerUp.y - playerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < powerUp.radius + 8) { // 8 is player radius
        powerUp.collected = true;
        return powerUp;
      }
    }
    return null;
  }

  getPowerUps(): PowerUp[] {
    return this.powerUps.filter(p => !p.collected);
  }

  reset() {
    this.powerUps = [];
    this.lastSpawnTime = 0;
  }
}