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
  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private musicGainNode: GainNode | null = null;
  private effectsGainNode: GainNode | null = null;
  
  private currentTrack: AudioTrack | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private currentSourceNode: MediaElementAudioSourceNode | null = null;
  
  private crossfadeElement: HTMLAudioElement | null = null;
  private crossfadeSourceNode: MediaElementAudioSourceNode | null = null;
  private crossfadeGainNode: GainNode | null = null;
  
  private isInitialized = false;
  private hasUserInteracted = false;
  private isPlaying = false;
  private isCrossfading = false;
  
  private settings: AudioSettings = {
    masterVolume: 0.5,
    musicVolume: 0.5,
    effectsVolume: 0.5,
    musicEnabled: true,
    effectsEnabled: true,
    currentTrack: 'into-the-void'
  };

  private availableTracks: AudioTrack[] = [
    {
      name: 'robot-factory-breakdown',
      displayName: 'Robot Factory Breakdown',
      src: '/audio/Robot-Factory-Breakdown.mp3',
      artist: 'Digital Composer'
    },
    {
      name: 'chasing-retro',
      displayName: 'Chasing Retro',
      src: '/audio/Chasing-Retro.mp3',
      artist: 'Retro Synth'
    },
    {
      name: 'into-the-void',
      displayName: 'Into the Void',
      src: '/audio/Into-The-Void.mp3',
      artist: 'Cosmic Sounds'
    },
    {
      name: 'laser-dreams',
      displayName: 'Laser Dreams',
      src: '/audio/Laser-Dreams.mp3',
      artist: 'Synthwave Studio'
    }
  ];

  constructor() {
    super();
    console.log('[AUDIO] AudioManager constructor called');
    this.setupEventListeners();
    console.log('[AUDIO] AudioManager constructor completed');
  }

  private setupEventListeners(): void {
    // Listen for user interaction to initialize audio context
    const interactionEvents = ['click', 'keydown', 'touchstart'];
    
    const handleUserInteraction = () => {
      if (!this.hasUserInteracted) {
        console.log('[AUDIO] User interaction detected, enabling audio...');
        this.hasUserInteracted = true;
        this.initializeAudioContext();
        
        // Auto-start the default track if music is enabled
        if (this.settings.musicEnabled && this.settings.currentTrack) {
          // Start immediately - no delay needed
          this.playTrack(this.settings.currentTrack).then(success => {
            if (success) {
              console.log('[AUDIO] Default track auto-started successfully');
            } else {
              console.warn('[AUDIO] Failed to auto-start default track');
            }
          });
        }
        
        // Remove listeners after first interaction
        interactionEvents.forEach(event => {
          document.removeEventListener(event, handleUserInteraction);
        });
      }
    };

    interactionEvents.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { passive: true });
    });

    console.log('[AUDIO] Event listeners set up, waiting for user interaction...');

    // Handle visibility changes to pause/resume music appropriately
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else if (this.settings.musicEnabled && this.currentTrack) {
        this.resume();
      }
    });
  }

  private async initializeAudioContext(): Promise<void> {
    if (this.isInitialized) return;

    console.log('[AUDIO] Initializing AudioContext...');

    try {
      // Create audio context with optimal settings
      this.audioContext = new AudioContext({
        latencyHint: 'playback', // Optimize for sustained playback
        sampleRate: 44100
      });

      console.log(`[AUDIO] AudioContext created, state: ${this.audioContext.state}`);

      // Handle autoplay policy
      if (this.audioContext.state === 'suspended') {
        console.log('[AUDIO] AudioContext suspended, attempting to resume...');
        await this.audioContext.resume();
        console.log(`[AUDIO] AudioContext resumed, new state: ${this.audioContext.state}`);
      }

      // Create gain nodes for volume control
      this.masterGainNode = this.audioContext.createGain();
      this.musicGainNode = this.audioContext.createGain();
      this.effectsGainNode = this.audioContext.createGain();

      // Connect gain nodes: music -> master -> destination
      this.musicGainNode.connect(this.masterGainNode);
      this.effectsGainNode.connect(this.masterGainNode);
      this.masterGainNode.connect(this.audioContext.destination);

      // Set initial volumes
      this.updateGainNode(this.masterGainNode, this.settings.masterVolume);
      this.updateGainNode(this.musicGainNode, this.settings.musicVolume);
      this.updateGainNode(this.effectsGainNode, this.settings.effectsVolume);

      console.log(`[AUDIO] Gain nodes created and connected. Volumes - Master: ${this.settings.masterVolume}, Music: ${this.settings.musicVolume}`);

      this.isInitialized = true;
      console.log('[AUDIO] AudioManager initialized successfully');

      // iOS compatibility fix - play silent audio to unblock Web Audio
      await this.unblockIOSPlayback();

      // Pre-load and set the default track
      const defaultTrack = this.availableTracks.find(t => t.name === this.settings.currentTrack);
      if (defaultTrack) {
        this.currentTrack = defaultTrack;
        console.log(`[AUDIO] Default track set: ${defaultTrack.displayName}`);
      }

    } catch (error) {
      console.error('[AUDIO] Failed to initialize AudioManager:', error);
      this.dispatchEvent(new CustomEvent('playback-error', { detail: error }));
    }
  }

  private async unblockIOSPlayback(): Promise<void> {
    // Create silent audio element to unblock iOS Web Audio when ringer is muted
    const silentAudio = document.createElement('audio');
    silentAudio.setAttribute('x-webkit-airplay', 'deny');
    silentAudio.preload = 'auto';
    silentAudio.loop = false;
    silentAudio.volume = 0;
    
    // Create very short silent audio data URL
    const silentDataURL = 'data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAAVE=';
    silentAudio.src = silentDataURL;
    
    try {
      await silentAudio.play();
      console.log('[AUDIO] iOS Web Audio unblocked');
    } catch (error) {
      console.log('[AUDIO] iOS unblock not needed or failed:', error);
    }
  }

  private updateGainNode(gainNode: GainNode | null, volume: number): void {
    if (!gainNode || !this.audioContext) return;
    
    // Use exponential ramping for smooth volume changes
    const currentTime = this.audioContext.currentTime;
    gainNode.gain.cancelScheduledValues(currentTime);
    gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), currentTime + 0.1);
  }

  public async loadTrack(trackName: string): Promise<AudioTrack | null> {
    if (!this.hasUserInteracted) {
      console.warn('[AUDIO] Cannot load track before user interaction');
      return null;
    }

    if (!this.isInitialized) {
      await this.initializeAudioContext();
    }

    const track = this.availableTracks.find(t => t.name === trackName);
    if (!track) {
      console.error(`[AUDIO] Track not found: ${trackName}`);
      return null;
    }

    console.log(`[AUDIO] Loading track: ${track.displayName} from ${track.src}`);

    try {
      // Create new audio element
      const audioElement = document.createElement('audio');
      audioElement.src = track.src;
      audioElement.loop = true;
      audioElement.preload = 'auto';
      audioElement.crossOrigin = 'anonymous';
      audioElement.setAttribute('x-webkit-airplay', 'deny');

      // Wait for audio to load
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Timeout loading track: ${track.name}`));
        }, 10000);

        audioElement.addEventListener('canplaythrough', () => {
          clearTimeout(timeout);
          console.log(`[AUDIO] Track loaded successfully: ${track.displayName}`);
          resolve();
        }, { once: true });

        audioElement.addEventListener('error', (e) => {
          clearTimeout(timeout);
          console.error(`[AUDIO] Audio element error for ${track.name}:`, e);
          reject(new Error(`Failed to load track: ${track.name}`));
        }, { once: true });

        audioElement.addEventListener('loadstart', () => {
          console.log(`[AUDIO] Load started: ${track.displayName}`);
        }, { once: true });

        audioElement.addEventListener('loadeddata', () => {
          console.log(`[AUDIO] Data loaded: ${track.displayName}`);
        }, { once: true });

        audioElement.load();
      });

      console.log(`[AUDIO] Track loaded: ${track.displayName}`);
      this.dispatchEvent(new CustomEvent('track-loaded', { detail: track }));
      return track;

    } catch (error) {
      console.error(`[AUDIO] Error loading track ${track.name}:`, error);
      this.dispatchEvent(new CustomEvent('playback-error', { detail: error }));
      return null;
    }
  }

  public async playTrack(trackName: string, crossfadeDuration: number = 2.0): Promise<boolean> {
    console.log(`[AUDIO] Attempting to play track: ${trackName}`);
    console.log(`[AUDIO] AudioManager state - Initialized: ${this.isInitialized}, UserInteracted: ${this.hasUserInteracted}, MusicEnabled: ${this.settings.musicEnabled}`);

    if (!this.hasUserInteracted || !this.isInitialized) {
      console.warn('[AUDIO] AudioManager not ready for playback');
      return false;
    }

    if (!this.settings.musicEnabled) {
      console.log('[AUDIO] Music playback disabled in settings');
      return false;
    }

    const track = await this.loadTrack(trackName);
    if (!track) return false;

    try {
      // If same track is already playing, don't restart
      if (this.currentTrack?.name === trackName && this.isPlaying) {
        console.log(`[AUDIO] Track already playing: ${track.displayName}`);
        return true;
      }

      console.log(`[AUDIO] Starting playback of: ${track.displayName}`);

      // Create new audio setup
      const audioElement = document.createElement('audio');
      audioElement.src = track.src;
      audioElement.loop = true;
      audioElement.crossOrigin = 'anonymous';
      audioElement.setAttribute('x-webkit-airplay', 'deny');

      const sourceNode = this.audioContext!.createMediaElementSource(audioElement);
      sourceNode.connect(this.musicGainNode!);

      // Handle crossfading if there's a current track
      if (this.currentAudioElement && this.isPlaying && !this.isCrossfading) {
        await this.crossfadeToNewTrack(audioElement, sourceNode, crossfadeDuration);
      } else {
        // Direct switch
        this.stopCurrentTrack();
        this.currentAudioElement = audioElement;
        this.currentSourceNode = sourceNode;
        
        console.log(`[AUDIO] Starting audio playback...`);
        await audioElement.play();
        this.isPlaying = true;
        console.log(`[AUDIO] Audio playback started successfully!`);
      }

      this.currentTrack = track;
      this.settings.currentTrack = trackName;
      
      console.log(`[AUDIO] Now playing: ${track.displayName}`);
      this.dispatchEvent(new CustomEvent('track-changed', { detail: track }));
      
      return true;

    } catch (error) {
      console.error(`[AUDIO] Error playing track ${track.name}:`, error);
      this.dispatchEvent(new CustomEvent('playback-error', { detail: error }));
      return false;
    }
  }

  private async crossfadeToNewTrack(
    newAudioElement: HTMLAudioElement,
    newSourceNode: MediaElementAudioSourceNode,
    duration: number
  ): Promise<void> {
    if (!this.audioContext || this.isCrossfading) return;
    
    this.isCrossfading = true;
    console.log(`[AUDIO] Crossfading tracks over ${duration}s`);

    try {
      // Create gain node for crossfade
      this.crossfadeGainNode = this.audioContext.createGain();
      this.crossfadeGainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      newSourceNode.connect(this.crossfadeGainNode);
      this.crossfadeGainNode.connect(this.musicGainNode!);

      // Start new track at zero volume
      await newAudioElement.play();

      const currentTime = this.audioContext.currentTime;
      const halfDuration = duration / 2;

      // Fade out current track
      if (this.musicGainNode) {
        this.musicGainNode.gain.cancelScheduledValues(currentTime);
        this.musicGainNode.gain.setValueAtTime(this.settings.musicVolume, currentTime);
        this.musicGainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + halfDuration);
      }

      // Fade in new track
      this.crossfadeGainNode.gain.exponentialRampToValueAtTime(this.settings.musicVolume, currentTime + duration);

      // Wait for crossfade to complete
      setTimeout(() => {
        // Stop old track and switch references
        this.stopCurrentTrack();
        
        this.currentAudioElement = newAudioElement;
        this.currentSourceNode = newSourceNode;
        
        // Disconnect crossfade node and reconnect directly
        if (this.crossfadeGainNode) {
          this.crossfadeGainNode.disconnect();
          this.crossfadeGainNode = null;
        }
        
        newSourceNode.disconnect();
        newSourceNode.connect(this.musicGainNode!);
        
        // Restore normal volume
        if (this.musicGainNode) {
          this.updateGainNode(this.musicGainNode, this.settings.musicVolume);
        }
        
        this.isCrossfading = false;
        console.log('[AUDIO] Crossfade completed');
      }, duration * 1000);

    } catch (error) {
      console.error('[AUDIO] Crossfade error:', error);
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

  public pause(): void {
    if (this.currentAudioElement && this.isPlaying) {
      this.currentAudioElement.pause();
      this.isPlaying = false;
      console.log('[AUDIO] Music paused');
    }
  }

  public resume(): void {
    if (this.currentAudioElement && !this.isPlaying && this.settings.musicEnabled) {
      this.currentAudioElement.play();
      this.isPlaying = true;
      console.log('[AUDIO] Music resumed');
    }
  }

  public stop(): void {
    this.stopCurrentTrack();
    console.log('[AUDIO] Music stopped');
  }

  // Volume Controls
  public setMasterVolume(volume: number): void {
    this.settings.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateGainNode(this.masterGainNode, this.settings.masterVolume);
    this.dispatchEvent(new CustomEvent('volume-changed', { 
      detail: { type: 'master', volume: this.settings.masterVolume }
    }));
  }

  public setMusicVolume(volume: number): void {
    this.settings.musicVolume = Math.max(0, Math.min(1, volume));
    this.updateGainNode(this.musicGainNode, this.settings.musicVolume);
    this.dispatchEvent(new CustomEvent('volume-changed', { 
      detail: { type: 'music', volume: this.settings.musicVolume }
    }));
  }

  public setEffectsVolume(volume: number): void {
    this.settings.effectsVolume = Math.max(0, Math.min(1, volume));
    this.updateGainNode(this.effectsGainNode, this.settings.effectsVolume);
    this.dispatchEvent(new CustomEvent('volume-changed', { 
      detail: { type: 'effects', volume: this.settings.effectsVolume }
    }));
  }

  public toggleMusic(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.resume();
    }
  }

  public toggleEffects(): void {
    this.settings.effectsEnabled = !this.settings.effectsEnabled;
    // Effects toggling will be handled by the game's audio systems
  }

  // Getters
  public getCurrentTrack(): AudioTrack | null {
    return this.currentTrack;
  }

  public getAvailableTracks(): AudioTrack[] {
    return [...this.availableTracks];
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public isReady(): boolean {
    return this.isInitialized && this.hasUserInteracted;
  }

  public isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  // Cleanup
  public dispose(): void {
    this.stop();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.masterGainNode = null;
    this.musicGainNode = null;
    this.effectsGainNode = null;
    this.currentTrack = null;
    this.isInitialized = false;
    
    console.log('[AUDIO] AudioManager disposed');
  }

}
