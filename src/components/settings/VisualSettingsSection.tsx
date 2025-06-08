import React from 'react';
import { Eye } from 'lucide-react';

interface GameSettings {
  volume: number;
  soundEnabled: boolean;
  showUI: boolean;
  showFPS: boolean;
  showPerformanceStats: boolean;
  showTrails: boolean;
  performanceMode: boolean;
}

interface VisualSettingsSectionProps {
  settings: GameSettings;
  autoPerformanceModeEnabled: boolean;
  updateSetting: <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => void;
  toggleAutoPerformanceMode: () => void;
}

export default function VisualSettingsSection({ 
  settings, 
  autoPerformanceModeEnabled, 
  updateSetting, 
  toggleAutoPerformanceMode 
}: VisualSettingsSectionProps) {
  const togglePerformanceMode = () => {
    const newValue = !settings.performanceMode;
    updateSetting('performanceMode', newValue);
    
    if (newValue) {
      updateSetting('showTrails', false);
      console.log('🔧 Performance Mode enabled - Visual quality optimized for better FPS');
    } else {
      updateSetting('showTrails', true);
      console.log('🔧 Performance Mode disabled - Full visual quality restored');
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
        <Eye className="w-5 h-5" />
        Visual Settings
      </h3>
      
      <div className="space-y-4">
        {/* Performance Mode Toggle */}
        <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 border border-orange-500/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="text-orange-300 font-semibold">Performance Mode</label>
              <p className="text-orange-200 text-xs mt-1">
                Optimizes for better FPS: disables trails, reduces particles, removes shadows
              </p>
            </div>
            <button
              onClick={togglePerformanceMode}
              className={`w-12 h-6 rounded-full transition-colors duration-200 relative ${
                settings.performanceMode ? 'bg-orange-500' : 'bg-gray-600'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ${
                settings.performanceMode ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
          
          {/* Auto Performance Mode */}
          <div className="flex items-center justify-between pt-3 border-t border-orange-500/30">
            <div>
              <label className="text-orange-200 text-sm">Auto-Enable on Low FPS</label>
              <p className="text-orange-300 text-xs mt-1">
                Automatically enable when FPS drops below 45 for 3+ seconds
              </p>
            </div>
            <button
              onClick={toggleAutoPerformanceMode}
              className={`w-10 h-5 rounded-full transition-colors duration-200 relative ${
                autoPerformanceModeEnabled ? 'bg-orange-400' : 'bg-gray-600'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ${
                autoPerformanceModeEnabled ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-gray-300">Show UI Elements</label>
          <button
            onClick={() => updateSetting('showUI', !settings.showUI)}
            className={`w-12 h-6 rounded-full transition-colors duration-200 relative ${
              settings.showUI ? 'bg-cyan-500' : 'bg-gray-600'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ${
              settings.showUI ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-gray-300">Show FPS Counter</label>
          <button
            onClick={() => updateSetting('showFPS', !settings.showFPS)}
            className={`w-12 h-6 rounded-full transition-colors duration-200 relative ${
              settings.showFPS ? 'bg-cyan-500' : 'bg-gray-600'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ${
              settings.showFPS ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-gray-300">Show Performance Stats</label>
          <button
            onClick={() => updateSetting('showPerformanceStats', !settings.showPerformanceStats)}
            className={`w-12 h-6 rounded-full transition-colors duration-200 relative ${
              settings.showPerformanceStats ? 'bg-cyan-500' : 'bg-gray-600'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ${
              settings.showPerformanceStats ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-gray-300">Show Particle Trails</label>
            {settings.performanceMode && (
              <p className="text-orange-400 text-xs">Disabled in Performance Mode</p>
            )}
          </div>
          <button
            onClick={() => updateSetting('showTrails', !settings.showTrails)}
            disabled={settings.performanceMode}
            className={`w-12 h-6 rounded-full transition-colors duration-200 relative ${
              settings.showTrails && !settings.performanceMode ? 'bg-cyan-500' : 'bg-gray-600'
            } ${settings.performanceMode ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ${
              settings.showTrails && !settings.performanceMode ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
      </div>
    </div>
  );
}