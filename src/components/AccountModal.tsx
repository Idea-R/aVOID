import React, { useState, useEffect } from 'react';
import { X, User, Trophy, Star, LogOut, Key } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { LeaderboardAPI } from '../api/leaderboard';
import PasswordResetModal from './PasswordResetModal';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AccountModal({ isOpen, onClose }: AccountModalProps) {
  const { user, signOut } = useAuthStore();
  const [bestScore, setBestScore] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  useEffect(() => {
    if (!isOpen || !user) return;

    const loadUserStats = async () => {
      setLoading(true);
      const userBest = await LeaderboardAPI.getUserBestScore(user.id);
      setBestScore(userBest);
      setLoading(false);
    };

    loadUserStats();
  }, [isOpen, user]);

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  const handlePasswordChangeSuccess = () => {
    setShowPasswordChange(false);
    onClose(); // Close account modal after successful password change
  };

  if (!isOpen || !user) return null;

  const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Player';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl border border-cyan-500 max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-cyan-500 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{displayName}</h2>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-cyan-300" />
                <span className="text-cyan-100 text-sm">Verified Player</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
              <span className="ml-3 text-cyan-300">Loading stats...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <span className="font-semibold text-cyan-300">Best Score</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {bestScore > 0 ? bestScore.toLocaleString() : 'No scores yet'}
                </p>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="font-semibold text-cyan-300 mb-2">Account Info</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Email:</span>
                    <span className="text-white">{user.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Member since:</span>
                    <span className="text-white">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3 mt-6">
            <button
              onClick={() => setShowPasswordChange(true)}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <Key className="w-4 h-4" />
              Change Password
            </button>
            
            <button
              onClick={handleSignOut}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      <PasswordResetModal
        isOpen={showPasswordChange}
        onClose={() => setShowPasswordChange(false)}
        onSuccess={handlePasswordChangeSuccess}
      />
    </div>
  );
}