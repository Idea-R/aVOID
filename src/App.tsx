import React, { useState, useEffect, useCallback, useRef } from 'react';
import Game from './components/Game';
import PasswordResetModal from './components/PasswordResetModal';
// import AuthTestPanel from './components/AuthTestPanel'; // Archived for now
import { useAuthStore } from './store/authStore';
// import { logSupabaseHealth } from './utils/supabaseCheck'; // Not currently used
// import { quickAuthDiagnostic } from './utils/authDebugger'; // Archived for now
import { setupPerformanceMonitoring } from './react-performance-monitor';

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
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);
  const { initialize, handlePasswordResetRedirect } = useAuthStore();
  
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

  const handleManualStart = useCallback(() => {
    cleanupTimeouts(); // Cancel any pending auto-start
    setGameStarted(true);
    
    // Track manual start
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'manual_start_clicked', {
        event_category: 'engagement',
        event_label: 'start_button_clicked'
      });
    }
  }, [cleanupTimeouts]);

  const handlePasswordResetSuccess = useCallback(() => {
    setPasswordResetSuccess(true);
    setShowPasswordReset(false);
    
    // Show success message for 3 seconds, then start game
    successTimerRef.current = setTimeout(() => {
      setPasswordResetSuccess(false);
      setGameStarted(true);
    }, 3000);
  }, []);

  const handlePasswordResetClose = useCallback(() => {
    setShowPasswordReset(false);
    setGameStarted(true); // Start game even if they cancel
  }, []);

  useEffect(() => {
    // Handle visibility changes more efficiently
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('🔧 App hidden - pausing performance monitoring');
        // Could pause monitoring here if needed
      } else {
        console.log('🔧 App visible - resuming performance monitoring');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Clean up any remaining timeouts
      cleanupTimeoutsRef.current.forEach(id => clearTimeout(id));
      cleanupTimeoutsRef.current = [];
    };
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
      
      {/* Fallback manual start button */}
      {!gameStarted && !showPasswordReset && !passwordResetSuccess && (
        <button
          onClick={handleManualStart}
          className="absolute top-4 left-4 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200 z-50 opacity-80 hover:opacity-100"
        >
          Start Game
        </button>
      )}


    </div>
  );
}

export default App;