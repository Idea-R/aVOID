// Refactored from monolithic Engine.ts - Phase 2 Modular Architecture
// Original GameEngine.ts: 424 lines -> Split into modular components

import { GameEngineCore } from './GameEngineCore';
import { GameEngineUtilities } from './GameEngineUtilities';
import { GameStateData } from '../state/GameState';
import { GameSettings } from '../GameLogic';

/**
 * GameEngine coordinates all game systems through a modular architecture.
 * Refactored to delegate functionality to GameEngineCore and GameEngineUtilities.
 */
export default class GameEngine {
  private core: GameEngineCore;
  private utilities: GameEngineUtilities;

  // State callbacks - forwarded to core
  onStateUpdate: (state: GameStateData) => void = () => {};

  constructor(canvas: HTMLCanvasElement) {
    console.log('[ENGINE] GameEngine constructor called');
    
    this.core = new GameEngineCore(canvas);
    this.utilities = new GameEngineUtilities(this.core);
    
    // Forward state updates from core to public API
    this.core.onStateUpdate = (state: GameStateData) => {
      this.onStateUpdate(state);
    };
    
    console.log('[ENGINE] GameEngine initialized successfully');
  }

  // Core lifecycle methods - delegate to core
  start(): void {
    this.core.start();
  }
  
  preWarm(): void {
    this.core.preWarm();
  }
  
  stop(): void {
    this.core.stop();
  }
  
  resetGame(): void {
    this.core.resetGame();
  }
  
  pause(): void {
    this.core.pause();
  }
  
  resume(): void {
    this.core.resume();
  }

  // State checking methods - delegate to utilities
  isStarted(): boolean {
    return this.utilities.isStarted();
  }
  
  isPausedState(): boolean {
    return this.utilities.isPausedState();
  }
  
  getGameOverState(): boolean {
    return this.utilities.getGameOverState();
  }

  // Settings management - delegate to utilities
  getSettings(): GameSettings {
    return this.utilities.getSettings();
  }
  
  setPerformanceMode(enabled: boolean): void {
    this.utilities.setPerformanceMode(enabled);
    // Trigger priority update for immediate UI feedback
    this.core.triggerPriorityUpdate();
  }
  
  getPerformanceMode(): boolean {
    return this.utilities.getPerformanceMode();
  }
  
  setAutoPerformanceModeEnabled(enabled: boolean): void {
    this.utilities.setAutoPerformanceModeEnabled(enabled);
  }
  
  getAutoPerformanceModeEnabled(): boolean {
    return this.utilities.getAutoPerformanceModeEnabled();
  }
  
  setAutoScalingEnabled(enabled: boolean): void {
    this.utilities.setAutoScalingEnabled(enabled);
  }
  
  getAutoScalingEnabled(): boolean {
    return this.utilities.getAutoScalingEnabled();
  }

  // Performance monitoring - delegate to utilities
  getPerformanceStats() {
    return this.utilities.getPerformanceStats();
  }

  // Audio control methods - delegate to utilities
  getAudioManager() {
    return this.utilities.getAudioManager();
  }
  
  async changeTrack(trackName: string): Promise<boolean> {
    return await this.utilities.changeTrack(trackName);
  }
  
  setMasterVolume(volume: number): void {
    this.utilities.setMasterVolume(volume);
  }
  
  setMusicVolume(volume: number): void {
    this.utilities.setMusicVolume(volume);
  }
  
  toggleMusic(): void {
    this.utilities.toggleMusic();
  }
}