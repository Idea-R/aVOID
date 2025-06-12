import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Trophy, User, UserPlus, Settings, UserCircle, HelpCircle, Star, Music, Menu, X, Smartphone, Monitor, RotateCcw, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { ComboInfo } from '../game/systems/ScoreSystem';
import AccountModal from './AccountModal';
import SignupModal from './SignupModal';
import LeaderboardModal from './LeaderboardModal';
import SettingsModal from './SettingsModal';
import ProfileModal from './ProfileModal';
import HelpModal from './HelpModal';
import CyberpunkScoreDisplay from './CyberpunkScoreDisplay';
import MusicControls from './MusicControls';

interface HUDProps {
  score: number;
  comboInfo?: ComboInfo;
  powerUpCharges?: number;
  maxPowerUpCharges?: number;
  time: number;
  fps: number;
  meteors?: number;
  particles?: number;
  poolSizes?: { meteors: number; particles: number };
  autoScaling?: { enabled: boolean; shadowsEnabled: boolean; maxParticles: number; adaptiveTrailsActive?: boolean };
  performance?: { averageFrameTime: number; memoryUsage: number; lastScalingEvent: string };
  settings?: { performanceMode?: boolean; showFPS?: boolean; showPerformanceStats?: boolean };
  isGameOver?: boolean;
  showIntro?: boolean;
  isPaused?: boolean;
  audioManager?: any;
}

// Memoized icon components
const MemoizedMenu = React.memo(Menu);
const MemoizedX = React.memo(X);
const MemoizedStar = React.memo(Star);
const MemoizedMusic = React.memo(Music);
const MemoizedHelpCircle = React.memo(HelpCircle);
const MemoizedSettings = React.memo(Settings);
const MemoizedTrophy = React.memo(Trophy);
const MemoizedUserCircle = React.memo(UserCircle);
const MemoizedUserPlus = React.memo(UserPlus);
const MemoizedSmartphone = React.memo(Smartphone);
const MemoizedMonitor = React.memo(Monitor);
const MemoizedRotateCcw = React.memo(RotateCcw);
const MemoizedLogOut = React.memo(LogOut);

// Orientation types
type OrientationPreference = 'portrait' | 'landscape' | 'auto';
type UIMode = 'simple' | 'full' | 'auto';

// Smart device detection
const detectMobileDevice = () => {
  const userAgent = navigator.userAgent;
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isSmallScreen = window.innerWidth < 768;
  const isTouchDevice = 'ontouchstart' in window;
  
  return isMobileUA || (isSmallScreen && isTouchDevice);
};

const detectPerformanceNeeds = () => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    const renderer = gl ? gl.getParameter(gl.RENDERER) as string || '' : '';
    
    // Simple heuristics for performance detection
    const isLowEnd = renderer.includes('Intel HD') || 
                     renderer.includes('Intel(R) HD') ||
                     navigator.hardwareConcurrency < 4 ||
                     window.devicePixelRatio > 2;
    
    return isLowEnd;
  } catch {
    // Fallback for environments without WebGL
    return navigator.hardwareConcurrency < 4;
  }
};

