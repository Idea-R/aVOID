import { ChainDetonation, ChainFragment } from '../entities/ChainDetonation';

export class ChainDetonationRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get canvas context');
    this.ctx = context;
  }

  renderChainDetonation(chain: ChainDetonation): void {
    if (!chain.active) return;

    this.ctx.save();

    // Render screen effects first
    this.renderScreenEffects(chain);

    // Render completion effect
    if (chain.completionEffect.active) {
      this.renderCompletionEffect(chain);
    } else {
      // Render fragments and connections
      this.renderElectricConnections(chain);
      this.renderFragments(chain);
    }

    this.ctx.restore();
  }

  private renderScreenEffects(chain: ChainDetonation): void {
    // Purple edge glow
    if (chain.screenEffect.edgeGlow > 0) {
      const gradient = this.ctx.createRadialGradient(
        this.canvas.width / 2, this.canvas.height / 2, 0,
        this.canvas.width / 2, this.canvas.height / 2, Math.max(this.canvas.width, this.canvas.height) / 2
      );
      
      gradient.addColorStop(0, 'rgba(138, 43, 226, 0)');
      gradient.addColorStop(0.8, 'rgba(138, 43, 226, 0)');
      gradient.addColorStop(1, `rgba(138, 43, 226, ${chain.screenEffect.edgeGlow * 0.3})`);
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Pulse overlay
    if (chain.screenEffect.pulseIntensity > 0) {
      this.ctx.fillStyle = `rgba(138, 43, 226, ${chain.screenEffect.pulseIntensity * 0.1})`;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  private renderElectricConnections(chain: ChainDetonation): void {
    const collectedFragments = chain.fragments.filter(f => f.collected);
    const uncollectedFragments = chain.fragments.filter(f => !f.collected);

    // Draw connections between collected and uncollected fragments
    collectedFragments.forEach(collected => {
      uncollectedFragments.forEach(uncollected => {
        this.drawElectricArc(collected.x, collected.y, uncollected.x, uncollected.y, 0.6, '#9d4edd');
      });
    });

    // Draw faint connections between uncollected fragments
    for (let i = 0; i < uncollectedFragments.length; i++) {
      for (let j = i + 1; j < uncollectedFragments.length; j++) {
        const fragment1 = uncollectedFragments[i];
        const fragment2 = uncollectedFragments[j];
        this.drawElectricArc(fragment1.x, fragment1.y, fragment2.x, fragment2.y, 0.3, '#6a4c93');
      }
    }
  }

  private drawElectricArc(x1: number, y1: number, x2: number, y2: number, intensity: number, color: string): void {
    const segments = 8;
    const maxOffset = 15 * intensity;
    
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    
    for (let i = 1; i <= segments; i++) {
      const progress = i / segments;
      const baseX = x1 + (x2 - x1) * progress;
      const baseY = y1 + (y2 - y1) * progress;
      
      // Add random offset perpendicular to the line
      const perpAngle = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
      const offset = (Math.random() - 0.5) * maxOffset;
      const jaggedX = baseX + Math.cos(perpAngle) * offset;
      const jaggedY = baseY + Math.sin(perpAngle) * offset;
      
      this.ctx.lineTo(jaggedX, jaggedY);
    }
    
    // Draw with glow effect
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 3 * intensity;
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 10 * intensity;
    this.ctx.stroke();
    
    // Inner bright core
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1 * intensity;
    this.ctx.shadowBlur = 0;
    this.ctx.stroke();
  }

  private renderFragments(chain: ChainDetonation): void {
    chain.fragments.forEach(fragment => {
      if (fragment.collected) {
        this.renderCollectedFragment(fragment);
      } else {
        this.renderActiveFragment(fragment, chain.timeRemaining / chain.maxTime);
      }

      // Render collection effect particles
      if (fragment.collectionEffect.active) {
        this.renderCollectionEffect(fragment);
      }
    });
  }

  private renderActiveFragment(fragment: ChainFragment, timeRatio: number): void {
    this.ctx.save();
    
    // Pulsing scale
    const pulseScale = 1 + Math.sin(fragment.pulsePhase) * 0.2;
    this.ctx.translate(fragment.x, fragment.y);
    this.ctx.scale(pulseScale, pulseScale);
    
    // Fragment color based on time remaining
    let fragmentColor = '#9d4edd'; // Purple
    if (timeRatio < 0.3) fragmentColor = '#ff6b6b'; // Red
    else if (timeRatio < 0.6) fragmentColor = '#ffa726'; // Orange
    
    // Outer glow
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 25, 0, Math.PI * 2);
    this.ctx.fillStyle = `${fragmentColor}40`;
    this.ctx.shadowColor = fragmentColor;
    this.ctx.shadowBlur = 20;
    this.ctx.fill();
    
    // Crystal shape (hexagon)
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      const x = Math.cos(angle) * 15;
      const y = Math.sin(angle) * 15;
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.closePath();
    
    // Gradient fill
    const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.3, fragmentColor);
    gradient.addColorStop(1, '#4c1d95');
    
    this.ctx.fillStyle = gradient;
    this.ctx.shadowBlur = 0;
    this.ctx.fill();
    
    // Crystal facets
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // Inner sparkle
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 5, 0, Math.PI * 2);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fill();
    
    this.ctx.restore();
  }

  private renderCollectedFragment(fragment: ChainFragment): void {
    this.ctx.save();
    this.ctx.translate(fragment.x, fragment.y);
    
    // Faded collected fragment
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      const x = Math.cos(angle) * 10;
      const y = Math.sin(angle) * 10;
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.closePath();
    
    this.ctx.fillStyle = 'rgba(157, 78, 221, 0.3)';
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 1;
    this.ctx.fill();
    this.ctx.stroke();
    
    // Checkmark
    this.ctx.strokeStyle = '#00ff00';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(-5, 0);
    this.ctx.lineTo(-1, 4);
    this.ctx.lineTo(6, -4);
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  private renderCollectionEffect(fragment: ChainFragment): void {
    fragment.collectionEffect.particles.forEach(particle => {
      this.ctx.save();
      this.ctx.globalAlpha = particle.alpha;
      
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
      this.ctx.fillStyle = '#9d4edd';
      this.ctx.shadowColor = '#9d4edd';
      this.ctx.shadowBlur = 8;
      this.ctx.fill();
      
      this.ctx.restore();
    });
  }

  private renderCompletionEffect(chain: ChainDetonation): void {
    const effect = chain.completionEffect;
    
    // Gentle screen flash with theme colors (much less harsh)
    if (effect.flashIntensity > 0) {
      // Create a radial gradient from center for softer effect
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      const maxRadius = Math.max(this.canvas.width, this.canvas.height);
      
      const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
      
      // Use purple/cyan theme colors instead of harsh white
      const intensity = effect.flashIntensity * 0.3; // Reduced from 0.8 to 0.3
      gradient.addColorStop(0, `rgba(157, 78, 221, ${intensity * 0.6})`); // Purple center
      gradient.addColorStop(0.4, `rgba(6, 182, 212, ${intensity * 0.4})`); // Cyan middle  
      gradient.addColorStop(0.8, `rgba(139, 69, 19, ${intensity * 0.2})`); // Subtle brown
      gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity * 0.1})`);       // Dark edges
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    // Expanding explosion ring
    if (effect.explosionRadius > 0) {
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      
      // Outer ring
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, effect.explosionRadius, 0, Math.PI * 2);
      this.ctx.strokeStyle = '#9d4edd';
      this.ctx.lineWidth = 20;
      this.ctx.shadowColor = '#9d4edd';
      this.ctx.shadowBlur = 30;
      this.ctx.stroke();
      
      // Inner bright ring
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, effect.explosionRadius, 0, Math.PI * 2);
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 10;
      this.ctx.shadowBlur = 0;
      this.ctx.stroke();
      
      // Multiple expanding rings for depth
      for (let i = 1; i <= 3; i++) {
        const ringRadius = effect.explosionRadius - (i * 50);
        if (ringRadius > 0) {
          this.ctx.beginPath();
          this.ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
          this.ctx.strokeStyle = `rgba(157, 78, 221, ${0.5 / i})`;
          this.ctx.lineWidth = 15 / i;
          this.ctx.stroke();
        }
      }
    }
  }

  renderUI(chain: ChainDetonation): void {
    if (!chain.active || chain.completionEffect.active) return;

    this.ctx.save();
    
    // Progress indicator
    const progress = chain.collectedCount / chain.totalFragments;
    const timeRatio = chain.timeRemaining / chain.maxTime;
    
    // Position below scoreboard - moved down significantly
    const timerX = this.canvas.width / 2;
    const timerY = 150; // Changed from 80 to 150 to avoid scoreboard overlap
    
    // Make the background smaller and thinner
    const boxWidth = 180;  // Reduced from 200
    const boxHeight = 45;  // Reduced from 60
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'; // More opaque for better visibility
    this.ctx.fillRect(timerX - boxWidth/2, timerY - boxHeight/2, boxWidth, boxHeight);
    this.ctx.strokeStyle = '#9d4edd';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(timerX - boxWidth/2, timerY - boxHeight/2, boxWidth, boxHeight);
    
    // Timer text - slightly smaller
    const timeLeft = Math.ceil(chain.timeRemaining / 1000);
    let timerColor = '#9d4edd';
    if (timeRatio < 0.3) timerColor = '#ff6b6b';
    else if (timeRatio < 0.6) timerColor = '#ffa726';
    
    this.ctx.font = 'bold 20px Arial'; // Reduced from 24px
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = timerColor;
    this.ctx.fillText(`${timeLeft}s`, timerX, timerY + 5);
    
    // Progress text - smaller font
    this.ctx.font = 'bold 14px Arial'; // Reduced from 16px  
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(`${chain.collectedCount}/${chain.totalFragments} COLLECTED`, timerX, timerY - 8);
    
    // Warning text - moved further down and smaller
    const warningY = 210; // Moved down from 140
    this.ctx.font = 'bold 16px Arial'; // Reduced from 18px
    this.ctx.fillStyle = timeRatio < 0.5 ? '#ff6b6b' : '#ffa726';
    this.ctx.fillText('CHAIN ACTIVE - COLLECT ALL FRAGMENTS!', timerX, warningY);
    
    // Progress bar - smaller and moved
    const barX = timerX - 70; // Reduced from 80
    const barY = warningY + 15; // Reduced gap
    const barWidth = 140; // Reduced from 160
    const barHeight = 6; // Reduced from 8
    
    // Background
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Progress fill
    this.ctx.fillStyle = progress === 1 ? '#00ff00' : '#9d4edd';
    this.ctx.fillRect(barX, barY, barWidth * progress, barHeight);
    
    // Border
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(barX, barY, barWidth, barHeight);
    
    this.ctx.restore();
  }
}