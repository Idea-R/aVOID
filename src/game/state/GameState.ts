// Extracted from Engine.ts on January 7, 2025
// Original Engine.ts: 887 lines -> Refactored into modular architecture

import { ScoreBreakdown, ComboInfo } from '../systems/ScoreSystem';
import { GameSettings, GameStats } from '../GameLogic';

/**
 * GameState manages game state updates and user statistics.
 * Extracted from Engine.ts to maintain separation of concerns and stay under 500-line limit.
 */
export class GameState {
  // State update callback
  onStateUpdate: (state: GameStateData) => void = () => {};
  
  // Game over callbacks
  private onGameOverCallback: () => void = () => {};
  private onStatsUpdateCallback: (stats: GameStats) => void = () => {};
  
  constructor() {
    console.log('[STATE] GameState initialized');
  }
  
  /**
   * Set callback functions for state management
   */
  setCallbacks(
    onStateUpdate: (state: GameStateData) => void,
    onGameOver: () => void,
    onStatsUpdate: (stats: GameStats) => void
  ): void {
    this.onStateUpdate = onStateUpdate;
    this.onGameOverCallback = onGameOver;
    this.onStatsUpdateCallback = onStatsUpdate;
  }
  
  /**
   * Trigger a state update with current game data
   */
  triggerStateUpdate(gameData: {
    score: number;
    scoreBreakdown: ScoreBreakdown;
    comboInfo: ComboInfo;
    powerUpCharges: number;
    maxPowerUpCharges: number;
    time: number;
    isGameOver: boolean;
    fps: number;
    meteors: number;
    particles: number;
    poolSizes: { meteors: number; particles: number };
    autoScaling: { enabled: boolean; shadowsEnabled: boolean; maxParticles: number; adaptiveTrailsActive: boolean };
    performance: { averageFrameTime: number; memoryUsage: number; lastScalingEvent: string };
    settings: GameSettings;
  }): void {
    this.onStateUpdate(gameData);
  }
  
  /**
   * Handle game over event
   */
  handleGameOver(): void {
    console.log('[STATE] Game over detected, updating user statistics');
    
    // Update user statistics if authenticated
    this.updateUserStatistics();
    
    // Call the game over callback
    this.onGameOverCallback();
  }
  
  /**
   * Handle stats update event
   */
  handleStatsUpdate(stats: GameStats): void {
    // Stats are handled within the main state update
    // This could be used for additional processing if needed
    this.onStatsUpdateCallback(stats);
  }
  
  /**
   * Update user statistics in the database
   */
  private async updateUserStatistics(): Promise<void> {
    try {
      // Import ProfileAPI dynamically to avoid circular dependencies
      const { ProfileAPI } = await import('../../api/profiles');
      const { useAuthStore } = await import('../../store/authStore');
      
      const authStore = useAuthStore.getState();
      const user = authStore.user;
      
      if (user) {
        // Get game statistics from the current game session
        // Note: These would need to be passed in or accessed through the system
        // For now, using placeholder values - this should be connected to actual game stats
        await ProfileAPI.updateGameStats(user.id, {
          gamesPlayed: 1,
          meteorsDestroyed: 0, // TODO: Get from game logic
          survivalTime: 0, // TODO: Get from game logic
          distanceTraveled: 0, // TODO: Get from game logic
          currentScore: 0, // TODO: Get from score system
          currentMeteors: 0, // TODO: Get from game logic
          currentSurvivalTime: 0, // TODO: Get from game logic
          currentDistance: 0 // TODO: Get from game logic
        });
        
        console.log('📊 User statistics updated successfully');
      }
    } catch (error) {
      console.warn('Failed to update user statistics:', error);
    }
  }
  
  /**
   * Update user statistics with actual game data
   */
  async updateUserStatisticsWithData(gameStats: GameStats, totalScore: number): Promise<void> {
    try {
      // Import ProfileAPI dynamically to avoid circular dependencies
      const { ProfileAPI } = await import('../../api/profiles');
      const { useAuthStore } = await import('../../store/authStore');
      
      const authStore = useAuthStore.getState();
      const user = authStore.user;
      
      if (user) {
        await ProfileAPI.updateGameStats(user.id, {
          gamesPlayed: 1,
          meteorsDestroyed: gameStats.meteorsDestroyed,
          survivalTime: gameStats.survivalTime,
          distanceTraveled: Math.floor(gameStats.distanceTraveled),
          currentScore: totalScore,
          currentMeteors: gameStats.meteorsDestroyed,
          currentSurvivalTime: gameStats.survivalTime,
          currentDistance: Math.floor(gameStats.distanceTraveled)
        });
        
        console.log('📊 User statistics updated:', {
          meteorsDestroyed: gameStats.meteorsDestroyed,
          survivalTime: gameStats.survivalTime.toFixed(1),
          distanceTraveled: Math.floor(gameStats.distanceTraveled),
          score: totalScore
        });
      }
    } catch (error) {
      console.warn('Failed to update user statistics:', error);
    }
  }
  
  /**
   * Reset game state
   */
  reset(): void {
    console.log('[STATE] Game state reset');
    // Any state-specific reset logic would go here
  }
}

/**
 * Type definition for game state data
 */
export interface GameStateData {
  score: number;
  scoreBreakdown: ScoreBreakdown;
  comboInfo: ComboInfo;
  powerUpCharges: number;
  maxPowerUpCharges: number;
  time: number;
  isGameOver: boolean;
  fps: number;
  meteors: number;
  particles: number;
  poolSizes: { meteors: number; particles: number };
  autoScaling: { enabled: boolean; shadowsEnabled: boolean; maxParticles: number; adaptiveTrailsActive: boolean };
  performance: { averageFrameTime: number; memoryUsage: number; lastScalingEvent: string };
  settings: GameSettings;
}