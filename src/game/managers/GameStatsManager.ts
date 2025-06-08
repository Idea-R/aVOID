export interface GameStats {
  meteorsDestroyed: number;
  survivalTime: number;
  distanceTraveled: number;
  lastPlayerX: number;
  lastPlayerY: number;
}

export class GameStatsManager {
  private stats: GameStats = {
    meteorsDestroyed: 0,
    survivalTime: 0,
    distanceTraveled: 0,
    lastPlayerX: 0,
    lastPlayerY: 0
  };

  private onStatsUpdate: (stats: GameStats) => void = () => {};

  setStatsUpdateCallback(callback: (stats: GameStats) => void): void {
    this.onStatsUpdate = callback;
  }

  updateSurvivalTime(gameTime: number): void {
    this.stats.survivalTime = gameTime;
    this.notifyStatsUpdate();
  }

  updateDistanceTraveled(playerX: number, playerY: number): void {
    if (this.stats.lastPlayerX !== 0 || this.stats.lastPlayerY !== 0) {
      const dx = playerX - this.stats.lastPlayerX;
      const dy = playerY - this.stats.lastPlayerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      this.stats.distanceTraveled += distance;
    }
    this.stats.lastPlayerX = playerX;
    this.stats.lastPlayerY = playerY;
    this.notifyStatsUpdate();
  }

  incrementMeteorsDestroyed(count: number = 1): void {
    this.stats.meteorsDestroyed += count;
    this.notifyStatsUpdate();
  }

  getStats(): GameStats {
    return { ...this.stats };
  }

  reset(): void {
    this.stats = {
      meteorsDestroyed: 0,
      survivalTime: 0,
      distanceTraveled: 0,
      lastPlayerX: 0,
      lastPlayerY: 0
    };
    this.notifyStatsUpdate();
  }

  private notifyStatsUpdate(): void {
    this.onStatsUpdate(this.stats);
  }
}