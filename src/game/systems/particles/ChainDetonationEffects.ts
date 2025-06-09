import { ParticleSystemCore } from './ParticleSystemCore';
import { initializeParticle } from '../../entities/Particle';

// Frame-based delay manager to replace setTimeout for better performance
class FrameDelayManager {
  private scheduledEvents: Array<{frameCount: number, callback: () => void}> = [];
  private currentFrame: number = 0;
  
  scheduleEvent(delayFrames: number, callback: () => void): void {
    this.scheduledEvents.push({ frameCount: this.currentFrame + delayFrames, callback });
  }
  
  update(): void {
    this.currentFrame++;
    const readyEvents = this.scheduledEvents.filter(event => event.frameCount <= this.currentFrame);
    readyEvents.forEach(event => event.callback());
    this.scheduledEvents = this.scheduledEvents.filter(event => event.frameCount > this.currentFrame);
  }
  
  clear(): void {
    this.scheduledEvents.length = 0;
    this.currentFrame = 0;
  }
}

export class ChainDetonationEffects {
  private frameDelayManager: FrameDelayManager = new FrameDelayManager();

  constructor(private core: ParticleSystemCore) {}

  update(): void {
    this.frameDelayManager.update();
  }

  clear(): void {
    this.frameDelayManager.clear();
  }

  createChainDetonationExplosion(x: number, y: number): void {
    const particleCount = this.core.isMobileDevice() ? 60 : 100;
    const particles = Math.min(particleCount, this.core.getAvailableParticleSlots());
    
    for (let i = 0; i < particles; i++) {
      const angle = (Math.PI * 2 * i) / particles;
      const velocity = 5 + Math.random() * 8;
      const life = 80 + Math.random() * 60;
      
      const particle = this.core.getParticle();
      initializeParticle(particle, x, y, Math.cos(angle) * velocity, Math.sin(angle) * velocity, 4 + Math.random() * 4, '#9d4edd', life);
      this.core.addActiveParticle(particle);
    }
    
    const coreParticles = Math.min(20, this.core.getAvailableParticleSlots());
    for (let i = 0; i < coreParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = 3 + Math.random() * 5;
      
      const particle = this.core.getParticle();
      initializeParticle(particle, x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20, Math.cos(angle) * velocity, Math.sin(angle) * velocity, 6 + Math.random() * 3, '#ffffff', 60 + Math.random() * 40);
      this.core.addActiveParticle(particle);
    }
  }

  createEnhancedChainDetonation(meteors: Array<{ x: number; y: number; color: string; isSuper: boolean }>, centerX: number, centerY: number): void {
    console.log('🔗✨ Creating enhanced chain detonation effects');
    
    this.createChainDetonationExplosion(centerX, centerY);
    this.createRippleWaves(centerX, centerY, 3);
    
    const meteorDistances = meteors.map((meteor, index) => ({
      meteor, index, distance: Math.sqrt((meteor.x - centerX) ** 2 + (meteor.y - centerY) ** 2)
    })).sort((a, b) => a.distance - b.distance);
    
    this.createElectricArcs(meteorDistances.map(md => md.meteor), centerX, centerY);
    
    meteorDistances.forEach((meteorData, sequenceIndex) => {
      const delayFrames = Math.floor((sequenceIndex * 50 + Math.random() * 30) / 16.67);
      this.frameDelayManager.scheduleEvent(delayFrames, () => {
        this.createEnhancedMeteorDestruction(meteorData.meteor.x, meteorData.meteor.y, meteorData.meteor.color, meteorData.meteor.isSuper, sequenceIndex);
      });
    });
    
    const finalDelayFrames = Math.floor((meteorDistances.length * 50 + 200) / 16.67);
    this.frameDelayManager.scheduleEvent(finalDelayFrames, () => {
      this.createFinalShockwave(centerX, centerY);
    });
  }

  private createRippleWaves(centerX: number, centerY: number, waveCount: number): void {
    for (let wave = 0; wave < waveCount; wave++) {
      const delayFrames = Math.floor((wave * 100) / 16.67);
      
      this.frameDelayManager.scheduleEvent(delayFrames, () => {
        const particleCount = this.core.isMobileDevice() ? 20 : 40;
        const radius = 50 + wave * 30;
        
        for (let i = 0; i < particleCount; i++) {
          const angle = (Math.PI * 2 * i) / particleCount;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          
          const particle = this.core.getParticle();
          initializeParticle(particle, x, y, Math.cos(angle) * 2, Math.sin(angle) * 2, 3 + Math.random() * 2, wave === 0 ? '#ffffff' : '#9d4edd', 30 + Math.random() * 20);
          this.core.addActiveParticle(particle);
        }
      });
    }
  }

