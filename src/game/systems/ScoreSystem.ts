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
  streakMultiplier: number;
  consecutiveKnockbacks: number;
}

export class ScoreSystem {
  private scoreTextPool: ObjectPool<ScoreText>;
  private activeScoreTexts: ScoreText[] = [];
  private maxScoreTexts: number = 15;
  
  // Score tracking
  private survivalScore: number = 0;
  private meteorScore: number = 0;
  private comboScore: number = 0;
  
  // Enhanced combo system with streak tracking
  private comboInfo: ComboInfo = {
    count: 0,
    isActive: false,
    lastKnockbackTime: 0,
    highestCombo: 0,
    streakMultiplier: 1.0,
    consecutiveKnockbacks: 0
  };
  
  private readonly COMBO_TIMEOUT = 3000; // Increased to 3 seconds for more forgiving combo timing

  constructor() {
    this.scoreTextPool = new ObjectPool(createScoreText, resetScoreText, 5, this.maxScoreTexts);
  }

  update(deltaTime: number, currentTime: number): void {
    // Update combo timeout with streak decay
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

  // Knockback scoring with enhanced combo and streak system
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

    // Update combo system with streak tracking
    if (!this.comboInfo.isActive) {
      // Starting a new combo
      this.comboInfo.isActive = true;
      this.comboInfo.count = destroyedMeteors.length;
      this.comboInfo.consecutiveKnockbacks = 1;
    } else {
      // Continuing existing combo
      this.comboInfo.count += destroyedMeteors.length;
      this.comboInfo.consecutiveKnockbacks++;
    }
    
    this.comboInfo.lastKnockbackTime = currentTime;
    
    // Calculate streak multiplier based on consecutive knockbacks
    this.updateStreakMultiplier();
    
    // Enhanced combo bonuses - now much more rewarding
    if (this.comboInfo.count >= 3) { // Lowered threshold from 5 to 3
      const comboBonus = this.calculateComboBonus(this.comboInfo.count, this.comboInfo.streakMultiplier);
      this.comboScore += comboBonus;
      totalPoints += comboBonus;
      
      // Update highest combo
      if (this.comboInfo.count > this.comboInfo.highestCombo) {
        this.comboInfo.highestCombo = this.comboInfo.count;
      }
      
      // Show enhanced combo text at center of destroyed meteors
      const centerX = destroyedMeteors.reduce((sum, m) => sum + m.x, 0) / destroyedMeteors.length;
      const centerY = destroyedMeteors.reduce((sum, m) => sum + m.y, 0) / destroyedMeteors.length;
      
      this.createEnhancedComboText(centerX, centerY, this.comboInfo.count, comboBonus, this.comboInfo.streakMultiplier, this.comboInfo.consecutiveKnockbacks);
    }
    
    // Enhanced perfect knockback bonus
    const perfectBonus = this.checkPerfectKnockback(destroyedMeteors.length, this.comboInfo.streakMultiplier);
    if (perfectBonus > 0) {
      this.comboScore += perfectBonus;
      totalPoints += perfectBonus;
      
      // Show perfect bonus text
      const centerX = destroyedMeteors.reduce((sum, m) => sum + m.x, 0) / destroyedMeteors.length;
      const centerY = destroyedMeteors.reduce((sum, m) => sum + m.y, 0) / destroyedMeteors.length - 40;
      
      this.createScoreText(centerX, centerY, `PERFECT +${perfectBonus}`, '#00ff00', 20, 'perfect');
    }
    
    return totalPoints;
  }

  private updateStreakMultiplier(): void {
    // Increase multiplier based on consecutive successful knockbacks
    if (this.comboInfo.consecutiveKnockbacks >= 10) {
      this.comboInfo.streakMultiplier = 3.0; // Master level
    } else if (this.comboInfo.consecutiveKnockbacks >= 7) {
      this.comboInfo.streakMultiplier = 2.5; // Expert level
    } else if (this.comboInfo.consecutiveKnockbacks >= 5) {
      this.comboInfo.streakMultiplier = 2.0; // Advanced level
    } else if (this.comboInfo.consecutiveKnockbacks >= 3) {
      this.comboInfo.streakMultiplier = 1.5; // Intermediate level
    } else {
      this.comboInfo.streakMultiplier = 1.0; // Beginner level
    }
  }

  private calculateComboBonus(comboCount: number, streakMultiplier: number): number {
    let baseBonus = 0;
    
    // Much higher base bonuses
    if (comboCount >= 15) baseBonus = 500;
    else if (comboCount >= 12) baseBonus = 350;
    else if (comboCount >= 10) baseBonus = 250;
    else if (comboCount >= 8) baseBonus = 175;
    else if (comboCount >= 6) baseBonus = 125;
    else if (comboCount >= 5) baseBonus = 100;
    else if (comboCount >= 4) baseBonus = 75;
    else if (comboCount >= 3) baseBonus = 50;
    
    // Apply streak multiplier
    return Math.floor(baseBonus * streakMultiplier);
  }

  private checkPerfectKnockback(destroyedCount: number, streakMultiplier: number): number {
    // Enhanced perfect bonus with streak scaling
    let baseBonus = 0;
    if (destroyedCount >= 5) baseBonus = 50;
    else if (destroyedCount >= 4) baseBonus = 35;
    else if (destroyedCount >= 3) baseBonus = 25;
    
    return Math.floor(baseBonus * streakMultiplier);
  }

