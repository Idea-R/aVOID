import { AudioCore } from './AudioCore';
import { AudioTrack } from './AudioManager';
import { getAudioSource } from '../../config/audioConfig';

export class SoundEffectManager extends EventTarget {
  private core: AudioCore;
  private currentTrack: AudioTrack | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private currentSourceNode: MediaElementAudioSourceNode | null = null;
  private crossfadeGainNode: GainNode | null = null;
  private isPlaying = false;
  private isCrossfading = false;

  private availableTracks: AudioTrack[] = [
    { name: 'robot-factory-breakdown', displayName: 'Robot Factory Breakdown', src: getAudioSource('Robot-Factory-Breakdown'), artist: 'Digital Composer' },
    { name: 'chasing-retro', displayName: 'Chasing Retro', src: getAudioSource('Chasing-Retro'), artist: 'Retro Synth' },
    { name: 'into-the-void', displayName: 'Into the Void', src: getAudioSource('Into-The-Void'), artist: 'Cosmic Sounds' },
    { name: 'laser-dreams', displayName: 'Laser Dreams', src: getAudioSource('Laser-Dreams'), artist: 'Synthwave Studio' }
  ];

  constructor(audioCore: AudioCore) {
    super();
    this.core = audioCore;
    console.log('[SOUND EFFECT MGR] SoundEffectManager constructor called');
  }

