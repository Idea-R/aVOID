import React, { useState, useEffect } from 'react';
import { Trophy, Star, Users, X } from 'lucide-react';
import { LeaderboardAPI, LeaderboardScore } from '../api/leaderboard';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerScore?: number;
}

export default function LeaderboardModal({ isOpen, onClose, playerScore }: LeaderboardModalProps) {
  const [scores, setScores] = useState<LeaderboardScore[]>([]);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const loadLeaderboard = async () => {
      setLoading(true);
      const topScores = await LeaderboardAPI.getTopScores(10);
      setScores(topScores);

      if (playerScore !== undefined) {
        const rank = await LeaderboardAPI.getPlayerRank(playerScore);
        setPlayerRank(rank);
      }

      setLoading(false);
    };

    loadLeaderboard();

    // Subscribe to real-time updates
    const subscription = LeaderboardAPI.subscribeToLeaderboard((newScores) => {
      setScores(newScores);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isOpen, playerScore]);

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
              <h2 className="text-2xl font-bold text-white">Global Leaderboard</h2>
              <p className="text-cyan-100">Top players worldwide</p>
            </div>
          </div>

          {playerRank && playerScore !== undefined && (
            <div className="mt-4 bg-black bg-opacity-30 rounded-lg p-3">
              <p className="text-white text-lg">
                🎯 You placed <span className="font-bold text-yellow-400">#{playerRank}</span> globally with {formatScore(playerScore)} points!
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
              <p className="text-gray-400">No scores yet. Be the first to play!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scores.map((score, index) => (
                <div
                  key={score.id}
                  className={`flex items-center justify-between p-4 rounded-lg transition-all duration-200 ${
                    index < 3
                      ? 'bg-gradient-to-r from-yellow-900/30 to-yellow-800/30 border border-yellow-600/50'
                      : 'bg-gray-800/50 border border-gray-700'
                  } ${score.is_verified ? 'shadow-lg shadow-cyan-500/20' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                      index === 0 ? 'bg-yellow-500 text-black' :
                      index === 1 ? 'bg-gray-400 text-black' :
                      index === 2 ? 'bg-amber-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${
                          score.is_verified 
                            ? 'text-cyan-300 drop-shadow-lg' 
                            : 'text-gray-300'
                        }`}>
                          {score.player_name}
                        </span>
                        {score.is_verified && (
                          <Star className="w-4 h-4 text-cyan-400 fill-current animate-pulse" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {formatDate(score.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      score.is_verified ? 'text-cyan-300' : 'text-gray-300'
                    }`}>
                      {formatScore(score.score)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {score.is_verified ? 'Verified' : 'Guest'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-800 p-4 border-t border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <Star className="w-4 h-4 text-cyan-400" />
              <span>Verified players shown with glowing text</span>
            </div>
            <div className="text-gray-500">
              Updates in real-time
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}