  private createElectricArcs(meteors: Array<{ x: number; y: number; color: string; isSuper: boolean }>, centerX: number, centerY: number): void {
    const arcCount = Math.min(meteors.length, 8);
    
    for (let i = 0; i < arcCount; i++) {
      const meteor = meteors[i];
      const steps = 8;
      
      for (let step = 0; step < steps; step++) {
        const progress = step / (steps - 1);
        const midX = (centerX + meteor.x) / 2 + (Math.random() - 0.5) * 40;
        const midY = (centerY + meteor.y) / 2 + (Math.random() - 0.5) * 40;
        
        const x = (1 - progress) ** 2 * centerX + 2 * (1 - progress) * progress * midX + progress ** 2 * meteor.x;
        const y = (1 - progress) ** 2 * centerY + 2 * (1 - progress) * progress * midY + progress ** 2 * meteor.y;
        
        const delayFrames = Math.floor((step * 20 + i * 10) / 16.67);
        
        this.frameDelayManager.scheduleEvent(delayFrames, () => {
          const particle = this.core.getParticle();
          initializeParticle(particle, x, y, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, 2 + Math.random(), '#e0e7ff', 20 + Math.random() * 15);
          this.core.addActiveParticle(particle);
        });
      }
    }
  }

  private createEnhancedMeteorDestruction(x: number, y: number, color: string, isSuper: boolean, sequenceIndex: number): void {
    const intensity = Math.max(0.5, 1 - sequenceIndex * 0.1);
    const particleCount = isSuper ? 15 : 10;
    
    for (let i = 0; i < particleCount * intensity; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = 3 + Math.random() * 4;
      
      const particle = this.core.getParticle();
      initializeParticle(particle, x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20, Math.cos(angle) * velocity, Math.sin(angle) * velocity, 2 + Math.random() * 3, sequenceIndex < 3 ? '#ffffff' : color, 40 + Math.random() * 30);
      this.core.addActiveParticle(particle);
    }
    
    const ringParticles = 12;
    for (let i = 0; i < ringParticles; i++) {
      const angle = (Math.PI * 2 * i) / ringParticles;
      const radius = isSuper ? 25 : 15;
      
      const particle = this.core.getParticle();
      initializeParticle(particle, x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, Math.cos(angle) * 1.5, Math.sin(angle) * 1.5, 1 + Math.random(), '#9d4edd', 20 + Math.random() * 10);
      this.core.addActiveParticle(particle);
    }
  }

  private createFinalShockwave(centerX: number, centerY: number): void {
    console.log('🔗💥 Creating final chain detonation shockwave');
    
    const particleCount = this.core.isMobileDevice() ? 80 : 150;
    const particles = Math.min(particleCount, this.core.getAvailableParticleSlots());
    
    for (let i = 0; i < particles; i++) {
      const angle = (Math.PI * 2 * i) / particles;
      const velocity = 8 + Math.random() * 12;
      const life = 100 + Math.random() * 80;
      
      const particle = this.core.getParticle();
      initializeParticle(particle, centerX, centerY, Math.cos(angle) * velocity, Math.sin(angle) * velocity, 6 + Math.random() * 6, i % 3 === 0 ? '#ffffff' : '#9d4edd', life);
      this.core.addActiveParticle(particle);
    }
    
    for (let ring = 0; ring < 5; ring++) {
      const delayFrames = Math.floor((ring * 80) / 16.67);
      
      this.frameDelayManager.scheduleEvent(delayFrames, () => {
        const ringParticles = 32;
        const radius = 60 + ring * 40;
        
        for (let i = 0; i < ringParticles; i++) {
          const angle = (Math.PI * 2 * i) / ringParticles;
          
          const particle = this.core.getParticle();
          initializeParticle(particle, centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius, Math.cos(angle) * 3, Math.sin(angle) * 3, 4 + Math.random() * 2, ring === 0 ? '#ffffff' : '#9d4edd', 60 + Math.random() * 40);
          this.core.addActiveParticle(particle);
        }
      });
    }
  }
}