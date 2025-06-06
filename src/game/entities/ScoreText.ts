export interface ScoreText {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  text: string;
  color: string;
  fontSize: number;
  alpha: number;
  life: number;
  maxLife: number;
  active: boolean;
  type: 'regular' | 'super' | 'combo' | 'perfect';
}

export function createScoreText(): ScoreText {
  return {
    id: '',
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    text: '',
    color: '',
    fontSize: 16,
    alpha: 1,
    life: 0,
    maxLife: 0,
    active: false,
    type: 'regular'
  };
}

export function resetScoreText(scoreText: ScoreText): void {
  scoreText.id = '';
  scoreText.x = 0;
  scoreText.y = 0;
  scoreText.vx = 0;
  scoreText.vy = 0;
  scoreText.text = '';
  scoreText.color = '';
  scoreText.fontSize = 16;
  scoreText.alpha = 1;
  scoreText.life = 0;
  scoreText.maxLife = 0;
  scoreText.active = false;
  scoreText.type = 'regular';
}

export function initializeScoreText(
  scoreText: ScoreText,
  x: number,
  y: number,
  text: string,
  color: string,
  fontSize: number,
  type: 'regular' | 'super' | 'combo' | 'perfect'
): void {
  scoreText.id = Math.random().toString(36).substr(2, 9);
  scoreText.x = x;
  scoreText.y = y;
  scoreText.vx = (Math.random() - 0.5) * 0.5; // Small horizontal drift
  scoreText.vy = -1.5; // Float upward
  scoreText.text = text;
  scoreText.color = color;
  scoreText.fontSize = fontSize;
  scoreText.alpha = 1;
  scoreText.life = 90; // 1.5 seconds at 60fps
  scoreText.maxLife = 90;
  scoreText.active = true;
  scoreText.type = type;
}