  private createEnhancedComboText(x: number, y: number, comboCount: number, bonus: number, streakMultiplier: number, consecutiveKnockbacks: number): void {
    // Main combo text
    const comboText = `${comboCount}x COMBO! +${bonus}`;
    this.createScoreText(x, y - 30, comboText, '#00ff00', 28, 'combo');
    
    // Streak multiplier text if active
    if (streakMultiplier > 1.0) {
      this.createScoreText(x, y - 5, `${streakMultiplier}x STREAK MULTIPLIER`, '#ffd700', 20, 'perfect');
    }
    
    // Consecutive knockback indicator
    if (consecutiveKnockbacks >= 3) {
      const streakText = `${consecutiveKnockbacks} KNOCKBACK STREAK!`;
      this.createScoreText(x, y + 20, streakText, '#ff6b6b', 18, 'super');
    }
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
    // Show streak end notification if it was significant
    if (this.comboInfo.consecutiveKnockbacks >= 5) {
      console.log(`🔥 STREAK ENDED! ${this.comboInfo.consecutiveKnockbacks} consecutive knockbacks with ${this.comboInfo.streakMultiplier}x multiplier`);
    }
    
    this.comboInfo.isActive = false;
    this.comboInfo.count = 0;
    this.comboInfo.streakMultiplier = 1.0;
    this.comboInfo.consecutiveKnockbacks = 0;
  }

  // Survival scoring
  updateSurvivalScore(gameTime: number): void {
    this.survivalScore = Math.floor(gameTime * 5);
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
      highestCombo: 0,
      streakMultiplier: 1.0,
      consecutiveKnockbacks: 0
    };
    
    // Clear all active score texts
    this.activeScoreTexts.forEach(scoreText => this.scoreTextPool.release(scoreText));
    this.activeScoreTexts.length = 0;
  }

  // Performance stats
  getPoolSize(): number {
    return this.scoreTextPool.getPoolSize();
  }

  // Add chain detonation scoring methods
  addChainFragmentScore(x: number, y: number): number {
    const points = 10;
    this.meteorScore += points;
    
    // Create floating score text
    this.createScoreText(x, y, `+${points}`, '#9d4edd', 16, 'regular');
    
    return points;
  }

  // Enhanced chain detonation completion scoring with combo mechanics
  processChainDetonationScore(meteorsDestroyed: number, centerX: number, centerY: number): number {
    if (meteorsDestroyed === 0) return 0;

    let totalPoints = 0;
    
    // Base completion bonus (increased from 150 to 250)
    const completionBonus = 250;
    totalPoints += completionBonus;
    
    // Meteor destruction points with combo scaling based on meteor count
    // Similar to knockback combo system but scaled for screen-clearing power
    let meteorPoints = 0;
    let comboMultiplier = 1;
    
    // Calculate combo multiplier based on meteors destroyed
    if (meteorsDestroyed >= 20) {
      comboMultiplier = 4.0; // Massive bonus for clearing huge screens
    } else if (meteorsDestroyed >= 15) {
      comboMultiplier = 3.0; // Large bonus
    } else if (meteorsDestroyed >= 10) {
      comboMultiplier = 2.5; // Good bonus
    } else if (meteorsDestroyed >= 5) {
      comboMultiplier = 2.0; // Decent bonus
    } else if (meteorsDestroyed >= 3) {
      comboMultiplier = 1.5; // Small bonus
    }
    
    // Base points per meteor (higher than regular destruction due to chain detonation setup cost)
    const basePointsPerMeteor = 30;
    meteorPoints = Math.floor(meteorsDestroyed * basePointsPerMeteor * comboMultiplier);
    totalPoints += meteorPoints;
    
    // Add to meteor score category
    this.meteorScore += totalPoints;
    
    // Create dramatic score display
    this.createScoreText(centerX, centerY - 40, `CHAIN DETONATION!`, '#9d4edd', 32, 'combo');
    this.createScoreText(centerX, centerY - 10, `${meteorsDestroyed} METEORS DESTROYED`, '#e879f9', 24, 'super');
    this.createScoreText(centerX, centerY + 20, `+${totalPoints} POINTS`, '#fbbf24', 28, 'perfect');
    
    // Show combo multiplier if applicable
    if (comboMultiplier > 1) {
      this.createScoreText(centerX, centerY + 50, `${comboMultiplier}x COMBO MULTIPLIER!`, '#00ff00', 20, 'combo');
    }
    
    console.log(`🔗💥 Chain Detonation Score: ${meteorsDestroyed} meteors × ${basePointsPerMeteor} × ${comboMultiplier} + ${completionBonus} bonus = ${totalPoints} total points`);
    
    return totalPoints;
  }

  addChainDetonationScore(totalPoints: number, meteorsDestroyed: number, centerX: number, centerY: number): number {
    this.meteorScore += totalPoints;
    
    // Create dramatic score text
    this.createScoreText(centerX, centerY, `CHAIN DETONATION +${totalPoints}`, '#9d4edd', 28, 'combo');
    
    return totalPoints;
  }

  clear(): void {
    this.reset();
    this.scoreTextPool.clear();
  }
}