import { AudioCore } from './AudioCore';
import { SoundEffectManager } from './SoundEffectManager';
import { AudioUtilities } from './AudioUtilities';

export interface AudioTrack {
  name: string;
  displayName: string;
  src: string;
  artist?: string;
  duration?: number;
}

export interface AudioSettings {
  masterVolume: number;
  musicVolume: number;
  effectsVolume: number;
  musicEnabled: boolean;
  effectsEnabled: boolean;
  currentTrack: string;
}

export interface AudioManagerEvents {
  'track-changed': (track: AudioTrack) => void;
  'volume-changed': (type: 'master' | 'music' | 'effects', volume: number) => void;
  'playback-error': (error: Error) => void;
  'track-loaded': (track: AudioTrack) => void;
}

export class AudioManager extends EventTarget {
  private audioCore: AudioCore;
  private soundEffectManager: SoundEffectManager;
  private audioUtilities: AudioUtilities;

  constructor() {
    super();
    console.log('[AUDIO MANAGER] AudioManager constructor called');
    
    this.audioCore = new AudioCore();
    this.soundEffectManager = new SoundEffectManager(this.audioCore);
    this.audioUtilities = new AudioUtilities(this.audioCore, this.soundEffectManager);
    
    this.setupEventForwarding();
    this.audioUtilities.setupEventListeners();
    
    console.log('[AUDIO MANAGER] AudioManager constructor completed');
  }

  private setupEventForwarding(): void {
    // Forward events from core components to maintain API compatibility
    this.audioCore.addEventListener('volume-changed', (event) => {
      this.dispatchEvent(new CustomEvent('volume-changed', { detail: (event as CustomEvent).detail }));
    });

    this.audioCore.addEventListener('playback-error', (event) => {
      this.dispatchEvent(new CustomEvent('playback-error', { detail: (event as CustomEvent).detail }));
    });

    this.soundEffectManager.addEventListener('track-changed', (event) => {
      this.dispatchEvent(new CustomEvent('track-changed', { detail: (event as CustomEvent).detail }));
    });

    this.soundEffectManager.addEventListener('track-loaded', (event) => {
      this.dispatchEvent(new CustomEvent('track-loaded', { detail: (event as CustomEvent).detail }));
    });

    this.soundEffectManager.addEventListener('playback-error', (event) => {
      this.dispatchEvent(new CustomEvent('playback-error', { detail: (event as CustomEvent).detail }));
    });
  }

  // Public API - delegate to appropriate modules while preserving exact same interface
  
  public async loadTrack(trackName: string): Promise<AudioTrack | null> {
    return this.soundEffectManager.loadTrack(trackName);
  }

  public async playTrack(trackName: string, crossfadeDuration: number = 2.0): Promise<boolean> {
    return this.soundEffectManager.playTrack(trackName, crossfadeDuration);
  }

  public pause(): void {
    this.soundEffectManager.pause();
  }

  public resume(): void {
    this.soundEffectManager.resume();
  }

  public stop(): void {
    this.soundEffectManager.stop();
  }

  public setMasterVolume(volume: number): void {
    this.audioCore.setMasterVolume(volume);
  }

  public setMusicVolume(volume: number): void {
    this.audioCore.setMusicVolume(volume);
  }

  public setEffectsVolume(volume: number): void {
    this.audioCore.setEffectsVolume(volume);
  }

  public toggleMusic(): void {
    this.soundEffectManager.toggleMusic();
  }

  public toggleEffects(): void {
    this.audioCore.toggleEffects();
  }

  public getCurrentTrack(): AudioTrack | null {
    return this.soundEffectManager.getCurrentTrack();
  }

  public getAvailableTracks(): AudioTrack[] {
    return this.soundEffectManager.getAvailableTracks();
  }

  public getSettings(): AudioSettings {
    return this.audioCore.getSettings();
  }

  public isReady(): boolean {
    return this.audioCore.isReady();
  }

  public isCurrentlyPlaying(): boolean {
    return this.soundEffectManager.isCurrentlyPlaying();
  }

  public dispose(): void {
    this.soundEffectManager.stop();
    this.audioCore.dispose();
    console.log('[AUDIO MANAGER] AudioManager disposed');
  }
}
