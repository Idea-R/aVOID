import { AudioCore } from './AudioCore';
import { SoundEffectManager } from './SoundEffectManager';

export class AudioUtilities {
  private core: AudioCore;
  private soundManager: SoundEffectManager;
  private eventListenersSetup: boolean = false;

  constructor(audioCore: AudioCore, soundEffectManager: SoundEffectManager) {
    this.core = audioCore;
    this.soundManager = soundEffectManager;
    console.log('[AUDIO UTILS] AudioUtilities constructor called');
  }

  setupEventListeners(): void {
    if (this.eventListenersSetup) return;
    
    const interactionEvents = ['click', 'keydown', 'touchstart'];
    
    const handleUserInteraction = () => {
      if (!this.core.getUserInteracted()) {
        console.log('[AUDIO UTILS] User interaction detected, enabling audio...');
        this.core.setUserInteracted(true);
        this.core.initializeAudioContext();
        
        const settings = this.core.getSettings();
        if (settings.musicEnabled && settings.currentTrack) {
          this.soundManager.playTrack(settings.currentTrack).then(success => {
            if (success) console.log('[AUDIO UTILS] Default track auto-started successfully');
            else console.warn('[AUDIO UTILS] Failed to auto-start default track');
          });
        }
        
        interactionEvents.forEach(event => document.removeEventListener(event, handleUserInteraction));
      }
    };

    interactionEvents.forEach(event => document.addEventListener(event, handleUserInteraction, { passive: true }));
    console.log('[AUDIO UTILS] Event listeners set up, waiting for user interaction...');

    document.addEventListener('visibilitychange', () => {
      const settings = this.core.getSettings();
      if (document.hidden) this.soundManager.pause();
      else if (settings.musicEnabled && this.soundManager.getCurrentTrack()) this.soundManager.resume();
    });

    this.eventListenersSetup = true;
  }

  static async unblockIOSPlayback(): Promise<void> {
    const silentAudio = document.createElement('audio');
    silentAudio.setAttribute('x-webkit-airplay', 'deny');
    silentAudio.preload = 'auto';
    silentAudio.loop = false;
    silentAudio.volume = 0;
    
    const silentDataURL = 'data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAAVE=';
    silentAudio.src = silentDataURL;
    
    try {
      await silentAudio.play();
      console.log('[AUDIO UTILS] iOS Web Audio unblocked');
    } catch (error) {
      console.log('[AUDIO UTILS] iOS unblock not needed or failed:', error);
    }
  }

  static detectSupportedAudioFormats(): string[] {
    const audio = document.createElement('audio');
    const formats: string[] = [];
    
    const testFormats = [
      { ext: 'mp3', mime: 'audio/mpeg' },
      { ext: 'ogg', mime: 'audio/ogg; codecs="vorbis"' },
      { ext: 'wav', mime: 'audio/wav' },
      { ext: 'm4a', mime: 'audio/mp4; codecs="mp4a.40.2"' },
      { ext: 'aac', mime: 'audio/aac' },
      { ext: 'webm', mime: 'audio/webm; codecs="vorbis"' }
    ];
    
    testFormats.forEach(format => {
      const canPlay = audio.canPlayType(format.mime);
      if (canPlay === 'probably' || canPlay === 'maybe') formats.push(format.ext);
    });
    
    console.log('[AUDIO UTILS] Supported audio formats:', formats);
    return formats;
  }

  static optimizeAudioForDevice(): { bufferSize: number; maxConcurrentSounds: number; useWebAudio: boolean } {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    let optimization = { bufferSize: 4096, maxConcurrentSounds: 8, useWebAudio: true };
    
    if (isMobile) {
      optimization.bufferSize = 2048;
      optimization.maxConcurrentSounds = 4;
    }
    
    if (isIOS) {
      optimization.bufferSize = 1024;
      optimization.maxConcurrentSounds = 3;
    }
    
    if (isAndroid) optimization.maxConcurrentSounds = 5;
    
    console.log('[AUDIO UTILS] Audio optimization settings:', optimization);
    return optimization;
  }

