import React from 'react';
import SignupModal from '../SignupModal';
import LeaderboardModal from '../LeaderboardModal';
import AccountModal from '../AccountModal';
import SettingsModal from '../SettingsModal';
import ProfileModal from '../ProfileModal';
import HelpModal from '../HelpModal';
import MusicControls from '../MusicControls';

interface GameOverModalsProps {
  activeModal: string | null;
  onClose: () => void;
  score: number;
  user: any;
  audioManager?: any;
}

function GameOverModals({ activeModal, onClose, score, user, audioManager }: GameOverModalsProps) {
  // Get pending score from session storage for guest-to-user conversion
  const getPendingScore = () => {
    const pendingScore = sessionStorage.getItem('pendingScore');
    const timestamp = sessionStorage.getItem('pendingScoreTimestamp');
    
    // Check if score is recent (within 10 minutes)
    if (pendingScore && timestamp) {
      const scoreTime = parseInt(timestamp);
      const now = Date.now();
      const tenMinutes = 10 * 60 * 1000;
      
      if (now - scoreTime < tenMinutes) {
        return parseInt(pendingScore);
      } else {
        // Clear expired score
        sessionStorage.removeItem('pendingScore');
        sessionStorage.removeItem('pendingScoreTimestamp');
      }
    }
    
    return score;
  };

  const handleSignupClose = () => {
    // Clear pending score after successful signup
    sessionStorage.removeItem('pendingScore');
    sessionStorage.removeItem('pendingScoreTimestamp');
    onClose();
  };

  return (
    <>
      <SignupModal
        isOpen={activeModal === 'signup'}
        onClose={handleSignupClose}
        playerScore={getPendingScore()}
        playerName=""
      />

      <LeaderboardModal
        isOpen={activeModal === 'leaderboard'}
        onClose={onClose}
        playerScore={score}
      />

      <AccountModal
        isOpen={activeModal === 'account'}
        onClose={onClose}
      />

      <SettingsModal
        isOpen={activeModal === 'settings'}
        onClose={onClose}
      />

      <ProfileModal
        isOpen={activeModal === 'profile'}
        onClose={onClose}
        userId={user?.id}
      />

      <HelpModal
        isOpen={activeModal === 'help'}
        onClose={onClose}
      />

      {/* Music Controls Modal */}
      {audioManager && (
        <MusicControls 
          audioManager={audioManager} 
          isVisible={activeModal === 'music'}
          onClose={onClose}
        />
      )}
    </>
  );
}

export default React.memo(GameOverModals); 