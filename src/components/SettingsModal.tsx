import React, { useState, useEffect } from 'react';
import { X, Volume2, VolumeX, Eye, EyeOff, Settings, Heart, Github, Twitter, ExternalLink } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GameSettings {
  volume: number;
  soundEnabled: boolean;
  showUI: boolean;
  showFPS: boolean;
  showPerformanceStats: boolean;
  showTrails: boolean;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<GameSettings>({
    volume: 0.7,
    soundEnabled: true,
    showUI: true,
    showFPS: true,
    showPerformanceStats: true,
    showTrails: true
  });

  const [activeTab, setActiveTab] = useState<'settings' | 'social'>('settings');

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('avoidGameSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('avoidGameSettings', JSON.stringify(settings));
    
    // Dispatch custom event for game engine to listen to
    window.dispatchEvent(new CustomEvent('gameSettingsChanged', { 
      detail: settings 
    }));
  }, [settings]);

  const updateSetting = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

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

  const resetSettings = () => {
    const defaultSettings: GameSettings = {
      volume: 0.7,
      soundEnabled: true,
      showUI: true,
      showFPS: true,
      showPerformanceStats: true,
      showTrails: true
    };
    setSettings(defaultSettings);
  };

  const handlePayPalTip = () => {
    window.open('https://paypal.me/madxent', '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl border border-cyan-500 max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8 text-white" />
            <div>
              <h2 className="text-2xl font-bold text-white">Game Settings</h2>
              <p className="text-cyan-100">Customize your aVOID experience</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === 'settings'
                  ? 'bg-white text-cyan-600'
                  : 'bg-cyan-700 text-white hover:bg-cyan-600'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Settings
            </button>
            <button
              onClick={() => setActiveTab('social')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === 'social'
                  ? 'bg-white text-cyan-600'
                  : 'bg-cyan-700 text-white hover:bg-cyan-600'
              }`}
            >
              <Heart className="w-4 h-4 inline mr-2" />
              Support & Social
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {activeTab === 'settings' ? (
            <div className="space-y-6">
              {/* Audio Settings */}
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

              {/* Visual Settings */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Visual Settings
                </h3>
                
                <div className="space-y-4">
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
                    <label className="text-gray-300">Show Particle Trails</label>
                    <button
                      onClick={() => updateSetting('showTrails', !settings.showTrails)}
                      className={`w-12 h-6 rounded-full transition-colors duration-200 relative ${
                        settings.showTrails ? 'bg-cyan-500' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ${
                        settings.showTrails ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Reset Settings */}
              <div className="flex justify-center">
                <button
                  onClick={resetSettings}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200"
                >
                  Reset to Defaults
                </button>
              </div>
            </div>
          ) : (
            /* Social & Support Tab */
            <div className="space-y-6">
              {/* Developer Support */}
              <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-500/50 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Heart className="w-6 h-6 text-pink-400" />
                  <div>
                    <h3 className="text-xl font-semibold text-purple-300">Support MadXent</h3>
                    <p className="text-purple-200 text-sm">Creator of aVOID</p>
                  </div>
                </div>
                
                <p className="text-purple-200 text-sm mb-4">
                  aVOID is a free, open-source game made with passion! If you enjoy playing, 
                  consider supporting the developer to help create more amazing games.
                </p>
                
                <button
                  onClick={handlePayPalTip}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 mb-4"
                >
                  <Heart className="w-5 h-5" />
                  Tip via PayPal
                </button>

                <div className="text-center text-purple-300 text-sm">
                  Every contribution helps keep the game free for everyone! 💜
                </div>
              </div>

              {/* Social Links */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
                  <ExternalLink className="w-5 h-5" />
                  Connect with MadXent
                </h3>
                
                <div className="space-y-3">
                  <a
                    href="https://twitter.com/madxent"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-3"
                  >
                    <Twitter className="w-5 h-5" />
                    Follow on Twitter
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <a
                    href="https://github.com/Idea-R"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-3"
                  >
                    <Github className="w-5 h-5" />
                    View on GitHub
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Game Info */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-cyan-300 mb-4">About aVOID</h3>
                <div className="space-y-2 text-sm text-gray-300">
                  <p><strong>Version:</strong> 1.0.0</p>
                  <p><strong>Built with:</strong> React, TypeScript, Canvas API</p>
                  <p><strong>Database:</strong> Supabase</p>
                  <p><strong>License:</strong> Open Source</p>
                </div>
                
                <div className="mt-4 p-3 bg-cyan-900/30 border border-cyan-500/50 rounded-lg">
                  <p className="text-cyan-200 text-sm">
                    🎮 <strong>How to play:</strong> Move your mouse to avoid meteors. 
                    Double-click to use knockback power when available. Survive as long as possible!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}