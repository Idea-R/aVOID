import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface GameSettings {
  volume: number;
  soundEnabled: boolean;
  showUI: boolean;
  showFPS: boolean;
  showPerformanceStats: boolean;
  showTrails: boolean;
  performanceMode: boolean;
}

interface AudioSettingsSectionProps {
  settings: GameSettings;
  updateSetting: <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => void;
}

export default function AudioSettingsSection({ settings, updateSetting }: AudioSettingsSectionProps) {
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(e.target.value);
    updateSetting('volume', volume);
    updateSetting('soundEnabled', volume > 0);
  };

  const toggleSound = () => {
    if (settings.soundEnabled) {
      updateSetting('soundEnabled', false);
      updateSetting('volume', 0);
    } else {
      updateSetting('soundEnabled', true);
      updateSetting('volume', 0.7);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
        {settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        Audio Settings
      </h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-gray-300">Sound Effects</label>
          <button
            onClick={toggleSound}
            className={`w-12 h-6 rounded-full transition-colors duration-200 relative ${
              settings.soundEnabled ? 'bg-cyan-500' : 'bg-gray-600'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ${
              settings.soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-gray-300 block">Volume: {Math.round(settings.volume * 100)}%</label>
          <div className="flex items-center gap-3">
            <VolumeX className="w-4 h-4 text-gray-400" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.volume}
              onChange={handleVolumeChange}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              disabled={!settings.soundEnabled}
            />
            <Volume2 className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );
}