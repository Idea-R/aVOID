import { AudioSourceConfig, getAudioSourceWithFallback, checkAudioCDNHealth } from '../config/audioConfig';

export interface LoadAudioResult {
  success: boolean;
  audioElement: HTMLAudioElement | null;
  sourceUsed: 'primary' | 'fallback' | 'local' | 'none';
  error?: string;
}

/**
 * Load audio with automatic fallback to local files if CDN fails
 */
export async function loadAudioWithFallback(
  trackName: string, 
  trackDisplayName: string,
  timeout: number = 8000
): Promise<LoadAudioResult> {
  
  const sources = getAudioSourceWithFallback(trackName as any);
  
  console.log(`[AUDIO-FALLBACK] Loading ${trackDisplayName}...`);
  
  // Try primary source (Vercel Blob CDN)
  const primaryResult = await tryLoadAudio(sources.primary, 'primary', timeout);
  if (primaryResult.success) {
    console.log(`[AUDIO-FALLBACK] ✅ Primary CDN loaded: ${trackDisplayName}`);
    return primaryResult;
  }
  
  console.warn(`[AUDIO-FALLBACK] ⚠️ Primary CDN failed for ${trackDisplayName}, trying fallback...`);
  
  // Try fallback source (local)
  const fallbackResult = await tryLoadAudio(sources.fallback, 'fallback', timeout);
  if (fallbackResult.success) {
    console.log(`[AUDIO-FALLBACK] ✅ Fallback loaded: ${trackDisplayName}`);
    return fallbackResult;
  }
  
  console.error(`[AUDIO-FALLBACK] ❌ All sources failed for ${trackDisplayName}`);
  return {
    success: false,
    audioElement: null,
    sourceUsed: 'none',
    error: 'All audio sources failed to load'
  };
}

/**
 * Try to load audio from a specific source
 */
async function tryLoadAudio(
  src: string, 
  sourceType: 'primary' | 'fallback' | 'local',
  timeout: number
): Promise<LoadAudioResult> {
  
  return new Promise<LoadAudioResult>((resolve) => {
    const audioElement = document.createElement('audio');
    audioElement.src = src;
    audioElement.loop = true;
    audioElement.preload = 'auto';
    audioElement.crossOrigin = 'anonymous';
    audioElement.setAttribute('x-webkit-airplay', 'deny');
    
    const cleanup = () => {
      audioElement.removeEventListener('canplaythrough', onSuccess);
      audioElement.removeEventListener('error', onError);
      audioElement.removeEventListener('abort', onError);
      clearTimeout(timeoutId);
    };
    
    const onSuccess = () => {
      cleanup();
      resolve({
        success: true,
        audioElement,
        sourceUsed: sourceType
      });
    };
    
    const onError = (event: any) => {
      cleanup();
      console.warn(`[AUDIO-FALLBACK] Failed to load from ${sourceType}: ${src}`, event);
      resolve({
        success: false,
        audioElement: null,
        sourceUsed: 'none',
        error: `Failed to load from ${sourceType}: ${event.type}`
      });
    };
    
    const timeoutId = setTimeout(() => {
      cleanup();
      console.warn(`[AUDIO-FALLBACK] Timeout loading from ${sourceType}: ${src}`);
      resolve({
        success: false,
        audioElement: null,
        sourceUsed: 'none',
        error: `Timeout loading from ${sourceType}`
      });
    }, timeout);
    
    audioElement.addEventListener('canplaythrough', onSuccess, { once: true });
    audioElement.addEventListener('error', onError, { once: true });
    audioElement.addEventListener('abort', onError, { once: true });
    
    // Start loading
    audioElement.load();
  });
}

/**
 * Check CDN health and recommend using fallback if needed
 */
export async function getRecommendedAudioStrategy(): Promise<{
  useCDN: boolean;
  reason: string;
}> {
  
  const cdnHealthy = await checkAudioCDNHealth();
  
  if (cdnHealthy) {
    return {
      useCDN: true,
      reason: 'CDN is healthy, using primary sources'
    };
  } else {
    return {
      useCDN: false,
      reason: 'CDN appears down, using local fallbacks'
    };
  }
}

/**
 * Pre-warm audio sources by checking availability
 */
export async function prewarmAudioSources(): Promise<{
  cdnAvailable: boolean;
  localAvailable: boolean;
  recommendation: 'cdn' | 'local' | 'mixed';
}> {
  
  console.log('[AUDIO-FALLBACK] Pre-warming audio sources...');
  
  const cdnHealthy = await checkAudioCDNHealth();
  
  // Check if local audio exists (basic check)
  const localExists = await checkLocalAudioExists();
  
  let recommendation: 'cdn' | 'local' | 'mixed' = 'mixed';
  
  if (cdnHealthy && localExists) {
    recommendation = 'cdn'; // Prefer CDN when both available
  } else if (localExists) {
    recommendation = 'local'; // Fallback to local only
  } else if (cdnHealthy) {
    recommendation = 'cdn'; // CDN only if local not available
  }
  
  console.log(`[AUDIO-FALLBACK] Prewarm complete - CDN: ${cdnHealthy}, Local: ${localExists}, Rec: ${recommendation}`);
  
  return {
    cdnAvailable: cdnHealthy,
    localAvailable: localExists,
    recommendation
  };
}

/**
 * Basic check if local audio files exist
 */
async function checkLocalAudioExists(): Promise<boolean> {
  try {
    const response = await fetch('/audio/Into-The-Void.mp3', { 
      method: 'HEAD',
      mode: 'cors'
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
} 