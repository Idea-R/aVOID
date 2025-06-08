import React, { useState, useEffect } from 'react';
import Game from './components/Game';
import PasswordResetModal from './components/PasswordResetModal';
import { useAuthStore } from './store/authStore';

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);
  const { initialize, handlePasswordResetRedirect } = useAuthStore();

  useEffect(() => {
    const initializeApp = async () => {
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
      const autoStartTimer = setTimeout(() => {
        setGameStarted(true);
        
        // Track auto-start engagement
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'auto_start_triggered', {
            event_category: 'engagement',
            event_label: 'game_auto_started'
          });
        }
      }, 500); // Small delay to ensure smooth loading
      
      return () => clearTimeout(autoStartTimer);
    };
    
    initializeApp();
  }, [initialize, handlePasswordResetRedirect]);

  const handleManualStart = () => {
    setGameStarted(true);
    
    // Track manual start
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'manual_start_clicked', {
        event_category: 'engagement',
        event_label: 'start_button_clicked'
      });
    }
  };

  const handlePasswordResetSuccess = () => {
    setPasswordResetSuccess(true);
    setShowPasswordReset(false);
    
    // Show success message for 3 seconds, then start game
    setTimeout(() => {
      setPasswordResetSuccess(false);
      setGameStarted(true);
    }, 3000);
  };

  const handlePasswordResetClose = () => {
    setShowPasswordReset(false);
    setGameStarted(true); // Start game even if they cancel
  };

  return (
    <div className="min-h-screen bg-black text-cyan-500 flex items-center justify-center relative overflow-hidden">
      <Game autoStart={gameStarted} />
      
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