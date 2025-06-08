export interface GameState {
  isRunning: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  gameTime: number;
  score: number;
  level: number;
}

export class EngineStateManager {
  private gameState: GameState = {
    isRunning: false,
    isPaused: false,
    isGameOver: false,
    gameTime: 0,
    score: 0,
    level: 1
  };

  private onStateChangeCallback: (state: GameState) => void = () => {};

  setStateChangeCallback(callback: (state: GameState) => void): void {
    this.onStateChangeCallback = callback;
  }

  start(): boolean {
    if (this.gameState.isRunning) return false;
    
    this.gameState.isRunning = true;
    this.gameState.isPaused = false;
    this.notifyStateChange();
    
    console.log('🎮 Engine started');
    return true;
  }

  stop(): boolean {
    if (!this.gameState.isRunning) return false;
    
    this.gameState.isRunning = false;
    this.gameState.isPaused = false;
    this.notifyStateChange();
    
    console.log('🎮 Engine stopped');
    return true;
  }

  pause(): boolean {
    if (!this.gameState.isRunning || this.gameState.isPaused) return false;
    
    this.gameState.isPaused = true;
    this.notifyStateChange();
    
    console.log('⏸️ Engine paused');
    return true;
  }

  resume(): boolean {
    if (!this.gameState.isRunning || !this.gameState.isPaused) return false;
    
    this.gameState.isPaused = false;
    this.notifyStateChange();
    
    console.log('▶️ Engine resumed');
    return true;
  }

  setGameOver(isGameOver: boolean): void {
    if (this.gameState.isGameOver !== isGameOver) {
      this.gameState.isGameOver = isGameOver;
      this.notifyStateChange();
      
      if (isGameOver) {
        console.log('💀 Game Over');
      }
    }
  }

  updateGameTime(deltaTime: number): void {
    if (!this.gameState.isGameOver && this.gameState.isRunning && !this.gameState.isPaused) {
      this.gameState.gameTime += deltaTime / 1000;
    }
  }

  updateScore(score: number): void {
    if (this.gameState.score !== score) {
      this.gameState.score = score;
      this.notifyStateChange();
    }
  }

  updateLevel(level: number): void {
    if (this.gameState.level !== level) {
      this.gameState.level = level;
      this.notifyStateChange();
      console.log(`🆙 Level up! Now at level ${level}`);
    }
  }

  reset(): void {
    const wasRunning = this.gameState.isRunning;
    
    this.gameState = {
      isRunning: false,
      isPaused: false,
      isGameOver: false,
      gameTime: 0,
      score: 0,
      level: 1
    };
    
    this.notifyStateChange();
    console.log('🔄 Engine state reset');
  }

  shouldUpdate(): boolean {
    return this.gameState.isRunning && !this.gameState.isPaused && !this.gameState.isGameOver;
  }

  shouldRender(): boolean {
    return this.gameState.isRunning; // Render even when paused for pause overlay
  }

  getState(): Readonly<GameState> {
    return { ...this.gameState };
  }

  isRunning(): boolean {
    return this.gameState.isRunning;
  }

  isPaused(): boolean {
    return this.gameState.isPaused;
  }

  isGameOver(): boolean {
    return this.gameState.isGameOver;
  }

  getGameTime(): number {
    return this.gameState.gameTime;
  }

  getScore(): number {
    return this.gameState.score;
  }

  getLevel(): number {
    return this.gameState.level;
  }

  private notifyStateChange(): void {
    this.onStateChangeCallback(this.getState());
  }
}