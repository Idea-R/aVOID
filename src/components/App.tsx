import React, { useState, useEffect, useCallback, useRef } from 'react';
import Game from './components/Game';
import PasswordResetModal from './components/PasswordResetModal';
import SignupModal from './components/SignupModal';
// import AuthTestPanel from './components/AuthTestPanel'; // Archived for now
import { useAuthStore } from './store/authStore';
// import { logSupabaseHealth } from './utils/supabaseCheck'; // Not currently used
// import { quickAuthDiagnostic } from './utils/authDebugger'; // Archived for now
import { setupPerformanceMonitoring } from './react-performance-monitor';
import { UserCircle, UserPlus } from 'lucide-react';

// Initialize performance monitoring with VERY LOW thresholds to catch everything
setupPerformanceMonitoring({
  enabled: true,
  enableConsoleLogging: true,
  maxRendersPerSecond: 5,    // Very low - catch any excessive rendering
  maxRenderTime: 10,         // 10ms threshold instead of 16ms
  warningThreshold: 3        // Warn after just 3 renders in a second
});

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);
  const { user, initialize, handlePasswordResetRedirect } = useAuthStore();
  
  // Refs to track timeouts for cleanup
  const autoStartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const successTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gameRef = useRef<HTMLDivElement>(null);
  const cleanupTimeoutsRef = useRef<number[]>([]);

  // Cleanup function to clear all active timeouts
  const cleanupTimeouts = useCallback(() => {
    if (autoStartTimerRef.current) {
      clearTimeout(autoStartTimerRef.current);
      autoStartTimerRef.current = null;
    }
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    cleanupTimeoutsRef.current.forEach(id => clearTimeout(id));
    cleanupTimeoutsRef.current = [];
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Run comprehensive auth diagnostic - Archived for now
        // await quickAuthDiagnostic();
        
        // Initialize auth
        await initialize();
        
        // Check if this is a password reset redirect
        const result = await handlePasswordResetRedirect();
        
        if (result.needsPasswordReset) {
          setShowPasswordReset(true);
          return; // Don't auto-start game if showing password reset
        }
        
        if (result.error) {
          console.error('Password reset redirect error:', result.error);
          // You could show an error toast here if needed
        }
        
        // Auto-start the game after a brief moment
        autoStartTimerRef.current = setTimeout(() => {
          setGameStarted(true);
          
          // Track auto-start engagement
          if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', 'auto_start_triggered', {
              event_category: 'engagement',
              event_label: 'game_auto_started'
            });
          }
        }, 500); // Small delay to ensure smooth loading
        
      } catch (error) {
        console.error('Failed to initialize app:', error);
        // Fallback: start game anyway after error
        autoStartTimerRef.current = setTimeout(() => {
          setGameStarted(true);
        }, 1000);
      }
    };
    
    initializeApp();

    // Cleanup function for useEffect
    return () => {
      cleanupTimeouts();
    };
  }, [initialize, handlePasswordResetRedirect, cleanupTimeouts]);

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return cleanupTimeouts;
  }, [cleanupTimeouts]);

  const handlePasswordResetClose = useCallback(() => {
    setShowPasswordReset(false);
    
    // Start the game after closing password reset modal
    autoStartTimerRef.current = setTimeout(() => {
      setGameStarted(true);
    }, 500);
  }, []);

  const handlePasswordResetSuccess = useCallback(() => {
    setPasswordResetSuccess(true);
    setShowPasswordReset(false);
    
    // Show success message for 3 seconds, then start game
    successTimerRef.current = setTimeout(() => {
      setPasswordResetSuccess(false);
      setGameStarted(true);
    }, 3000);
  }, []);

  const handleManualStart = useCallback(() => {
    setGameStarted(true);
    
    // Track manual start engagement
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'manual_start_clicked', {
        event_category: 'engagement',
        event_label: 'manual_game_start'
      });
    }
  }, []);

  const handleSignupOpen = useCallback(() => {
    setShowSignup(true);
  }, []);

  const handleSignupClose = useCallback(() => {
    setShowSignup(false);
  }, []);

  return (
    <div className="App h-screen w-screen overflow-hidden bg-black relative" ref={gameRef}>
      <Game autoStart={gameStarted} />
      
      {/* Temporary Auth Debugger - Archived for now */}
      {/* {import.meta.env.DEV && <AuthTestPanel />} */}
      
      {/* Password Reset Success Message */}
      {passwordResetSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg shadow-2xl border border-green-500 max-w-md w-full p-8 text-center">
            <div className="text-6xl mb-4">🔒✅</div>
            <h2 className="text-2xl font-bold text-green-400 mb-4">Password Updated!</h2>
            <p className="text-green-300 mb-4">
              Your password has been successfully updated. You can now continue playing aVOID!
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
          </div>
        </div>
      )}
      
      {/* Password Reset Modal */}
      <PasswordResetModal
        isOpen={showPasswordReset}
        onClose={handlePasswordResetClose}
        onSuccess={handlePasswordResetSuccess}
      />

      {/* Main Page Signup Modal */}
      <SignupModal
        isOpen={showSignup}
        onClose={handleSignupClose}
        playerScore={0}
        playerName=""
      />
      
      {/* Pre-Game Authentication UI */}
      {!gameStarted && !showPasswordReset && !passwordResetSuccess && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-black/50">
          {/* Welcome Message */}
          <div className="text-center mb-8 px-4">
            <h1 className="text-4xl sm:text-6xl font-bold text-cyan-500 mb-4">aVOID</h1>
            <p className="text-lg sm:text-xl text-cyan-300 mb-2">Browser Dodge Game</p>
            <p className="text-sm text-gray-400">Dodge meteors, collect power-ups, survive!</p>
          </div>

          {/* Authentication Section */}
          <div className="bg-gray-900/90 backdrop-blur-sm border border-cyan-500/50 rounded-lg p-6 mb-8 max-w-sm w-full mx-4">
            {user ? (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <UserCircle className="w-6 h-6 text-cyan-400" />
                  <span className="text-cyan-300 font-semibold">
                    Welcome back, {user.user_metadata?.display_name || user.email?.split('@')[0]}!
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-4">Your scores will be saved automatically</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <UserPlus className="w-6 h-6 text-cyan-400" />
                  <span className="text-cyan-300 font-semibold">Join the Competition</span>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  Sign up to save your scores and compete on the verified leaderboard
                </p>
                <button
                  onClick={handleSignupOpen}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-3 px-4 rounded transition-all duration-200 transform hover:scale-105 shadow-lg mb-3"
                >
                  Sign Up / Sign In
                </button>
                <p className="text-xs text-gray-500">
                  Or play as guest (scores won't be saved)
                </p>
              </div>
            )}
          </div>

          {/* Start Game Button */}
          <button
            onClick={handleManualStart}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors duration-200 shadow-lg transform hover:scale-105"
          >
            Start Game
          </button>
        </div>
      )}
    </div>
  );
}

export default App; 