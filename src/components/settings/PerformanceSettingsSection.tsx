import React from 'react';
import { Gauge, Zap, Monitor, Smartphone } from 'lucide-react';

interface GameSettings {
  volume: number;
  soundEnabled: boolean;
  showUI: boolean;
  showFPS: boolean;
  showPerformanceStats: boolean;
  showTrails: boolean;
  performanceMode: boolean;
}

interface PerformanceSettingsSectionProps {
  settings: GameSettings;
  autoPerformanceModeEnabled: boolean;
  updateSetting: <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => void;
  toggleAutoPerformanceMode: () => void;
}

export default function PerformanceSettingsSection({ 
  settings, 
  autoPerformanceModeEnabled, 
  updateSetting, 
  toggleAutoPerformanceMode 
}: PerformanceSettingsSectionProps) {
  
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
        <Gauge className="w-5 h-5" />
        Performance & Optimization
      </h3>
      
      <div className="space-y-4">
        
        {/* Performance Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <label className="text-gray-300">Performance Mode</label>
            <span className="text-xs text-gray-500">(Reduces visual effects)</span>
          </div>
          <button
            onClick={() => updateSetting('performanceMode', !settings.performanceMode)}
            className={`w-12 h-6 rounded-full transition-colors duration-200 relative ${
              settings.performanceMode ? 'bg-yellow-500' : 'bg-gray-600'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ${
              settings.performanceMode ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {/* Auto Performance Mode */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-blue-400" />
            <label className="text-gray-300">Auto Performance Mode</label>
            <span className="text-xs text-gray-500">(Activates on low FPS)</span>
          </div>
          <button
            onClick={toggleAutoPerformanceMode}
            className={`w-12 h-6 rounded-full transition-colors duration-200 relative ${
              autoPerformanceModeEnabled ? 'bg-blue-500' : 'bg-gray-600'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ${
              autoPerformanceModeEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {/* Debug Information */}
        <div className="border-t border-gray-700 pt-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Debug Information
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <label className="text-gray-300 text-sm">FPS Counter</label>
              <button
                onClick={() => updateSetting('showFPS', !settings.showFPS)}
                className={`w-10 h-5 rounded-full transition-colors duration-200 relative ${
                  settings.showFPS ? 'bg-cyan-500' : 'bg-gray-600'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ${
                  settings.showFPS ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-gray-300 text-sm">Performance Stats</label>
              <button
                onClick={() => updateSetting('showPerformanceStats', !settings.showPerformanceStats)}
                className={`w-10 h-5 rounded-full transition-colors duration-200 relative ${
                  settings.showPerformanceStats ? 'bg-cyan-500' : 'bg-gray-600'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ${
                  settings.showPerformanceStats ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-gray-300 text-sm">Player Trails</label>
              <button
                onClick={() => updateSetting('showTrails', !settings.showTrails)}
                className={`w-10 h-5 rounded-full transition-colors duration-200 relative ${
                  settings.showTrails ? 'bg-cyan-500' : 'bg-gray-600'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ${
                  settings.showTrails ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-gray-300 text-sm">UI Elements</label>
              <button
                onClick={() => updateSetting('showUI', !settings.showUI)}
                className={`w-10 h-5 rounded-full transition-colors duration-200 relative ${
                  settings.showUI ? 'bg-cyan-500' : 'bg-gray-600'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ${
                  settings.showUI ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Performance Tips */}
        <div className="bg-gray-900/50 rounded p-3 text-xs text-gray-400">
          <div className="font-semibold text-cyan-300 mb-1">💡 Performance Tips:</div>
          <ul className="space-y-1">
            <li>• Enable Performance Mode on mobile devices</li>
            <li>• Auto Performance Mode activates when FPS drops below 45</li>
            <li>• Disable trails and effects if experiencing lag</li>
            <li>• Close other browser tabs for better performance</li>
          </ul>
        </div>
      </div>
    </div>
  );
}