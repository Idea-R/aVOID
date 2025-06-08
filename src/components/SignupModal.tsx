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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: playerName || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);

  const { signUp, signIn } = useAuthStore();

  // Cooldown timer for password reset
  React.useEffect(() => {
    if (resetCooldown > 0) {
      const timer = setTimeout(() => setResetCooldown(resetCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resetCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Client-side validation
    if (!formData.email.trim()) {
      setError('Email is required');
      setLoading(false);
      return;
    }

    if (!formData.password.trim()) {
      setError('Password is required');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    if (!isLogin && !formData.displayName.trim()) {
      setError('Display name is required');
      setLoading(false);
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

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
        // Handle specific error types for better UX
        let errorMessage = result.error || 'An error occurred';
        
        if (errorMessage.includes('User already registered')) {
          errorMessage = 'An account with this email already exists. Switching to sign in...';
          setError(errorMessage);
          // Auto-switch to login mode after showing the message
          setTimeout(() => {
            setIsLogin(true);
            setError('');
            setFormData(prev => ({ ...prev, password: '' })); // Clear password for security
          }, 2000);
          return;
        } else if (errorMessage.includes('Invalid email')) {
          errorMessage = 'Please enter a valid email address.';
        } else if (errorMessage.includes('Password should be at least')) {
          errorMessage = 'Password must be at least 6 characters long.';
        } else if (errorMessage.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check and try again.';
        }
        
        setError(errorMessage);
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

  const handleForgotPassword = async () => {
    if (!formData.email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (resetCooldown > 0) {
      setError(`Please wait ${resetCooldown} seconds before requesting another reset email`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { resetPassword } = useAuthStore.getState();
      const result = await resetPassword(formData.email);
      
      if (result.success) {
        setResetEmailSent(true);
        setShowForgotPassword(false);
        setResetCooldown(60); // 60 second cooldown
      } else {
        setError(result.error || 'Failed to send reset email');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
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

  // Forgot Password Modal
  if (showForgotPassword) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-lg shadow-2xl border border-cyan-500 max-w-md w-full">
          <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-6 relative">
            <button
              onClick={() => setShowForgotPassword(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <h2 className="text-2xl font-bold text-white mb-2">Reset Password</h2>
            <p className="text-cyan-100">Enter your email to receive a password reset link</p>
          </div>

          <div className="p-6">
            {error && (
              <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
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

              <button
                onClick={handleForgotPassword}
                disabled={loading || !formData.email.trim() || resetCooldown > 0}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-3 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? 'Sending...' : resetCooldown > 0 ? `Wait ${resetCooldown}s` : 'Send Reset Link'}
              </button>

              <button
                onClick={() => setShowForgotPassword(false)}
                className="w-full text-gray-400 hover:text-gray-300 py-2 transition-colors duration-200"
              >
                Back to Sign In
              </button>
            </div>
          </div>
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
              {isLogin && (
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors duration-200"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

            {resetEmailSent && (
              <div className="bg-green-900/50 border border-green-500 text-green-300 px-4 py-3 rounded">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">✉️</span>
                  <div>
                    <div className="font-semibold">Reset Email Sent!</div>
                    <div className="text-sm">Check your inbox and click the link to reset your password. The link expires in 24 hours.</div>
                  </div>
                </div>
              </div>
            )}

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