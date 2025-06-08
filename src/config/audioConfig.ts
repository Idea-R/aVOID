// Cloud Audio Configuration - Reduces project size by 14.3MB
export const AUDIO_CDN_BASE = 'https://cdn.avoidgame.io/audio/'; // Replace with your actual CDN

// Audio file configuration for aVOID game
// CDN-hosted for optimal performance

// Production CDN URLs (Vercel Blob)
export const AUDIO_TRACKS = {
  'Into-The-Void': 'https://74krk2frn8meqofa.public.blob.vercel-storage.com/audio/Into-The-Void.mp3',
  'Laser-Dreams': 'https://74krk2frn8meqofa.public.blob.vercel-storage.com/audio/Laser-Dreams.mp3',
  'Chasing-Retro': 'https://74krk2frn8meqofa.public.blob.vercel-storage.com/audio/Chasing-Retro.mp3',
  'Robot-Factory-Breakdown': 'https://74krk2frn8meqofa.public.blob.vercel-storage.com/audio/Robot-Factory-Breakdown.mp3'
};

// Local development fallback URLs  
export const LOCAL_AUDIO_TRACKS = {
  'Into-The-Void': '/audio/Into-The-Void.mp3',
  'Laser-Dreams': '/audio/Laser-Dreams.mp3', 
  'Chasing-Retro': '/audio/Chasing-Retro.mp3',
  'Robot-Factory-Breakdown': '/audio/Robot-Factory-Breakdown.mp3'
};

// Environment-based audio source
export const getAudioSource = (track: keyof typeof AUDIO_TRACKS) => {
  return import.meta.env.PROD ? AUDIO_TRACKS[track] : LOCAL_AUDIO_TRACKS[track];
}; 