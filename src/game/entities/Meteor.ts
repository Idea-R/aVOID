export interface Meteor {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  gradient: CanvasGradient | null;
  gradientCacheKey: string;
  trail: Array<{ x: number; y: number; alpha: number }>;
  isSuper: boolean;
  active: boolean;
}

export function createMeteor(): Meteor {
  return {
    id: '',
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 0,
    color: '',
    gradient: null,
    gradientCacheKey: '',
    trail: [],
    isSuper: false,
    active: false
  };
}

export function resetMeteor(meteor: Meteor): void {
  meteor.id = '';
  meteor.x = 0;
  meteor.y = 0;
  meteor.vx = 0;
  meteor.vy = 0;
  meteor.radius = 0;
  meteor.color = '';
  meteor.gradient = null;
  meteor.gradientCacheKey = '';
  meteor.trail.length = 0;
  meteor.isSuper = false;
  meteor.active = false;
}

export function initializeMeteor(
  meteor: Meteor,
  x: number,
  y: number,
  vx: number,
  vy: number,
  radius: number,
  color: string,
  isSuper: boolean
): void {
  meteor.id = Math.random().toString(36).substr(2, 9);
  meteor.x = x;
  meteor.y = y;
  meteor.vx = vx;
  meteor.vy = vy;
  meteor.radius = radius;
  meteor.color = color;
  meteor.isSuper = isSuper;
  meteor.active = true;
  meteor.trail.length = 0;
  
  // Create cache key for gradient (radius + color + isSuper)
  meteor.gradientCacheKey = `${Math.round(radius)}_${color}_${isSuper}`;
  meteor.gradient = null; // Will be created on first render
}