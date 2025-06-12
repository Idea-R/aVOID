import React, { useState, useEffect } from 'react';
import { X, Settings, Users } from 'lucide-react';
import PerformanceSettingsSection from './settings/PerformanceSettingsSection';
import SocialSupportSection from './settings/SocialSupportSection';

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
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<GameSettings>({
    volume: 0.5,
    soundEnabled: true,
    showUI: true,
    showFPS: true,
    showPerformanceStats: true,
    showTrails: false,
    performanceMode: false
  });

  const [activeTab, setActiveTab] = useState<'settings' | 'social'>('settings');
  const [autoPerformanceModeEnabled, setAutoPerformanceModeEnabled] = useState(false);

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
    
    // Listen for engine performance mode changes to keep UI in sync
    const handleEnginePerformanceModeChange = (event: CustomEvent) => {
      const { performanceMode, source } = event.detail;
      if (source === 'engine') {
        console.log(`🔧 [SettingsModal] Engine performance mode changed: ${performanceMode}`);
        setSettings(prev => ({ ...prev, performanceMode }));
      }
    };
    
    window.addEventListener('enginePerformanceModeChanged', handleEnginePerformanceModeChange as EventListener);
    
    return () => {
      window.removeEventListener('enginePerformanceModeChanged', handleEnginePerformanceModeChange as EventListener);
    };
  }, []);

  const resetSettings = () => {
    const defaultSettings: GameSettings = {
      volume: 0.5,
      soundEnabled: true,
      showUI: true,
      showFPS: true,
      showPerformanceStats: true,
      showTrails: false,
      performanceMode: false
    };
    setSettings(defaultSettings);
    setAutoPerformanceModeEnabled(false);
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

  const toggleAutoPerformanceMode = () => {
    const newValue = !autoPerformanceModeEnabled;
    setAutoPerformanceModeEnabled(newValue);
    
    if (newValue) {
      console.log('🔧 Auto Performance Mode enabled - Will activate when FPS drops below 45');
    } else {
      console.log('🔧 Auto Performance Mode disabled');
    }
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
              <Users className="w-4 h-4 inline mr-2" />
              Support & Social
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {activeTab === 'settings' ? (
                          <div className="space-y-6">
                <PerformanceSettingsSection 
                  settings={settings} 
                  autoPerformanceModeEnabled={autoPerformanceModeEnabled}
                  updateSetting={updateSetting} 
                  toggleAutoPerformanceMode={toggleAutoPerformanceMode}
                />

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
            <SocialSupportSection />
          )}
        </div>
      </div>
    </div>
  );
}