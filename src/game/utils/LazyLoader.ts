export class LazyLoader {
  private static loadedModules = new Map<string, any>();
  private static loadingPromises = new Map<string, Promise<any>>();

  static async loadAudioManager(): Promise<typeof import('../audio/AudioManager').AudioManager> {
    const key = 'AudioManager';
    
    if (this.loadedModules.has(key)) {
      return this.loadedModules.get(key);
    }

    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key);
    }

    const loadPromise = import('../audio/AudioManager').then(module => {
      const AudioManager = module.AudioManager;
      this.loadedModules.set(key, AudioManager);
      this.loadingPromises.delete(key);
      return AudioManager;
    });

    this.loadingPromises.set(key, loadPromise);
    return loadPromise;
  }

  static async loadDefenseSystem(): Promise<typeof import('../systems/DefenseSystem').DefenseSystem> {
    const key = 'DefenseSystem';
    
    if (this.loadedModules.has(key)) {
      return this.loadedModules.get(key);
    }

    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key);
    }

    const loadPromise = import('../systems/DefenseSystem').then(module => {
      const DefenseSystem = module.DefenseSystem;
      this.loadedModules.set(key, DefenseSystem);
      this.loadingPromises.delete(key);
      return DefenseSystem;
    });

    this.loadingPromises.set(key, loadPromise);
    return loadPromise;
  }

  static async loadChainDetonation(): Promise<typeof import('../entities/ChainDetonation').ChainDetonationManager> {
    const key = 'ChainDetonationManager';
    
    if (this.loadedModules.has(key)) {
      return this.loadedModules.get(key);
    }

    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key);
    }

    const loadPromise = import('../entities/ChainDetonation').then(module => {
      const ChainDetonationManager = module.ChainDetonationManager;
      this.loadedModules.set(key, ChainDetonationManager);
      this.loadingPromises.delete(key);
      return ChainDetonationManager;
    });

    this.loadingPromises.set(key, loadPromise);
    return loadPromise;
  }

  static preloadCriticalModules(): void {
    // Preload modules that are likely to be needed soon
    this.loadAudioManager();
    this.loadDefenseSystem();
  }

  static clearCache(): void {
    this.loadedModules.clear();
    this.loadingPromises.clear();
  }
}