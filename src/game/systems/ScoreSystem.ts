import { ObjectPool } from '../utils/ObjectPool';
import { ScoreText, createScoreText, resetScoreText, initializeScoreText } from '../entities/ScoreText';

export interface ScoreBreakdown {
  survival: number;
  meteors: number;
  combos: number;
  total: number;
}

export interface ComboInfo {
  count: number;
  isActive: boolean;
  lastKnockbackTime: number;
  highestCombo: number;
}

export class ScoreSystem {
  private scoreTextPool: ObjectPool<ScoreText>;
  private activeScoreTexts: ScoreText[] = [];
  private maxScoreTexts: number = 10;
  
  // Score tracking
  private survivalScore: number = 0;
  private meteorScore: number = 0;
  private comboScore: number = 0;
  
  // Combo system
  private comboInfo: ComboInfo = {
    count: 0,
    isActive: false,
    lastKnockbackTime: 0,
    highestCombo: 0
  };
  
  private readonly COMBO_TIMEOUT = 2000; // 2 seconds

  constructor() {
    this.scoreTextPool = new ObjectPool(createScoreText, resetScoreText, 5, this.maxScoreTexts);
  }

  update(deltaTime: number, currentTime: number): void {
    // Update combo timeout
    if (this.comboInfo.isActive && currentTime - this.comboInfo.lastKnockbackTime > this.COMBO_TIMEOUT) {
      this.resetCombo();
    }

    // Update floating score texts
    for (let i = this.activeScoreTexts.length - 1; i >= 0; i--) {
      const scoreText = this.activeScoreTexts[i];
      if (!scoreText.active) continue;

      // Update position
      scoreText.x += scoreText.vx;
      scoreText.y += scoreText.vy;
      
      // Slow down vertical movement over time
      scoreText.vy *= 0.98;
      
      // Update life and alpha
      scoreText.life--;
      scoreText.alpha = scoreText.life / scoreText.maxLife;

      // Remove expired texts
      if (scoreText.life <= 0 || scoreText.alpha <= 0.01) {
        this.releaseScoreText(scoreText);
      }
    }
  }

  // Meteor destruction scoring
  addMeteorScore(x: number, y: number, isSuper: boolean): number {
    const basePoints = isSuper ? 15 : 5;
    const randomBonus = isSuper ? Math.floor(Math.random() * 16) : Math.floor(Math.random() * 11); // 0-15 for super, 0-10 for regular
    const points = basePoints + randomBonus;
    
    this.meteorScore += points;
    
    // Create floating score text
    const color = isSuper ? '#ffd700' : '#06b6d4'; // Gold for super, cyan for regular
    const fontSize = isSuper ? 20 : 16;
    this.createScoreText(x, y, `+${points}`, color, fontSize, isSuper ? 'super' : 'regular');
    
    return points;
  }

  // Deflection scoring for Bolt badge interactions
  addDeflectionScore(x: number, y: number, points: number, isSuper: boolean): number {
    this.meteorScore += points;
    
    // Create floating score text with special deflection styling
    const color = isSuper ? '#00ffff' : '#06b6d4'; // Cyan for deflections
    const fontSize = isSuper ? 22 : 18;
    const text = `DEFLECT +${points}`;
    this.createScoreText(x, y, text, color, fontSize, isSuper ? 'super' : 'regular');
    
    return points;
  }

