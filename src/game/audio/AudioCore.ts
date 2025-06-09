import { AudioSettings } from './AudioManager';

export class AudioCore extends EventTarget {
  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private musicGainNode: GainNode | null = null;
  private effectsGainNode: GainNode | null = null;
  
  private isInitialized = false;
  private hasUserInteracted = false;
  
  private settings: AudioSettings = {
    masterVolume: 0.5,
    musicVolume: 0.5,
    effectsVolume: 0.5,
    musicEnabled: true,
    effectsEnabled: true,
    currentTrack: 'into-the-void'
  };

  constructor() {
    super();
    console.log('[AUDIO CORE] AudioCore constructor called');
  }

  async initializeAudioContext(): Promise<void> {
    if (this.isInitialized) return;

    console.log('[AUDIO CORE] Initializing AudioContext...');

    try {
      this.audioContext = new AudioContext({
        latencyHint: 'playback',
        sampleRate: 44100
      });

      console.log(`[AUDIO CORE] AudioContext created, state: ${this.audioContext.state}`);

      if (this.audioContext.state === 'suspended') {
        console.log('[AUDIO CORE] AudioContext suspended, attempting to resume...');
        await this.audioContext.resume();
        console.log(`[AUDIO CORE] AudioContext resumed, new state: ${this.audioContext.state}`);
      }

      this.masterGainNode = this.audioContext.createGain();
      this.musicGainNode = this.audioContext.createGain();
      this.effectsGainNode = this.audioContext.createGain();

      this.musicGainNode.connect(this.masterGainNode);
      this.effectsGainNode.connect(this.masterGainNode);
      this.masterGainNode.connect(this.audioContext.destination);

      this.updateGainNode(this.masterGainNode, this.settings.masterVolume);
      this.updateGainNode(this.musicGainNode, this.settings.musicVolume);
      this.updateGainNode(this.effectsGainNode, this.settings.effectsVolume);

      console.log(`[AUDIO CORE] Gain nodes created and connected. Volumes - Master: ${this.settings.masterVolume}, Music: ${this.settings.musicVolume}`);

      this.isInitialized = true;
      console.log('[AUDIO CORE] AudioCore initialized successfully');

    } catch (error) {
      console.error('[AUDIO CORE] Failed to initialize AudioCore:', error);
      this.dispatchEvent(new CustomEvent('playback-error', { detail: error }));
    }
  }

  private updateGainNode(gainNode: GainNode | null, volume: number): void {
    if (!gainNode || !this.audioContext) return;
    
    const currentTime = this.audioContext.currentTime;
    gainNode.gain.cancelScheduledValues(currentTime);
    gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), currentTime + 0.1);
  }

  setMasterVolume(volume: number): void {
    this.settings.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateGainNode(this.masterGainNode, this.settings.masterVolume);
    this.dispatchEvent(new CustomEvent('volume-changed', { 
      detail: { type: 'master', volume: this.settings.masterVolume }
    }));
  }

  setMusicVolume(volume: number): void {
    this.settings.musicVolume = Math.max(0, Math.min(1, volume));
    this.updateGainNode(this.musicGainNode, this.settings.musicVolume);
    this.dispatchEvent(new CustomEvent('volume-changed', { 
      detail: { type: 'music', volume: this.settings.musicVolume }
    }));
  }

  setEffectsVolume(volume: number): void {
    this.settings.effectsVolume = Math.max(0, Math.min(1, volume));
    this.updateGainNode(this.effectsGainNode, this.settings.effectsVolume);
    this.dispatchEvent(new CustomEvent('volume-changed', { 
      detail: { type: 'effects', volume: this.settings.effectsVolume }
    }));
  }

  toggleEffects(): void {
    this.settings.effectsEnabled = !this.settings.effectsEnabled;
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  getMusicGainNode(): GainNode | null {
    return this.musicGainNode;
  }

  getEffectsGainNode(): GainNode | null {
    return this.effectsGainNode;
  }

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  setUserInteracted(hasInteracted: boolean): void {
    this.hasUserInteracted = hasInteracted;
  }

  getUserInteracted(): boolean {
    return this.hasUserInteracted;
  }

  isReady(): boolean {
    return this.isInitialized && this.hasUserInteracted;
  }

  getInitialized(): boolean {
    return this.isInitialized;
  }

  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.masterGainNode = null;
    this.musicGainNode = null;
    this.effectsGainNode = null;
    this.isInitialized = false;
    
    console.log('[AUDIO CORE] AudioCore disposed');
  }
}