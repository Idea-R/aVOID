import React, { useState, useEffect } from 'react';
import { Music, Volume2, VolumeX, Play, Pause, SkipForward, X } from 'lucide-react';

interface AudioTrack {
  name: string;
  displayName: string;
  src: string;
  artist?: string;
}

interface MusicControlsProps {
  audioManager: any; // AudioManager instance
  isVisible?: boolean;
  onClose?: () => void;
}

export default function MusicControls({ audioManager, isVisible = true, onClose }: MusicControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [availableTracks, setAvailableTracks] = useState<AudioTrack[]>([]);
  const [musicVolume, setMusicVolume] = useState(0.5);

  useEffect(() => {
    if (!audioManager) return;

    // Get available tracks and current state
    const tracks = audioManager.getAvailableTracks();
    setAvailableTracks(tracks);
    
    const current = audioManager.getCurrentTrack();
    const settings = audioManager.getSettings();
    
    console.log('[MUSIC-UI] Current track:', current?.name || 'null', 'Default:', settings.currentTrack);
    
    setCurrentTrack(current);
    setIsPlaying(audioManager.isCurrentlyPlaying());
    setMusicVolume(settings.musicVolume);

    // Auto-start default track if none is currently playing and audio is ready
    if (!current && audioManager.isReady() && settings.musicEnabled && settings.currentTrack) {
      const defaultTrack = tracks.find((t: AudioTrack) => t.name === settings.currentTrack);
      if (defaultTrack) {
        console.log('[MUSIC-UI] Starting default track:', defaultTrack.displayName);
        audioManager.playTrack(settings.currentTrack).then((success: boolean) => {
          if (success) {
            setCurrentTrack(defaultTrack);
            setIsPlaying(true);
            console.log('[MUSIC-UI] Default track started successfully');
          }
        });
      }
    }

    // Listen for track changes
    const handleTrackChange = (event: any) => {
      setCurrentTrack(event.detail);
      setIsPlaying(true);
    };

    const handleVolumeChange = (event: any) => {
      if (event.detail.type === 'music') {
        setMusicVolume(event.detail.volume);
      }
    };

    audioManager.addEventListener('track-changed', handleTrackChange);
    audioManager.addEventListener('volume-changed', handleVolumeChange);

    return () => {
      audioManager.removeEventListener('track-changed', handleTrackChange);
      audioManager.removeEventListener('volume-changed', handleVolumeChange);
    };
  }, [audioManager]);

  const handlePlayPause = () => {
    if (isPlaying) {
      audioManager.pause();
      setIsPlaying(false);
    } else {
      audioManager.resume();
      setIsPlaying(true);
    }
  };

  const handleTrackChange = async (trackName: string) => {
    const success = await audioManager.playTrack(trackName, 3.0);
    if (success) {
      setIsPlaying(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setMusicVolume(newVolume);
    audioManager.setMusicVolume(newVolume);
  };

  const toggleMute = () => {
    audioManager.toggleMusic();
    setIsPlaying(!isPlaying);
  };

  const nextTrack = () => {
    const currentIndex = availableTracks.findIndex(track => track.name === currentTrack?.name);
    const nextIndex = (currentIndex + 1) % availableTracks.length;
    handleTrackChange(availableTracks[nextIndex].name);
  };

  if (!isVisible || !audioManager) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl border border-purple-500 max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-purple-500/30">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Music Controls</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Current Track Display */}
          {currentTrack && (
            <div className="text-center bg-gray-800 rounded-lg p-4">
              <div className="text-purple-300 font-semibold text-lg">
                {currentTrack.displayName}
              </div>
              {currentTrack.artist && (
                <div className="text-gray-400 text-sm">
                  by {currentTrack.artist}
                </div>
              )}
            </div>
          )}

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={toggleMute}
              className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              title="Toggle Music"
            >
              {isPlaying ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            <button
              onClick={handlePlayPause}
              className="p-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>

            <button
              onClick={nextTrack}
              className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              title="Next Track"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Volume Control */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-300 text-sm mb-2">Volume: {Math.round(musicVolume * 100)}%</div>
            <div className="flex items-center gap-3">
              <VolumeX className="w-4 h-4 text-gray-400" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={musicVolume}
                onChange={handleVolumeChange}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <Volume2 className="w-4 h-4 text-gray-400" />
            </div>
          </div>

          {/* Track Selection */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-300 font-semibold mb-3">Available Tracks:</div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableTracks.map((track) => (
                <button
                  key={track.name}
                  onClick={() => handleTrackChange(track.name)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    currentTrack?.name === track.name
                      ? 'bg-purple-600/50 text-purple-200 border border-purple-500'
                      : 'text-gray-300 hover:bg-gray-700 border border-transparent'
                  }`}
                >
                  <div className="font-medium">{track.displayName}</div>
                  {track.artist && (
                    <div className="text-sm text-gray-500">by {track.artist}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 