  // Knockback scoring with combo system
  processKnockbackScore(destroyedMeteors: Array<{ x: number; y: number; isSuper: boolean }>, currentTime: number): number {
    if (destroyedMeteors.length === 0) return 0;

    let totalPoints = 0;
    let meteorPoints = 0;
    
    // Calculate individual meteor scores
    for (const meteor of destroyedMeteors) {
      const points = this.addMeteorScore(meteor.x, meteor.y, meteor.isSuper);
      meteorPoints += points;
    }
    
    totalPoints += meteorPoints;

    // Update combo system
    if (!this.comboInfo.isActive) {
      this.comboInfo.isActive = true;
      this.comboInfo.count = destroyedMeteors.length;
    } else {
      this.comboInfo.count += destroyedMeteors.length;
    }
    
    this.comboInfo.lastKnockbackTime = currentTime;
    
    // Check for combo bonuses
    if (this.comboInfo.count >= 5) {
      const comboBonus = this.calculateComboBonus(this.comboInfo.count);
      this.comboScore += comboBonus;
      totalPoints += comboBonus;
      
      // Update highest combo
      if (this.comboInfo.count > this.comboInfo.highestCombo) {
        this.comboInfo.highestCombo = this.comboInfo.count;
      }
      
      // Show combo text at center of destroyed meteors
      const centerX = destroyedMeteors.reduce((sum, m) => sum + m.x, 0) / destroyedMeteors.length;
      const centerY = destroyedMeteors.reduce((sum, m) => sum + m.y, 0) / destroyedMeteors.length;
      
      this.createComboText(centerX, centerY, this.comboInfo.count, comboBonus);
    }
    
    // Perfect knockback bonus (all meteors in range destroyed)
    const perfectBonus = this.checkPerfectKnockback(destroyedMeteors.length);
    if (perfectBonus > 0) {
      this.comboScore += perfectBonus;
      totalPoints += perfectBonus;
      
      // Show perfect bonus text
      const centerX = destroyedMeteors.reduce((sum, m) => sum + m.x, 0) / destroyedMeteors.length;
      const centerY = destroyedMeteors.reduce((sum, m) => sum + m.y, 0) / destroyedMeteors.length - 30;
      
      this.createScoreText(centerX, centerY, `PERFECT +${perfectBonus}`, '#00ff00', 18, 'perfect');
    }
    
    return totalPoints;
  }

  private calculateComboBonus(comboCount: number): number {
    if (comboCount >= 7) return 50;
    if (comboCount >= 6) return 35;
    if (comboCount >= 5) return 25;
    return 0;
  }

  private checkPerfectKnockback(destroyedCount: number): number {
    // This is a simplified check - in a real implementation, you'd compare
    // destroyed count vs total meteors in knockback range
    // For now, we'll give perfect bonus for destroying 3+ meteors
    return destroyedCount >= 3 ? 10 : 0;
  }

  private createComboText(x: number, y: number, comboCount: number, bonus: number): void {
    const text = `${comboCount}x COMBO! +${bonus}`;
    this.createScoreText(x, y - 20, text, '#00ff00', 24, 'combo');
  }

  private createScoreText(x: number, y: number, text: string, color: string, fontSize: number, type: 'regular' | 'super' | 'combo' | 'perfect'): void {
    // Limit active score texts to prevent performance issues
    if (this.activeScoreTexts.length >= this.maxScoreTexts) {
      // Remove oldest text
      const oldest = this.activeScoreTexts.shift();
      if (oldest) {
        this.scoreTextPool.release(oldest);
      }
    }

    const scoreText = this.scoreTextPool.get();
    initializeScoreText(scoreText, x, y, text, color, fontSize, type);
    this.activeScoreTexts.push(scoreText);
  }

  private releaseScoreText(scoreText: ScoreText): void {
    const index = this.activeScoreTexts.indexOf(scoreText);
    if (index > -1) {
      this.activeScoreTexts.splice(index, 1);
      this.scoreTextPool.release(scoreText);
    }
  }

  private resetCombo(): void {
    this.comboInfo.isActive = false;
    this.comboInfo.count = 0;
  }

  // Survival scoring
  updateSurvivalScore(gameTime: number): void {
    this.survivalScore = Math.floor(gameTime);
  }

  // Public getters
  getActiveScoreTexts(): ScoreText[] {
    return this.activeScoreTexts;
  }

  getTotalScore(): number {
    return this.survivalScore + this.meteorScore + this.comboScore;
  }

  getScoreBreakdown(): ScoreBreakdown {
    return {
      survival: this.survivalScore,
      meteors: this.meteorScore,
      combos: this.comboScore,
      total: this.getTotalScore()
    };
  }

  getComboInfo(): ComboInfo {
    return { ...this.comboInfo };
  }

  // Reset for new game
  reset(): void {
    this.survivalScore = 0;
    this.meteorScore = 0;
    this.comboScore = 0;
    
    this.comboInfo = {
      count: 0,
      isActive: false,
      lastKnockbackTime: 0,
      highestCombo: 0
    };
    
    // Clear all active score texts
    this.activeScoreTexts.forEach(scoreText => this.scoreTextPool.release(scoreText));
    this.activeScoreTexts.length = 0;
  }

  // Performance stats
  getPoolSize(): number {
    return this.scoreTextPool.getPoolSize();
  }

  clear(): void {
    this.reset();
    this.scoreTextPool.clear();
  }
}