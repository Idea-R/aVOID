import React, { useState, useEffect } from 'react';
import { X, Volume2, VolumeX, Eye, EyeOff, Settings, Heart, Github, Twitter, ExternalLink, Twitch } from 'lucide-react';

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
  performanceMode: boolean;
  cursorColor: string;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<GameSettings>({
    volume: 0.7,
    soundEnabled: true,
    showUI: true,
    showFPS: true,
    showPerformanceStats: true,
    showTrails: true,
    performanceMode: false,
    cursorColor: '#06b6d4'
  });

  const [activeTab, setActiveTab] = useState<'settings' | 'social'>('settings');
  const [autoPerformanceModeEnabled, setAutoPerformanceModeEnabled] = useState(false);
  const [showColorWheel, setShowColorWheel] = useState(false);
  const [previewColor, setPreviewColor] = useState<string | null>(null);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('avoidGameSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
        
        // Check if auto-performance mode was previously enabled
        const autoMode = localStorage.getItem('avoidGameAutoPerformanceMode');
        if (autoMode === 'true') {
          setAutoPerformanceModeEnabled(true);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
    
    // Auto-detect mobile devices and enable performance mode
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     window.innerWidth <= 768;
    
    if (isMobile && !localStorage.getItem('avoidGameSettings')) {
      // First time on mobile - enable performance mode by default
      setSettings(prev => ({ ...prev, performanceMode: true, cursorColor: '#06b6d4' }));
      setAutoPerformanceModeEnabled(true);
      localStorage.setItem('avoidGameAutoPerformanceMode', 'true');
      console.log('🔧 Auto-enabled Performance Mode for mobile device');
    }
  }, []);

  // Color wheel interaction handlers
  const handleColorWheelClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    
    const x = event.clientX - rect.left - centerX;
    const y = event.clientY - rect.top - centerY;
    const distance = Math.sqrt(x * x + y * y);
    
    if (distance <= radius) {
      const angle = Math.atan2(y, x);
      const hue = ((angle * 180 / Math.PI) + 360) % 360;
      const saturation = Math.min(distance / radius * 100, 100);
      const lightness = 60; // Fixed lightness for vibrant colors
      
      const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      updateSetting('cursorColor', color);
      setPreviewColor(null);
    }
  };

  const handleColorWheelMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    
    const x = event.clientX - rect.left - centerX;
    const y = event.clientY - rect.top - centerY;
    const distance = Math.sqrt(x * x + y * y);
    
    if (distance <= radius) {
      const angle = Math.atan2(y, x);
      const hue = ((angle * 180 / Math.PI) + 360) % 360;
      const saturation = Math.min(distance / radius * 100, 100);
      const lightness = 60;
      
      const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      setPreviewColor(color);
    } else {
      setPreviewColor(null);
    }
  };

  const handleColorWheelMouseLeave = () => {
    setPreviewColor(null);
  };

  // Draw color wheel on canvas
  const drawColorWheel = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw color wheel
    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = (angle - 1) * Math.PI / 180;
      const endAngle = angle * Math.PI / 180;
      
      for (let r = 0; r < radius; r += 1) {
        const saturation = (r / radius) * 100;
        const lightness = 60;
        const color = `hsl(${angle}, ${saturation}%, ${lightness}%)`;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, startAngle, endAngle);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    
    // Draw border
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  // Color wheel ref and effect
  const colorWheelRef = React.useRef<HTMLCanvasElement>(null);
  
  React.useEffect(() => {
    if (showColorWheel && colorWheelRef.current) {
      drawColorWheel(colorWheelRef.current);
    }
  }, [showColorWheel]);

  // Preset colors
  const presetColors = [
    { name: 'Cyan', color: '#06b6d4' },
    { name: 'Purple', color: '#8b5cf6' },
    { name: 'Green', color: '#10b981' },
    { name: 'Orange', color: '#f59e0b' },
    { name: 'Pink', color: '#ec4899' },
    { name: 'Red', color: '#ef4444' },
    { name: 'Blue', color: '#3b82f6' },
    { name: 'Yellow', color: '#eab308' }
  ];

  const resetSettings = () => {
    const defaultSettings: GameSettings = {
      volume: 0.7,
      soundEnabled: true,
      showUI: true,
      showFPS: true,
      showPerformanceStats: true,
      showTrails: true,
      performanceMode: false,
      cursorColor: '#06b6d4'
    };
    setSettings(defaultSettings);
    setAutoPerformanceModeEnabled(false);
    setPreviewColor(null);
  };

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('avoidGameSettings', JSON.stringify(settings));
    localStorage.setItem('avoidGameAutoPerformanceMode', autoPerformanceModeEnabled.toString());
    
    // Dispatch custom event for game engine to listen to
    window.dispatchEvent(new CustomEvent('gameSettingsChanged', { 
      detail: { ...settings, autoPerformanceModeEnabled }
    }));
  }, [settings, autoPerformanceModeEnabled]);

  const updateSetting = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const togglePerformanceMode = () => {
    const newValue = !settings.performanceMode;
    updateSetting('performanceMode', newValue);
    
    if (newValue) {
      // When enabling performance mode, apply optimizations
      updateSetting('showTrails', false);
      console.log('🔧 Performance Mode enabled - Visual quality optimized for better FPS');
    } else {
      // When disabling performance mode, restore full quality
      updateSetting('showTrails', true);
      console.log('🔧 Performance Mode disabled - Full visual quality restored');
    }
  };

  const toggleAutoPerformanceMode = () => {
    const newValue = !autoPerformanceModeEnabled;
    setAutoPerformanceModeEnabled(newValue);
    
    if (newValue) {
      console.log('🔧 Auto Performance Mode enabled - Will activate when FPS drops below 45');
    } else {
      console.log('🔧 Auto Performance Mode disabled');
    }
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

  const handlePayPalTip = () => {
    window.open('https://paypal.me/Xentrilo', '_blank');
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

                  {/* Cursor Color Settings */}
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
                      <div 
                        className="w-5 h-5 rounded-full border-2 border-white shadow-lg"
                        style={{ backgroundColor: previewColor || settings.cursorColor }}
                      />
                      Cursor Color
                    </h3>
                    
                    <div className="space-y-4">
                      {/* Current Color Display */}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">Current Color:</span>
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-full border-2 border-white shadow-lg cursor-pointer transition-transform hover:scale-110"
                            style={{ backgroundColor: previewColor || settings.cursorColor }}
                            onClick={() => setShowColorWheel(!showColorWheel)}
                          />
                          <span className="text-sm text-gray-400 font-mono">
                            {previewColor || settings.cursorColor}
                          </span>
                        </div>
                      </div>

                      {/* Preset Colors */}
                      <div>
                        <label className="text-gray-300 block mb-2">Preset Colors:</label>
                        <div className="grid grid-cols-4 gap-2">
                          {presetColors.map((preset) => (
                            <button
                              key={preset.name}
                              onClick={() => updateSetting('cursorColor', preset.color)}
                              className={`w-12 h-12 rounded-full border-2 transition-all duration-200 hover:scale-110 hover:shadow-lg ${
                                settings.cursorColor === preset.color 
                                  ? 'border-white shadow-lg ring-2 ring-cyan-500' 
                                  : 'border-gray-600 hover:border-white'
                              }`}
                              style={{ backgroundColor: preset.color }}
                              title={preset.name}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Color Wheel Toggle */}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">Custom Color Wheel:</span>
                        <button
                          onClick={() => setShowColorWheel(!showColorWheel)}
                          className={`px-4 py-2 rounded-lg font-semibold transition-colors duration-200 ${
                            showColorWheel 
                              ? 'bg-cyan-600 text-white' 
                              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                          }`}
                        >
                          {showColorWheel ? 'Hide Wheel' : 'Show Wheel'}
                        </button>
                      </div>

                      {/* Color Wheel */}
                      {showColorWheel && (
                        <div className="flex flex-col items-center space-y-3">
                          <canvas
                            ref={colorWheelRef}
                            width={200}
                            height={200}
                            className="cursor-crosshair rounded-full shadow-lg border-2 border-gray-600"
                            onClick={handleColorWheelClick}
                            onMouseMove={handleColorWheelMouseMove}
                            onMouseLeave={handleColorWheelMouseLeave}
                          />
                          <p className="text-xs text-gray-400 text-center">
                            Click anywhere on the wheel to select a color
                            <br />
                            Distance from center = saturation
                          </p>
                          {previewColor && (
                            <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
                              <p className="text-sm text-gray-300">
                                Preview: <span className="font-mono text-cyan-300">{previewColor}</span>
                              </p>
                              <div 
                                className="w-full h-4 rounded mt-2 border border-gray-500"
                                style={{ backgroundColor: previewColor }}
                              />
                            </div>
                          )}
                        </div>
                      )}
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
                    href="https://twitter.com/Xentrilo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-3"
                  >
                    <Twitter className="w-5 h-5" />
                    Follow on Twitter
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <a
                    href="https://twitch.tv/MadXent"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-3"
                  >
                    <Twitch className="w-5 h-5" />
                    Watch on Twitch
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
                  <p><strong>Performance:</strong> Adaptive quality scaling</p>
                </div>
                
                <div className="mt-4 p-3 bg-cyan-900/30 border border-cyan-500/50 rounded-lg">
                  <p className="text-cyan-200 text-sm">
                    🎮 <strong>How to play:</strong> Move your mouse to avoid meteors. 
                    Double-click to use knockback power when available. Survive as long as possible!
                  </p>
                  <p className="text-cyan-200 text-sm mt-2">
                    ⚡ <strong>Performance tip:</strong> Enable Performance Mode for smoother gameplay on slower devices.
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