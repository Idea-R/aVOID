import React, { useState } from 'react';
import { X, Mail, Lock, User, Heart, Github, Twitter, ExternalLink, Twitch } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { LeaderboardAPI } from '../api/leaderboard';

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerScore: number;
  playerName: string;
}

export default function SignupModal({ isOpen, onClose, playerScore, playerName }: SignupModalProps) {
  const [isLogin, setIsLogin] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: playerName || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { signUp, signIn } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let result;
      if (isLogin) {
        result = await signIn(formData.email, formData.password);
        
        // If login successful and we have a score to save
        if (result.success && result.user && playerScore > 0) {
          const displayName = result.user.user_metadata?.display_name || formData.email.split('@')[0];
          await LeaderboardAPI.submitVerifiedScore(displayName, playerScore, result.user.id);
        }
      } else {
        result = await signUp(formData.email, formData.password, formData.displayName);
        
        // If signup successful and we have a score to save
        if (result.success && result.user && playerScore > 0) {
          const displayName = formData.displayName || formData.email.split('@')[0];
          await LeaderboardAPI.submitVerifiedScore(displayName, playerScore, result.user.id);
        }
      }

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 2000);
      } else {
        setError(result.error || 'An error occurred');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePayPalTip = () => {
    window.open('https://paypal.me/Xentrilo', '_blank');
  };

  if (!isOpen) return null;

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-lg shadow-2xl border border-green-500 max-w-md w-full p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-green-400 mb-4">Welcome to aVOID!</h2>
          <p className="text-green-300 mb-4">
            Your account has been created{playerScore > 0 ? ' and your score has been saved!' : '!'}
          </p>
          {playerScore > 0 && (
            <p className="text-green-200 text-sm mb-4">
              Score: {playerScore.toLocaleString()} points saved as verified!
            </p>
          )}
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl border border-cyan-500 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <h2 className="text-2xl font-bold text-white mb-2">
            {isLogin ? 'Welcome Back!' : 'Join aVOID Community'}
          </h2>
          <p className="text-cyan-100">
            {isLogin ? 'Sign in to save your scores' : 'Create an account to track your progress'}
          </p>
          
          {/* Score preservation notice */}
          {playerScore > 0 && (
            <div className="mt-4 bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-3">
              <p className="text-yellow-200 text-sm">
                🎯 Your current score of <span className="font-bold">{playerScore.toLocaleString()}</span> will be saved as verified when you {isLogin ? 'sign in' : 'create your account'}!
              </p>
            </div>
          )}
        </div>

        <div className="p-6">
          {/* Developer Message */}
          <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-500/50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-5 h-5 text-pink-400" />
              <span className="font-semibold text-purple-300">From the Developer</span>
            </div>
            <p className="text-purple-200 text-sm mb-3">
              This is a free game made with passion by <span className="font-semibold text-purple-100">MadXent</span>! If you enjoy playing aVOID, consider supporting development.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={handlePayPalTip}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <Heart className="w-4 h-4" />
                Tip via PayPal
              </button>

              <div className="flex gap-2">
                <a
                  href="https://twitter.com/Xentrilo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 px-3 rounded transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
                >
                  <Twitter className="w-4 h-4" />
                  Twitter
                </a>
                <a
                  href="https://twitch.tv/MadXent"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 px-3 rounded transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
                >
                  <Twitch className="w-4 h-4" />
                  Twitch
                </a>
                <a
                  href="https://github.com/Idea-R"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 px-3 rounded transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
                >
                  <Github className="w-4 h-4" />
                  GitHub
                </a>
              </div>
            </div>
          </div>

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Display Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="Your display name"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-3 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? 'Processing...' : (
                isLogin 
                  ? (playerScore > 0 ? 'Sign In & Save Score' : 'Sign In')
                  : (playerScore > 0 ? 'Create Account & Save Score' : 'Create Account')
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-cyan-400 hover:text-cyan-300 transition-colors duration-200"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}