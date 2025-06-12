import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Star, Users, X, UserCircle } from 'lucide-react';
import { LeaderboardAPI, LeaderboardScore } from '../api/leaderboard';
import { useAuthStore } from '../store/authStore';
import ProfileModal from './ProfileModal';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerScore?: number;
}

export default function LeaderboardModal({ isOpen, onClose, playerScore }: LeaderboardModalProps) {
  const [scores, setScores] = useState<LeaderboardScore[]>([]);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  
  const { user } = useAuthStore();

  // Stable subscription ref to prevent re-creation
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      // Cleanup subscription when modal closes
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
        setSubscriptionActive(false);
      }
      return;
    }

    const loadLeaderboard = async () => {
      setLoading(true);
      try {
        const topScores = await LeaderboardAPI.getTopScores(10);
        setScores(topScores);

        if (playerScore !== undefined) {
          // Use verified rank for leaderboard positioning
          const rank = await LeaderboardAPI.getVerifiedPlayerRank(playerScore);
          setPlayerRank(rank);
        }
      } catch (error) {
        console.error('Error loading leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();

    // Only create subscription if not already active
    if (!subscriptionActive && !subscriptionRef.current) {
      try {
        const subscription = LeaderboardAPI.subscribeToLeaderboard((newScores) => {
          // Prevent unnecessary updates if modal is closed
          if (isOpen) {
            setScores(newScores);
          }
        });
        
        subscriptionRef.current = subscription;
        setSubscriptionActive(true);
        console.log('📈 Leaderboard subscription created');
      } catch (error) {
        console.error('Error creating leaderboard subscription:', error);
      }
    }

    // Cleanup on unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
        setSubscriptionActive(false);
        console.log('📈 Leaderboard subscription cleaned up');
      }
    };
  }, [isOpen]); // Only depend on isOpen to prevent constant re-creation

  // Separate effect for playerScore changes
  useEffect(() => {
    if (isOpen && playerScore !== undefined) {
      LeaderboardAPI.getVerifiedPlayerRank(playerScore).then(setPlayerRank);
    }
  }, [playerScore, isOpen]);

  const handleProfileClick = (userId: string | null) => {
    if (!userId) return;
    setSelectedUserId(userId);
    setShowProfile(true);
  };
  if (!isOpen) return null;

  const formatScore = (score: number) => score.toLocaleString();
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
            <Trophy className="w-8 h-8 text-yellow-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">Leaderboard Top 10</h2>
              <p className="text-cyan-100">Best score from each verified player</p>
            </div>
          </div>

          {playerRank && playerScore !== undefined && (
            <div className="mt-4 bg-black bg-opacity-30 rounded-lg p-3">
              <p className="text-white text-lg">
                🎯 You would place <span className="font-bold text-yellow-400">#{playerRank}</span> on the verified leaderboard with {formatScore(playerScore)} points!
              </p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
              <span className="ml-3 text-cyan-300">Loading leaderboard...</span>
            </div>
          ) : scores.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400">No verified scores yet. Be the first to sign up and play!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scores.map((score, index) => {
                const isTop3 = index < 3;
                const rankColor = index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-600' : 'text-cyan-400';
                const bgClass = isTop3 
                  ? `bg-gradient-to-r ${
                      index === 0 ? 'from-yellow-900/40 to-yellow-800/40 border-yellow-500/60' :
                      index === 1 ? 'from-gray-700/40 to-gray-600/40 border-gray-400/60' :
                      'from-amber-900/40 to-amber-800/40 border-amber-500/60'
                    }`
                  : 'bg-gray-800/50 border-gray-700';
                
                return (
                <div
                  key={score.id}
                  className={`flex items-center justify-between p-4 rounded-lg transition-all duration-200 ${bgClass} border shadow-lg ${isTop3 ? 'shadow-yellow-500/20' : 'shadow-cyan-500/10'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${
                      index === 0 ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/50' :
                      index === 1 ? 'bg-gray-400 text-black shadow-lg shadow-gray-400/50' :
                      index === 2 ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/50' :
                      'bg-gray-600 text-white'
                    }`}>
                      {index < 3 ? (
                        <span className="text-xl">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                        </span>
                      ) : (
                        `#${index + 1}`
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span 
                          className={`font-semibold text-cyan-300 drop-shadow-lg ${
                            score.user_id ? 'cursor-pointer hover:text-cyan-200 transition-colors' : ''
                          }`}
                          onClick={() => handleProfileClick(score.user_id)}
                        >
                          {score.player_name}
                        </span>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-cyan-400 fill-current animate-pulse" />
                          {score.user_id && (
                            <UserCircle 
                              className="w-4 h-4 text-cyan-400 cursor-pointer hover:text-cyan-300 transition-colors" 
                              onClick={() => handleProfileClick(score.user_id)}
                              title="View Profile"
                            />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        {formatDate(score.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold text-cyan-300">
                      {formatScore(score.score)}
                    </div>
                    <div className="text-xs text-cyan-400">
                      Verified
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-800 p-4 border-t border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <Star className="w-4 h-4 text-cyan-400" />
              <span>Only verified players shown • Sign up to compete!</span>
            </div>
            <div className="text-gray-500">
              Updates in real-time
            </div>
          </div>
        </div>
      </div>

      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        userId={selectedUserId || undefined}
      />
    </div>
  );
}