  static async loadAudioBuffer(context: AudioContext, url: string): Promise<AudioBuffer> {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await context.decodeAudioData(arrayBuffer);
      
      console.log(`[AUDIO UTILS] Audio buffer loaded: ${url}`);
      return audioBuffer;
    } catch (error) {
      console.error(`[AUDIO UTILS] Error loading audio buffer from ${url}:`, error);
      throw error;
    }
  }

  static calculateSpatialVolume(soundX: number, soundY: number, listenerX: number, listenerY: number, maxDistance: number = 1000): number {
    const distance = Math.sqrt(Math.pow(soundX - listenerX, 2) + Math.pow(soundY - listenerY, 2));
    if (distance >= maxDistance) return 0;
    const volume = 1 - (distance / maxDistance);
    return Math.max(0, Math.min(1, volume));
  }

  static createAudioCache(maxSize: number = 10): Map<string, AudioBuffer> {
    const cache = new Map<string, AudioBuffer>();
    const accessOrder: string[] = [];
    
    const originalSet = cache.set.bind(cache);
    cache.set = function(key: string, value: AudioBuffer) {
      if (cache.has(key)) {
        const index = accessOrder.indexOf(key);
        if (index > -1) accessOrder.splice(index, 1);
      } else if (cache.size >= maxSize) {
        const oldestKey = accessOrder.shift();
        if (oldestKey) cache.delete(oldestKey);
      }
      
      accessOrder.push(key);
      return originalSet(key, value);
    };
    
    const originalGet = cache.get.bind(cache);
    cache.get = function(key: string) {
      const value = originalGet(key);
      if (value !== undefined) {
        const index = accessOrder.indexOf(key);
        if (index > -1) {
          accessOrder.splice(index, 1);
          accessOrder.push(key);
        }
      }
      return value;
    };
    
    console.log(`[AUDIO UTILS] Audio cache created with max size: ${maxSize}`);
    return cache;
  }

  static validateAudioContext(context: AudioContext | null): boolean {
    if (!context) {
      console.warn('[AUDIO UTILS] AudioContext is null');
      return false;
    }
    
    if (context.state === 'closed') {
      console.warn('[AUDIO UTILS] AudioContext is closed');
      return false;
    }
    
    if (context.state === 'suspended') {
      console.warn('[AUDIO UTILS] AudioContext is suspended');
      return false;
    }
    
    return true;
  }

  static async resumeAudioContext(context: AudioContext): Promise<boolean> {
    if (!context || context.state !== 'suspended') return false;
    
    try {
      await context.resume();
      console.log('[AUDIO UTILS] AudioContext resumed successfully');
      return true;
    } catch (error) {
      console.error('[AUDIO UTILS] Failed to resume AudioContext:', error);
      return false;
    }
  }

  static monitorAudioPerformance(context: AudioContext, intervalMs: number = 5000): () => void {
    const monitor = () => {
      if (context && context.state !== 'closed') {
        console.log(`[AUDIO UTILS] Audio Performance - State: ${context.state}, Current Time: ${context.currentTime.toFixed(2)}s, Sample Rate: ${context.sampleRate}Hz`);
      }
    };
    
    const intervalId = setInterval(monitor, intervalMs);
    console.log('[AUDIO UTILS] Audio performance monitoring started');
    
    return () => {
      clearInterval(intervalId);
      console.log('[AUDIO UTILS] Audio performance monitoring stopped');
    };
  }

  static isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
  }

  static isIOSDevice(): boolean { return /iPad|iPhone|iPod/.test(navigator.userAgent); }
  static supportsWebAudio(): boolean { return !!(window.AudioContext || (window as any).webkitAudioContext); }

  static getBrowserAudioInfo(): { browser: string; supportsWebAudio: boolean; isMobile: boolean } {
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    
    return { browser, supportsWebAudio: this.supportsWebAudio(), isMobile: this.isMobileDevice() };
  }
}