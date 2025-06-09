export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  active: boolean;
  // Optional custom behavior properties
  customBehavior?: string;
  behaviorTimer?: number;
  initialVx?: number;
  initialVy?: number;
  // Canvas ring properties
  maxRadius?: number;
  ringIndex?: number;
  initialSize?: number;
}

export function createParticle(): Particle {
  return {
    id: '',
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 0,
    color: '',
    alpha: 0,
    life: 0,
    maxLife: 0,
    active: false
  };
}

export function resetParticle(particle: Particle): void {
  particle.id = '';
  particle.x = 0;
  particle.y = 0;
  particle.vx = 0;
  particle.vy = 0;
  particle.radius = 0;
  particle.color = '';
  particle.alpha = 0;
  particle.life = 0;
  particle.maxLife = 0;
  particle.active = false;
  // Reset custom behavior properties
  particle.customBehavior = undefined;
  particle.behaviorTimer = undefined;
  particle.initialVx = undefined;
  particle.initialVy = undefined;
  // Reset canvas ring properties
  particle.maxRadius = undefined;
  particle.ringIndex = undefined;
  particle.initialSize = undefined;
}

export function initializeParticle(
  particle: Particle,
  x: number,
  y: number,
  vx: number,
  vy: number,
  radius: number,
  color: string,
  life: number
): void {
  particle.id = Math.random().toString(36).substr(2, 9);
  particle.x = x;
  particle.y = y;
  particle.vx = vx;
  particle.vy = vy;
  particle.radius = radius;
  particle.color = color;
  particle.alpha = 1;
  particle.life = life;
  particle.maxLife = life;
  particle.active = true;
}