  async loadTrack(trackName: string): Promise<AudioTrack | null> {
    if (!this.core.getUserInteracted()) {
      console.warn('[SOUND EFFECT MGR] Cannot load track before user interaction');
      return null;
    }

    if (!this.core.getInitialized()) await this.core.initializeAudioContext();

    const track = this.availableTracks.find(t => t.name === trackName);
    if (!track) {
      console.error(`[SOUND EFFECT MGR] Track not found: ${trackName}`);
      return null;
    }

    console.log(`[SOUND EFFECT MGR] Loading track: ${track.displayName} from ${track.src}`);

    try {
      const audioElement = document.createElement('audio');
      audioElement.src = track.src;
      audioElement.loop = true;
      audioElement.preload = 'auto';
      audioElement.crossOrigin = 'anonymous';
      audioElement.setAttribute('x-webkit-airplay', 'deny');

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Timeout loading track: ${track.name}`)), 10000);

        audioElement.addEventListener('canplaythrough', () => {
          clearTimeout(timeout);
          console.log(`[SOUND EFFECT MGR] Track loaded successfully: ${track.displayName}`);
          resolve();
        }, { once: true });

        audioElement.addEventListener('error', (e) => {
          clearTimeout(timeout);
          console.error(`[SOUND EFFECT MGR] Audio element error for ${track.name}:`, e);
          reject(new Error(`Failed to load track: ${track.name}`));
        }, { once: true });

        audioElement.addEventListener('loadstart', () => console.log(`[SOUND EFFECT MGR] Load started: ${track.displayName}`), { once: true });
        audioElement.addEventListener('loadeddata', () => console.log(`[SOUND EFFECT MGR] Data loaded: ${track.displayName}`), { once: true });
        audioElement.load();
      });

      console.log(`[SOUND EFFECT MGR] Track loaded: ${track.displayName}`);
      this.dispatchEvent(new CustomEvent('track-loaded', { detail: track }));
      return track;

    } catch (error) {
      console.error(`[SOUND EFFECT MGR] Error loading track ${track.name}:`, error);
      this.dispatchEvent(new CustomEvent('playback-error', { detail: error }));
      return null;
    }
  }

  async playTrack(trackName: string, crossfadeDuration: number = 2.0): Promise<boolean> {
    console.log(`[SOUND EFFECT MGR] Attempting to play track: ${trackName}`);
    const settings = this.core.getSettings();
    
    console.log(`[SOUND EFFECT MGR] AudioManager state - Initialized: ${this.core.getInitialized()}, UserInteracted: ${this.core.getUserInteracted()}, MusicEnabled: ${settings.musicEnabled}`);

    if (!this.core.getUserInteracted() || !this.core.getInitialized()) {
      console.warn('[SOUND EFFECT MGR] AudioManager not ready for playback');
      return false;
    }

    if (!settings.musicEnabled) {
      console.log('[SOUND EFFECT MGR] Music playback disabled in settings');
      return false;
    }

    const track = await this.loadTrack(trackName);
    if (!track) return false;

    try {
      if (this.currentTrack?.name === trackName && this.isPlaying) {
        console.log(`[SOUND EFFECT MGR] Track already playing: ${track.displayName}`);
        return true;
      }

      console.log(`[SOUND EFFECT MGR] Starting playback of: ${track.displayName}`);

      const audioElement = document.createElement('audio');
      audioElement.src = track.src;
      audioElement.loop = true;
      audioElement.crossOrigin = 'anonymous';
      audioElement.setAttribute('x-webkit-airplay', 'deny');

      const audioContext = this.core.getAudioContext();
      const musicGainNode = this.core.getMusicGainNode();
      
      if (!audioContext || !musicGainNode) throw new Error('Audio context or music gain node not available');

      const sourceNode = audioContext.createMediaElementSource(audioElement);
      sourceNode.connect(musicGainNode);

      if (this.currentAudioElement && this.isPlaying && !this.isCrossfading) {
        await this.crossfadeToNewTrack(audioElement, sourceNode, crossfadeDuration);
      } else {
        this.stopCurrentTrack();
        this.currentAudioElement = audioElement;
        this.currentSourceNode = sourceNode;
        
        console.log(`[SOUND EFFECT MGR] Starting audio playback...`);
        await audioElement.play();
        this.isPlaying = true;
        console.log(`[SOUND EFFECT MGR] Audio playback started successfully!`);
      }

      this.currentTrack = track;
      this.core.updateSettings({ currentTrack: trackName });
      
      console.log(`[SOUND EFFECT MGR] Now playing: ${track.displayName}`);
      this.dispatchEvent(new CustomEvent('track-changed', { detail: track }));
      
      return true;

    } catch (error) {
      console.error(`[SOUND EFFECT MGR] Error playing track ${track.name}:`, error);
      this.dispatchEvent(new CustomEvent('playback-error', { detail: error }));
      return false;
    }
  }

  private async crossfadeToNewTrack(newAudioElement: HTMLAudioElement, newSourceNode: MediaElementAudioSourceNode, duration: number): Promise<void> {
    const audioContext = this.core.getAudioContext();
    const musicGainNode = this.core.getMusicGainNode();
    
    if (!audioContext || this.isCrossfading || !musicGainNode) return;
    
    this.isCrossfading = true;
    console.log(`[SOUND EFFECT MGR] Crossfading tracks over ${duration}s`);

    try {
      this.crossfadeGainNode = audioContext.createGain();
      this.crossfadeGainNode.gain.setValueAtTime(0, audioContext.currentTime);
      newSourceNode.connect(this.crossfadeGainNode);
      this.crossfadeGainNode.connect(musicGainNode);

      await newAudioElement.play();

      const currentTime = audioContext.currentTime;
      const halfDuration = duration / 2;
      const settings = this.core.getSettings();

      musicGainNode.gain.cancelScheduledValues(currentTime);
      musicGainNode.gain.setValueAtTime(settings.musicVolume, currentTime);
      musicGainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + halfDuration);

      this.crossfadeGainNode.gain.exponentialRampToValueAtTime(settings.musicVolume, currentTime + duration);

      setTimeout(() => {
        this.stopCurrentTrack();
        this.currentAudioElement = newAudioElement;
        this.currentSourceNode = newSourceNode;
        
        if (this.crossfadeGainNode) {
          this.crossfadeGainNode.disconnect();
          this.crossfadeGainNode = null;
        }
        
        newSourceNode.disconnect();
        newSourceNode.connect(musicGainNode);
        this.core.setMusicVolume(settings.musicVolume);
        this.isCrossfading = false;
        console.log('[SOUND EFFECT MGR] Crossfade completed');
      }, duration * 1000);

    } catch (error) {
      console.error('[SOUND EFFECT MGR] Crossfade error:', error);
      this.isCrossfading = false;
    }
  }

  private stopCurrentTrack(): void {
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement.currentTime = 0;
      this.currentAudioElement = null;
    }
    
    if (this.currentSourceNode) {
      this.currentSourceNode.disconnect();
      this.currentSourceNode = null;
    }
    
    this.isPlaying = false;
  }

  pause(): void {
    if (this.currentAudioElement && this.isPlaying) {
      this.currentAudioElement.pause();
      this.isPlaying = false;
      console.log('[SOUND EFFECT MGR] Music paused');
    }
  }

  resume(): void {
    const settings = this.core.getSettings();
    if (this.currentAudioElement && !this.isPlaying && settings.musicEnabled) {
      this.currentAudioElement.play();
      this.isPlaying = true;
      console.log('[SOUND EFFECT MGR] Music resumed');
    }
  }

  stop(): void {
    this.stopCurrentTrack();
    console.log('[SOUND EFFECT MGR] Music stopped');
  }

  toggleMusic(): void {
    if (this.isPlaying) this.pause();
    else this.resume();
  }

  getCurrentTrack(): AudioTrack | null { return this.currentTrack; }
  getAvailableTracks(): AudioTrack[] { return [...this.availableTracks]; }
  isCurrentlyPlaying(): boolean { return this.isPlaying; }
}