function HUD({ score, comboInfo, powerUpCharges = 0, maxPowerUpCharges = 3, time, fps, meteors = 0, particles = 0, poolSizes, autoScaling, performance, settings, isGameOver = false, showIntro = false, isPaused = false, audioManager }: HUDProps) {
  const { user, signOut } = useAuthStore();
  
  // Modal states (preserved)
  const [showAccount, setShowAccount] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showMusicControls, setShowMusicControls] = useState(false);
  
  // Menu and interaction states
  const [menuExpanded, setMenuExpanded] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [orientationPreference, setOrientationPreference] = useState<OrientationPreference>('auto');
  const [uiMode, setUIMode] = useState<UIMode>('auto');
  
  // Auto-hide functionality
  const menuTimeoutRef = useRef<NodeJS.Timeout>();
  const lastInteractionRef = useRef<number>(Date.now());
  
  // Smart detection
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [detectedMobileDevice] = useState(detectMobileDevice());
  const [needsPerformanceMode] = useState(detectPerformanceNeeds());
  
  // Determine effective UI mode
  const effectiveUIMode = useMemo(() => {
    if (uiMode === 'auto') {
      return detectedMobileDevice ? 'simple' : 'full';
    }
    return uiMode;
  }, [uiMode, detectedMobileDevice]);
  
  React.useEffect(() => {
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const newIsMobile = window.innerWidth < 768;
        setIsMobile(prevIsMobile => prevIsMobile !== newIsMobile ? newIsMobile : prevIsMobile);
      }, 150);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  // Auto-hide menu functionality
  const resetMenuTimer = useCallback(() => {
    lastInteractionRef.current = Date.now();
    
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
    }
    
    if (menuExpanded) {
      menuTimeoutRef.current = setTimeout(() => {
        setMenuExpanded(false);
      }, 3000);
    }
  }, [menuExpanded]);

  // Track user interactions to reset timer
  useEffect(() => {
    const handleUserInteraction = () => {
      if (menuExpanded) {
        resetMenuTimer();
      }
    };

    window.addEventListener('mousemove', handleUserInteraction);
    window.addEventListener('touchstart', handleUserInteraction);
    window.addEventListener('keydown', handleUserInteraction);

    return () => {
      window.removeEventListener('mousemove', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      if (menuTimeoutRef.current) {
        clearTimeout(menuTimeoutRef.current);
      }
    };
  }, [menuExpanded, resetMenuTimer]);

  // Event handlers (preserved)
  const handleShowMusicControls = useCallback(() => setShowMusicControls(true), []);
  const handleShowHelp = useCallback(() => setShowHelp(true), []);
  const handleShowSettings = useCallback(() => setShowSettings(true), []);
  const handleShowLeaderboard = useCallback(() => setShowLeaderboard(true), []);
  const handleShowProfile = useCallback(() => setShowProfile(true), []);
  const handleShowSignup = useCallback(() => setShowSignup(true), []);

  const handleCloseAccount = useCallback(() => setShowAccount(false), []);
  const handleCloseSignup = useCallback(() => setShowSignup(false), []);
  const handleCloseLeaderboard = useCallback(() => setShowLeaderboard(false), []);
  const handleCloseSettings = useCallback(() => setShowSettings(false), []);
  const handleCloseProfile = useCallback(() => setShowProfile(false), []);
  const handleCloseHelp = useCallback(() => setShowHelp(false), []);
  const handleCloseMusicControls = useCallback(() => setShowMusicControls(false), []);

  // Sign out handler
  const handleSignOut = useCallback(() => {
    setMenuExpanded(false);
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
    }
    signOut();
  }, [signOut]);

  // Menu expansion handlers
  const toggleMenu = useCallback(() => {
    setMenuExpanded(prev => {
      const newState = !prev;
      if (newState) {
        resetMenuTimer();
      } else if (menuTimeoutRef.current) {
        clearTimeout(menuTimeoutRef.current);
      }
      return newState;
    });
  }, [resetMenuTimer]);

  const closeMenuAndExecute = useCallback((action: () => void) => {
    setMenuExpanded(false);
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
    }
    action();
  }, []);

  // Orientation preference handlers
  const cycleOrientation = useCallback(() => {
    setOrientationPreference(prev => {
      const cycle: OrientationPreference[] = ['auto', 'portrait', 'landscape'];
      const currentIndex = cycle.indexOf(prev);
      const nextIndex = (currentIndex + 1) % cycle.length;
      return cycle[nextIndex];
    });
    resetMenuTimer();
  }, [resetMenuTimer]);

  // UI Mode cycling
  const cycleUIMode = useCallback(() => {
    setUIMode(prev => {
      const cycle: UIMode[] = ['auto', 'simple', 'full'];
      const currentIndex = cycle.indexOf(prev);
      const nextIndex = (currentIndex + 1) % cycle.length;
      return cycle[nextIndex];
    });
    resetMenuTimer();
  }, [resetMenuTimer]);

  const getOrientationIcon = () => {
    switch (orientationPreference) {
      case 'portrait': return MemoizedSmartphone;
      case 'landscape': return MemoizedMonitor;
      case 'auto': return MemoizedRotateCcw;
    }
  };

  const getOrientationLabel = () => {
    switch (orientationPreference) {
      case 'portrait': return 'Portrait';
      case 'landscape': return 'Landscape';
      case 'auto': return 'Auto';
    }
  };

  const getUIModeLabel = () => {
    switch (uiMode) {
      case 'simple': return 'Simple UI';
      case 'full': return 'Full UI';
      case 'auto': return `Auto (${effectiveUIMode})`;
    }
  };

  // Memoized values
  const userDisplayName = useMemo(() => {
    if (!user) return '';
    return user.user_metadata?.display_name || user.email?.split('@')[0] || 'Profile';
  }, [user?.user_metadata?.display_name, user?.email]);

  return (
    <>
      {/* RESPONSIVE SCORE DISPLAY - Desktop cyberpunk style, scaled for mobile */}
      {!isGameOver && !showIntro && !isPaused && effectiveUIMode === 'full' && (
        <div className={`${isMobile ? 'scale-75 origin-top' : 'scale-100'}`}>
          <CyberpunkScoreDisplay score={score} />
        </div>
      )}

      {/* SIMPLE OR MOBILE UI - Clean minimal display */}
      {!showIntro && effectiveUIMode === 'simple' && (
        <>
          {/* Score Display (Top-center) */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
              <div className="text-cyan-300 font-bold text-xl text-center">
                {score.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Power-up Tally (Below Score) */}
          <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-10">
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-2 rounded-lg border border-yellow-500/30 shadow-lg shadow-yellow-500/10">
              {Array.from({ length: maxPowerUpCharges }, (_, i) => (
                <MemoizedStar
                  key={i}
                  className={`w-4 h-4 ${
                    i < powerUpCharges ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'
                  } drop-shadow-lg`}
                />
              ))}
              <span className="text-yellow-300 font-bold text-sm ml-1">
                {powerUpCharges}/{maxPowerUpCharges}
              </span>
            </div>
          </div>
        </>
      )}

      {/* LEGACY POWER-UP DISPLAY (for full UI mode when not using cyberpunk display) */}
      {!showIntro && effectiveUIMode === 'full' && (
        <div className="absolute top-4 left-4 z-10">
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-2 rounded-lg border border-yellow-500/30 shadow-lg shadow-yellow-500/10">
            <MemoizedStar className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-300 font-bold text-sm">
              {powerUpCharges}/{maxPowerUpCharges}
            </span>
          </div>
        </div>
      )}

      {/* STYLISH EXPANDER BUTTON (Always visible) */}
      {!showIntro && (
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={toggleMenu}
            className="bg-black/60 backdrop-blur-sm hover:bg-black/80 text-white p-3 rounded-lg border border-blue-500/30 hover:border-cyan-400/60 transition-all duration-300 min-w-[48px] min-h-[48px] flex items-center justify-center shadow-lg hover:shadow-cyan-500/20 group"
            title={menuExpanded ? "Close Menu" : "Open Menu"}
          >
            {menuExpanded ? (
              <MemoizedX className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
            ) : (
              <MemoizedMenu className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
            )}
            <div className="absolute inset-0 rounded-lg bg-cyan-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        </div>
      )}

      {/* STYLISH COMPACT EXPANDABLE MENU */}
      {menuExpanded && !showIntro && (
        <div className="absolute top-16 right-4 z-30">
          <div className="bg-black/90 backdrop-blur-lg rounded-lg border border-cyan-500/40 shadow-2xl shadow-cyan-500/20 animate-slide-down">
            <div className="h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
            
            <div className="p-3 space-y-1 min-w-[160px]">
              
              {/* Settings */}
              <button
                onClick={() => closeMenuAndExecute(handleShowSettings)}
                className="w-full flex items-center gap-3 px-3 py-2 text-white/90 hover:text-white hover:bg-cyan-500/10 rounded-lg transition-all duration-200 group"
              >
                <MemoizedSettings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                <span className="text-sm">Settings</span>
                <div className="ml-auto w-1 h-1 bg-cyan-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              </button>

              {/* Help */}
              <button
                onClick={() => closeMenuAndExecute(handleShowHelp)}
                className="w-full flex items-center gap-3 px-3 py-2 text-white/90 hover:text-white hover:bg-blue-500/10 rounded-lg transition-all duration-200 group"
              >
                <MemoizedHelpCircle className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-sm">Help</span>
                <div className="ml-auto w-1 h-1 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              </button>

              {/* Leaderboard */}
              <button
                onClick={() => closeMenuAndExecute(handleShowLeaderboard)}
                className="w-full flex items-center gap-3 px-3 py-2 text-white/90 hover:text-white hover:bg-yellow-500/10 rounded-lg transition-all duration-200 group"
              >
                <MemoizedTrophy className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-sm">Leaderboard</span>
                <div className="ml-auto w-1 h-1 bg-yellow-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              </button>

              {/* Music Controls */}
              {audioManager && (
                <button
                  onClick={() => closeMenuAndExecute(handleShowMusicControls)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-white/90 hover:text-white hover:bg-purple-500/10 rounded-lg transition-all duration-200 group"
                >
                  <MemoizedMusic className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                  <span className="text-sm">Music</span>
                  <div className="ml-auto w-1 h-1 bg-purple-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </button>
              )}

              {/* User Account */}
              {user ? (
                <>
                  <button
                    onClick={() => closeMenuAndExecute(handleShowProfile)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-white/90 hover:text-white hover:bg-cyan-500/10 rounded-lg transition-all duration-200 group"
                  >
                    <MemoizedUserCircle className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                    <span className="text-sm truncate">{userDisplayName}</span>
                    <div className="ml-auto w-1 h-1 bg-cyan-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                  </button>
                  
                  {/* Sign Out Button */}
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2 text-white/90 hover:text-white hover:bg-red-500/10 rounded-lg transition-all duration-200 group"
                  >
                    <MemoizedLogOut className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                    <span className="text-sm">Sign Out</span>
                    <div className="ml-auto w-1 h-1 bg-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => closeMenuAndExecute(handleShowSignup)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-white/90 hover:text-white hover:bg-green-500/10 rounded-lg transition-all duration-200 group"
                >
                  <MemoizedUserPlus className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                  <span className="text-sm">Sign Up</span>
                  <div className="ml-auto w-1 h-1 bg-green-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </button>
              )}

              {/* Separator */}
              <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent my-2"></div>

              {/* UI Mode Toggle */}
              <button
                onClick={cycleUIMode}
                className="w-full flex items-center gap-3 px-3 py-2 text-white/90 hover:text-white hover:bg-indigo-500/10 rounded-lg transition-all duration-200 group"
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  <div className={`w-2 h-2 rounded-full ${uiMode === 'simple' ? 'bg-green-400' : uiMode === 'full' ? 'bg-blue-400' : 'bg-purple-400'}`}></div>
                </div>
                <span className="text-sm">{getUIModeLabel()}</span>
                <div className="ml-auto w-1 h-1 bg-indigo-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              </button>

              {/* Orientation Preference Toggle */}
              <button
                onClick={cycleOrientation}
                className="w-full flex items-center gap-3 px-3 py-2 text-white/90 hover:text-white hover:bg-orange-500/10 rounded-lg transition-all duration-200 group"
              >
                {React.createElement(getOrientationIcon(), { 
                  className: "w-4 h-4 group-hover:scale-110 transition-transform duration-300" 
                })}
                <span className="text-sm">{getOrientationLabel()}</span>
                <div className="ml-auto w-1 h-1 bg-orange-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              </button>

              {/* Debug Toggle (Developer Option) */}
              <button
                onClick={() => {
                  setShowDebugInfo(prev => !prev);
                  resetMenuTimer();
                }}
                className="w-full text-left px-3 py-2 text-gray-400 hover:text-white text-xs hover:bg-gray-600/10 rounded-lg transition-all duration-200 group"
              >
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full transition-colors duration-200 ${showDebugInfo ? 'bg-green-400' : 'bg-gray-600'}`}></span>
                  Debug Info
                </span>
              </button>
            </div>
            
            <div className="h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
          </div>
        </div>
      )}

      {/* CONDITIONAL DEBUG INFO (Hidden by Default) */}
      {showDebugInfo && !showIntro && (
        <div className="absolute bottom-4 left-4 text-xs text-white/70 bg-black/40 backdrop-blur-sm p-2 rounded border border-gray-500/30 shadow-lg">
          <div>FPS: {fps}</div>
          <div>Time: {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}</div>
          {meteors > 0 && <div>Meteors: {meteors}</div>}
          {particles > 0 && <div>Particles: {particles}</div>}
          <div className="text-xs text-gray-400 mt-1">
            UI: {effectiveUIMode} | Orient: {orientationPreference}
          </div>
          <div className="text-xs text-gray-400">
            Mobile: {detectedMobileDevice ? 'Yes' : 'No'} | Perf: {needsPerformanceMode ? 'Low' : 'High'}
          </div>
        </div>
      )}

      {/* ALL EXISTING MODALS (Unchanged) */}
      <AccountModal isOpen={showAccount} onClose={handleCloseAccount} />
      <SignupModal isOpen={showSignup} onClose={handleCloseSignup} playerScore={score} playerName="" />
      <LeaderboardModal isOpen={showLeaderboard} onClose={handleCloseLeaderboard} playerScore={score} />
      <SettingsModal isOpen={showSettings} onClose={handleCloseSettings} />
      <ProfileModal isOpen={showProfile} onClose={handleCloseProfile} userId={user?.id} />
      <HelpModal isOpen={showHelp} onClose={handleCloseHelp} />
      {audioManager && (
        <MusicControls 
          audioManager={audioManager} 
          isVisible={showMusicControls}
          onClose={handleCloseMusicControls}
        />
      )}
    </>
  );
}

// Optimized memo comparison with complete prop coverage
export default React.memo(HUD, (prevProps, nextProps) => {
  // Core state changes (always check)
  if (prevProps.score !== nextProps.score ||
      prevProps.powerUpCharges !== nextProps.powerUpCharges ||
      prevProps.maxPowerUpCharges !== nextProps.maxPowerUpCharges ||
      prevProps.isGameOver !== nextProps.isGameOver ||
      prevProps.showIntro !== nextProps.showIntro ||
      prevProps.isPaused !== nextProps.isPaused) {
    return false;
  }
  
  // AGGRESSIVE Performance Optimization - Reduce time/fps sensitivity
  // Time updates - only trigger on 10-second intervals instead of 5-second
  if (Math.floor(prevProps.time / 600) !== Math.floor(nextProps.time / 600)) {
    return false;
  }
  
  // FPS updates - only trigger on 10fps differences instead of 5fps
  if (Math.abs(prevProps.fps - nextProps.fps) > 10) {
    return false;
  }
  
  // Performance stats - higher thresholds to reduce sensitivity
  if (Math.abs((prevProps.meteors || 0) - (nextProps.meteors || 0)) > 10) {
    return false;
  }
  
  if (Math.abs((prevProps.particles || 0) - (nextProps.particles || 0)) > 50) {
    return false;
  }
  
  // Settings - only check essential performance flags
  if (prevProps.settings?.performanceMode !== nextProps.settings?.performanceMode ||
      prevProps.settings?.showFPS !== nextProps.settings?.showFPS) {
    return false;
  }
  
  // COMBO updates - throttle to prevent excessive animation renders
  if (prevProps.comboInfo?.count !== nextProps.comboInfo?.count &&
      Math.abs((prevProps.comboInfo?.count || 0) - (nextProps.comboInfo?.count || 0)) > 2) {
    return false;
  }
  
  // Ignore all other prop changes to maximize performance
  return true;
});