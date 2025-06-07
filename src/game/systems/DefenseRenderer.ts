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
  lightningBolts: LightningBolt[];
  electricParticles: ElectricParticle[];
  electricRings: ElectricRing[];
  staticElectricityTimer: number;
}

export class DefenseRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  // Color scheme
  private readonly ELECTRIC_BLUE = '#00bfff';
  private readonly WHITE_CORE = '#ffffff';
  private readonly PURPLE_EDGE = '#8a2be2';
  private readonly ELECTRIC_CYAN = '#00ffff';
  private readonly LIGHTNING_YELLOW = '#ffff00';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get canvas context');
    this.ctx = context;
  }

  /**
   * Render all electrical effects
   */
  public render(effectsData: EffectsData, defenseZones: DefenseZone[]): void {
    this.ctx.save();
    
    // Set composite mode for electric effects
    this.ctx.globalCompositeOperation = 'screen';
    
    this.renderElectricRings(effectsData.electricRings);
    this.renderLightningBolts(effectsData.lightningBolts);
    this.renderElectricParticles(effectsData.electricParticles);
    this.renderStaticElectricity(effectsData.staticElectricityTimer);
    this.renderCornerLightningField(effectsData.staticElectricityTimer, defenseZones);
    
    this.ctx.restore();
  }

  /**
   * Render corner lightning field effect
   */
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

  /**
   * Render lightning bolts with jagged lines and branching
   */
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

  /**
   * Draw jagged lightning line with realistic electrical appearance
   */
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

  /**
   * Render electric particles with glow effects
   */
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

  /**
   * Render expanding electric rings
   */
  private renderElectricRings(electricRings: ElectricRing[]): void {
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

  /**
   * Render static electricity effects around defense zones
   */
  private renderStaticElectricity(staticElectricityTimer: number): void {
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

  /**
   * Render debug visualization of defense zones (optional)
   */
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
}