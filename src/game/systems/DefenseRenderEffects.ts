import { DefenseRenderCore } from './DefenseRenderCore';
import { DefenseZone } from './DefenseCore';

interface LightningBolt {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  branches: Array<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    thickness: number;
  }>;
  thickness: number;
  alpha: number;
  flickerPhase: number;
  duration: number;
  maxDuration: number;
  type: 'destroy' | 'deflect';
}

interface ElectricParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface EffectsData {
  lightningBolts: LightningBolt[];
  electricParticles: ElectricParticle[];
  electricRings: any[];
  staticElectricityTimer: number;
}

export class DefenseRenderEffects extends DefenseRenderCore {
  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
  }

  public render(effectsData: EffectsData, defenseZones: DefenseZone[]): void {
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';
    
    // Render base effects from core
    super.render(effectsData, defenseZones);
    
    // Render advanced effects
    this.renderLightningBolts(effectsData.lightningBolts);
    this.renderElectricParticles(effectsData.electricParticles);
    this.renderCornerLightningField(effectsData.staticElectricityTimer, defenseZones);
    
    this.ctx.restore();
  }

  private renderCornerLightningField(staticElectricityTimer: number, defenseZones: DefenseZone[]): void {
    if (staticElectricityTimer <= 0 || defenseZones.length === 0) return;
    
    const zone = defenseZones[0]; // Badge zone
    const intensity = staticElectricityTimer / 500; // Fade over 500ms
    
    this.ctx.save();
    this.ctx.globalAlpha = intensity * 0.4;
    
    // Create a localized electrical field around the corner
    const fieldRadius = zone.radius;
    const time = performance.now() * 0.01;
    
    // Draw electrical arcs around the defense perimeter
    const arcCount = 12;
    for (let i = 0; i < arcCount; i++) {
      const baseAngle = (Math.PI * 2 * i) / arcCount;
      const angleVariation = Math.sin(time + i) * 0.3;
      const angle = baseAngle + angleVariation;
      
      const innerRadius = fieldRadius * 0.7;
      const outerRadius = fieldRadius * (0.9 + Math.sin(time * 2 + i) * 0.1);
      
      const startX = zone.x + Math.cos(angle) * innerRadius;
      const startY = zone.y + Math.sin(angle) * innerRadius;
      const endX = zone.x + Math.cos(angle) * outerRadius;
      const endY = zone.y + Math.sin(angle) * outerRadius;
      
      // Draw mini lightning arc
      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      
      // Add some jaggedness to the arc
      const midX = (startX + endX) / 2 + (Math.random() - 0.5) * 10;
      const midY = (startY + endY) / 2 + (Math.random() - 0.5) * 10;
      
      this.ctx.quadraticCurveTo(midX, midY, endX, endY);
      
      this.ctx.strokeStyle = this.ELECTRIC_CYAN;
      this.ctx.lineWidth = 1 + Math.random();
      this.ctx.stroke();
    }
    
    // Add pulsing energy at the center
    const pulseRadius = 8 + Math.sin(time * 3) * 4;
    this.ctx.beginPath();
    this.ctx.arc(zone.x, zone.y, pulseRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = this.LIGHTNING_YELLOW;
    this.ctx.fill();
    
    // Inner bright core
    this.ctx.beginPath();
    this.ctx.arc(zone.x, zone.y, pulseRadius * 0.5, 0, Math.PI * 2);
    this.ctx.fillStyle = this.WHITE_CORE;
    this.ctx.fill();
    
    this.ctx.restore();
  }

  private renderLightningBolts(lightningBolts: LightningBolt[]): void {
    this.ctx.save();
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    for (const bolt of lightningBolts) {
      if (bolt.alpha <= 0) continue;
      
      this.ctx.globalAlpha = bolt.alpha;
      
      // Draw main lightning bolt
      this.drawJaggedLightning(
        bolt.startX, bolt.startY, 
        bolt.endX, bolt.endY, 
        bolt.thickness, bolt.type
      );
      
      // Draw branches
      for (const branch of bolt.branches) {
        this.drawJaggedLightning(
          branch.startX, branch.startY,
          branch.endX, branch.endY,
          branch.thickness, bolt.type
        );
      }
    }
    
    this.ctx.restore();
  }

  private drawJaggedLightning(
    startX: number, 
    startY: number, 
    endX: number, 
    endY: number, 
    thickness: number,
    type: 'destroy' | 'deflect'
  ): void {
    const segments = 8; // Number of jagged segments
    const maxOffset = 15; // Maximum offset from straight line
    
    // Create jagged path points
    const points: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
    
    for (let i = 1; i < segments; i++) {
      const progress = i / segments;
      const baseX = startX + (endX - startX) * progress;
      const baseY = startY + (endY - startY) * progress;
      
      // Add random offset perpendicular to the line
      const dx = endX - startX;
      const dy = endY - startY;
      const length = Math.sqrt(dx * dx + dy * dy);
      const perpX = -dy / length;
      const perpY = dx / length;
      
      const offset = (Math.random() - 0.5) * maxOffset;
      
      points.push({
        x: baseX + perpX * offset,
        y: baseY + perpY * offset
      });
    }
    
    points.push({ x: endX, y: endY });
    
    // Draw outer glow
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    
    this.ctx.strokeStyle = type === 'destroy' ? this.ELECTRIC_BLUE : this.PURPLE_EDGE;
    this.ctx.lineWidth = thickness + 3;
    this.ctx.globalAlpha *= 0.3;
    this.ctx.stroke();
    
    // Draw main bolt
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    
    this.ctx.strokeStyle = type === 'destroy' ? this.LIGHTNING_YELLOW : this.ELECTRIC_CYAN;
    this.ctx.lineWidth = thickness;
    this.ctx.globalAlpha = 1;
    this.ctx.stroke();
    
    // Draw bright core
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    
    this.ctx.strokeStyle = this.WHITE_CORE;
    this.ctx.lineWidth = Math.max(1, thickness * 0.4);
    this.ctx.stroke();
  }

  private renderElectricParticles(electricParticles: ElectricParticle[]): void {
    this.ctx.save();
    
    for (const particle of electricParticles) {
      if (particle.alpha <= 0) continue;
      
      this.ctx.globalAlpha = particle.alpha;
      
      // Draw particle glow
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size + 2, 0, Math.PI * 2);
      this.ctx.fillStyle = particle.color;
      this.ctx.globalAlpha *= 0.3;
      this.ctx.fill();
      
      // Draw particle core
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fillStyle = particle.color;
      this.ctx.globalAlpha = particle.alpha;
      this.ctx.fill();
      
      // Draw bright center
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
      this.ctx.fillStyle = this.WHITE_CORE;
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }

  // Advanced effect utilities
  private createElectricArc(startX: number, startY: number, endX: number, endY: number, intensity: number): void {
    const segments = Math.floor(5 + intensity * 3);
    const jaggedAmount = 5 + intensity * 10;
    
    this.ctx.beginPath();
    this.ctx.moveTo(startX, startY);
    
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const baseX = startX + (endX - startX) * t;
      const baseY = startY + (endY - startY) * t;
      
      const offsetX = (Math.random() - 0.5) * jaggedAmount;
      const offsetY = (Math.random() - 0.5) * jaggedAmount;
      
      this.ctx.lineTo(baseX + offsetX, baseY + offsetY);
    }
    
    this.ctx.lineTo(endX, endY);
    this.ctx.strokeStyle = this.ELECTRIC_CYAN;
    this.ctx.lineWidth = 1 + intensity;
    this.ctx.stroke();
  }

  private createParticleBurst(x: number, y: number, particleCount: number, color: string): void {
    this.ctx.save();
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const distance = 10 + Math.random() * 20;
      const particleX = x + Math.cos(angle) * distance;
      const particleY = y + Math.sin(angle) * distance;
      
      this.ctx.beginPath();
      this.ctx.arc(particleX, particleY, 1 + Math.random() * 2, 0, Math.PI * 2);
      this.ctx.fillStyle = color;
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }

  private renderEnergyField(x: number, y: number, radius: number, intensity: number): void {
    this.ctx.save();
    
    const fieldGradient = this.createRadialGradient(
      x, y, 0, radius,
      `rgba(0, 255, 255, ${intensity * 0.3})`,
      'rgba(0, 255, 255, 0)'
    );
    
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = fieldGradient;
    this.ctx.fill();
    
    this.ctx.restore();
  }
}