import { DefenseZone } from './DefenseCore';

interface ElectricRing {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  thickness: number;
  duration: number;
  maxDuration: number;
}

interface EffectsData {
  lightningBolts: any[];
  electricParticles: any[];
  electricRings: ElectricRing[];
  staticElectricityTimer: number;
}

export class DefenseRenderCore {
  protected canvas: HTMLCanvasElement;
  protected ctx: CanvasRenderingContext2D;
  
  // Color scheme
  protected readonly ELECTRIC_BLUE = '#00bfff';
  protected readonly WHITE_CORE = '#ffffff';
  protected readonly PURPLE_EDGE = '#8a2be2';
  protected readonly ELECTRIC_CYAN = '#00ffff';
  protected readonly LIGHTNING_YELLOW = '#ffff00';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get canvas context');
    this.ctx = context;
  }

  public render(effectsData: EffectsData, defenseZones: DefenseZone[]): void {
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';
    
    this.renderElectricRings(effectsData.electricRings);
    this.renderStaticElectricity(effectsData.staticElectricityTimer);
    
    this.ctx.restore();
  }

  protected renderElectricRings(electricRings: ElectricRing[]): void {
    this.ctx.save();
    this.ctx.lineCap = 'round';
    
    for (const ring of electricRings) {
      if (ring.alpha <= 0) continue;
      
      this.ctx.globalAlpha = ring.alpha;
      
      // Draw outer ring glow
      this.ctx.beginPath();
      this.ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = this.ELECTRIC_BLUE;
      this.ctx.lineWidth = ring.thickness + 4;
      this.ctx.globalAlpha *= 0.3;
      this.ctx.stroke();
      
      // Draw main ring
      this.ctx.beginPath();
      this.ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = this.ELECTRIC_CYAN;
      this.ctx.lineWidth = ring.thickness;
      this.ctx.globalAlpha = ring.alpha;
      this.ctx.stroke();
      
      // Draw inner bright ring
      this.ctx.beginPath();
      this.ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = this.WHITE_CORE;
      this.ctx.lineWidth = Math.max(1, ring.thickness * 0.4);
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }

  protected renderStaticElectricity(staticElectricityTimer: number): void {
    if (staticElectricityTimer <= 0) return;
    
    const intensity = staticElectricityTimer / 500; // Fade over 500ms
    const time = performance.now() * 0.005;
    
    this.ctx.save();
    this.ctx.globalAlpha = intensity * 0.3;
    
    // Create random electrical sparks around the screen edges
    const sparkCount = Math.floor(intensity * 8);
    
    for (let i = 0; i < sparkCount; i++) {
      const x = Math.random() * this.canvas.width;
      const y = Math.random() * this.canvas.height;
      
      // Only draw sparks near the bottom-right corner
      const distanceFromCorner = Math.sqrt(
        Math.pow(x - (this.canvas.width - 32), 2) + 
        Math.pow(y - (this.canvas.height - 32), 2)
      );
      
      if (distanceFromCorner > 200) continue; // Only within 200px of corner
      
      const sparkLength = 5 + Math.random() * 15;
      const angle = Math.random() * Math.PI * 2;
      
      const endX = x + Math.cos(angle) * sparkLength;
      const endY = y + Math.sin(angle) * sparkLength;
      
      // Draw spark
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(endX, endY);
      this.ctx.strokeStyle = this.ELECTRIC_CYAN;
      this.ctx.lineWidth = 1 + Math.random();
      this.ctx.stroke();
    }
    
    // Add ambient electrical glow around corner area
    const cornerX = this.canvas.width - 32;
    const cornerY = this.canvas.height - 32;
    
    const gradient = this.ctx.createRadialGradient(
      cornerX, cornerY, 0,
      cornerX, cornerY, 150
    );
    
    gradient.addColorStop(0, `rgba(0, 191, 255, ${intensity * 0.1})`);
    gradient.addColorStop(0.5, `rgba(0, 255, 255, ${intensity * 0.05})`);
    gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
    
    this.ctx.beginPath();
    this.ctx.arc(cornerX, cornerY, 150, 0, Math.PI * 2);
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
    
    this.ctx.restore();
  }

  public renderDebugZones(defenseZones: DefenseZone[], showDebug: boolean = false): void {
    if (!showDebug) return;
    
    this.ctx.save();
    this.ctx.globalAlpha = 0.2;
    
    for (const zone of defenseZones) {
      // Draw zone boundary
      this.ctx.beginPath();
      this.ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
      
      let color;
      switch (zone.type) {
        case 'destroy': color = '#ff0000'; break;
        case 'deflect': color = '#00ff00'; break;
        case 'hybrid': color = '#ffff00'; break;
        default: color = '#ffffff'; break;
      }
      
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      
      // Draw center point
      this.ctx.beginPath();
      this.ctx.arc(zone.x, zone.y, 3, 0, Math.PI * 2);
      this.ctx.fillStyle = color;
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }

  // Utility methods
  protected createRadialGradient(x: number, y: number, innerRadius: number, outerRadius: number, innerColor: string, outerColor: string): CanvasGradient {
    const gradient = this.ctx.createRadialGradient(x, y, innerRadius, x, y, outerRadius);
    gradient.addColorStop(0, innerColor);
    gradient.addColorStop(1, outerColor);
    return gradient;
  }

  protected setGlowEffect(color: string, blur: number): void {
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = blur;
  }

  protected clearGlowEffect(): void {
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
  }

  // Getters for derived classes
  protected getCanvas(): HTMLCanvasElement { return this.canvas; }
  protected getContext(): CanvasRenderingContext2D { return this.ctx; }
}