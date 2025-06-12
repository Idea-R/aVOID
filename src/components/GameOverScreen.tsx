import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Trophy, Eye, RotateCcw, Settings, UserCircle, UserPlus, HelpCircle, Music } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { ScoreBreakdown, ComboInfo } from '../game/systems/ScoreSystem';
import ScoreDisplay from './game/ScoreDisplay';
import GameOverActions from './game/GameOverActions';
import GameOverModals from './game/GameOverModals';
import logoImage from '../assets/Futuristic aVOID with Fiery Meteors.png';

interface GameOverScreenProps {
  score: number;
  scoreBreakdown: ScoreBreakdown;
  comboInfo: ComboInfo;
  onPlayAgain?: () => void;
  audioManager?: any;
}

// Memoized icon components to prevent re-creation
const MemoizedTrophy = React.memo(Trophy);

function GameOverScreen({ score, scoreBreakdown, comboInfo, onPlayAgain, audioManager }: GameOverScreenProps) {
  // CONSOLIDATED state to reduce render cycles
  const [uiState, setUIState] = useState({
    logoVisible: false,
    logoEnlarged: false,
    activeModal: null as string | null
  });
  
  const { user } = useAuthStore();

  // BATCH state updates to prevent cascading renders
  const toggleLogoSize = useCallback(() => {
    setUIState(prev => ({ ...prev, logoEnlarged: !prev.logoEnlarged }));
  }, []);

  const handlePlayAgain = useCallback(() => {
    console.log('Play again button clicked');
    if (onPlayAgain) {
      onPlayAgain();
    } else {
      window.location.reload();
    }
  }, [onPlayAgain]);

  const handleModalOpen = useCallback((modalType: string) => {
    setUIState(prev => ({ ...prev, activeModal: modalType }));
  }, []);

  const handleModalClose = useCallback(() => {
    setUIState(prev => ({ ...prev, activeModal: null }));
  }, []);

  // Memoize user display name to prevent re-computation
  const userDisplayName = useMemo(() => {
    if (!user) return '';
    return user.user_metadata?.display_name || user.email?.split('@')[0] || 'Profile';
  }, [user?.user_metadata?.display_name, user?.email]);

  // SINGLE effect with score-only dependency
  useEffect(() => {
    console.log('GameOverScreen mounted with score:', score);
    
    // Single state update for logo animation
    const logoTimer = setTimeout(() => {
      setUIState(prev => ({ ...prev, logoVisible: true }));
    }, 300);
    
    return () => {
      clearTimeout(logoTimer);
    };
  }, [score]);

  console.log('Rendering GameOverScreen');

  return (
    <>
      <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        {/* Animated Logo */}
        <div 
          onClick={toggleLogoSize}
          className={`absolute cursor-pointer transition-all duration-700 ease-out ${
            uiState.logoEnlarged 
              ? 'inset-4 z-[60] flex items-center justify-center' 
              : 'top-4 left-1/2 transform -translate-x-1/2 z-50 sm:top-8'
          } ${
            uiState.logoVisible 
              ? 'opacity-100 translate-y-0 scale-100' 
              : 'opacity-0 -translate-y-8 scale-95'
          }`}
        >
          <div className={`${uiState.logoEnlarged ? 'bg-black/95 rounded-2xl p-4 sm:p-8' : ''} transition-all duration-700`}>
            <img 
              src={logoImage} 
              alt="aVOID Logo" 
              className={`object-contain border border-cyan-500 rounded-lg p-2 bg-black/20 transition-all duration-700 ${
                uiState.logoEnlarged 
                  ? 'h-[50vh] sm:h-[60vh] md:h-[70vh] w-auto max-w-[90vw] shadow-2xl shadow-cyan-500/50' 
                  : 'h-12 sm:h-16 md:h-24 lg:h-32 w-auto'
              }`}
            />
            {uiState.logoEnlarged && (
              <div className="text-center mt-4 sm:mt-6">
                <p className="text-cyan-300 text-sm sm:text-base font-semibold mb-2">Tap to close</p>
                <p className="text-cyan-500 text-xs sm:text-sm opacity-80 mb-4">aVOID - Browser Dodge Game</p>
                
                {/* Developer Social Media */}
                <div className="border-t border-cyan-500/30 pt-4 mt-4">
                  <p className="text-cyan-400 text-sm font-medium mb-3">Follow the Developer</p>
                  <div className="flex justify-center gap-2 sm:gap-4 flex-wrap">
                    <a
                      href="https://twitter.com/Xentrilo"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 sm:gap-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 hover:text-blue-300 px-2 sm:px-3 py-2 rounded-lg transition-all duration-200 text-xs sm:text-sm"
                    >
                      <span>🐦</span>
                      <span>@Xentrilo</span>
                    </a>
                    <a
                      href="https://twitch.tv/MadXent"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 sm:gap-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 hover:text-purple-300 px-2 sm:px-3 py-2 rounded-lg transition-all duration-200 text-xs sm:text-sm"
                    >
                      <span>📺</span>
                      <span>MadXent</span>
                    </a>
                    <a
                      href="https://github.com/Idea-R"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 sm:gap-2 bg-gray-600/20 hover:bg-gray-600/40 text-gray-400 hover:text-gray-300 px-2 sm:px-3 py-2 rounded-lg transition-all duration-200 text-xs sm:text-sm"
                    >
                      <span>💻</span>
                      <span>Idea-R</span>
                    </a>
                  </div>
                  <p className="text-cyan-500/60 text-xs mt-3">Made with ❤️ by MadXent</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Compact Game Over Panel */}
        <div className={`bg-gray-900 p-3 sm:p-4 rounded-lg shadow-xl border border-cyan-500 max-w-xs sm:max-w-sm w-full mx-4 transition-all duration-700 ${
          uiState.logoEnlarged ? 'opacity-20 pointer-events-none' : 'opacity-100'
        }`}>
          {/* Compact Header */}
          <div className="flex items-center justify-center mb-3">
            <div className="flex items-center gap-2">
              <MemoizedTrophy className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500" />
              <h2 className="text-lg sm:text-xl font-bold text-cyan-500">Game Over!</h2>
            </div>
          </div>
          
          {/* Score Display Component */}
          <ScoreDisplay 
            score={score} 
            scoreBreakdown={scoreBreakdown} 
            comboInfo={comboInfo} 
          />

          {/* Action Buttons Component */}
          <GameOverActions
            user={user}
            score={score}
            onPlayAgain={handlePlayAgain}
            onModalOpen={handleModalOpen}
            audioManager={audioManager}
          />
        </div>
      </div>

      {/* Modals Component */}
      <GameOverModals
        activeModal={uiState.activeModal}
        onClose={handleModalClose}
        score={score}
        user={user}
        audioManager={audioManager}
      />
    </>
  );
}

// OPTIMIZED memo with reduced comparison surface
export default React.memo(GameOverScreen, (prevProps, nextProps) => {
  return (
    prevProps.score === nextProps.score &&
    prevProps.scoreBreakdown === nextProps.scoreBreakdown &&
    prevProps.comboInfo === nextProps.comboInfo &&
    prevProps.onPlayAgain === nextProps.onPlayAgain &&
    prevProps.audioManager === nextProps.audioManager
  );
});