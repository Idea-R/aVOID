import React, { useState } from 'react';
import { X, MessageCircle, Bug, Lightbulb, Heart, Send, CheckCircle } from 'lucide-react';
import { emailService, type ContactSupportData } from '../utils/emailService';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameStats?: {
    score: number;
    survivalTime: number;
    meteorsDestroyed: number;
    distanceTraveled: number;
  };
  playerName?: string;
  playerEmail?: string;
}

type SupportType = 'support' | 'bug' | 'feedback' | 'feature';

export default function SupportModal({ 
  isOpen, 
  onClose, 
  gameStats,
  playerName: initialPlayerName,
  playerEmail: initialPlayerEmail 
}: SupportModalProps) {
  const [formData, setFormData] = useState({
    playerName: initialPlayerName || '',
    email: initialPlayerEmail || '',
    subject: '',
    message: '',
    type: 'support' as SupportType,
    includeGameStats: true
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
    ticketId?: string;
  }>({ type: null, message: '' });

  const supportTypes = [
    { value: 'support', label: 'General Support', icon: MessageCircle, color: 'text-blue-500' },
    { value: 'bug', label: 'Bug Report', icon: Bug, color: 'text-red-500' },
    { value: 'feedback', label: 'Feedback', icon: Heart, color: 'text-pink-500' },
    { value: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'text-yellow-500' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });

    try {
      const supportData: ContactSupportData = {
        playerName: formData.playerName || undefined,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        type: formData.type,
        gameStats: formData.includeGameStats ? gameStats : undefined
      };

      const response = await emailService.sendSupportTicket(supportData);

      if (response.success) {
        setSubmitStatus({
          type: 'success',
          message: response.message,
          ticketId: response.ticketId
        });
        
        // Reset form
        setFormData({
          playerName: initialPlayerName || '',
          email: initialPlayerEmail || '',
          subject: '',
          message: '',
          type: 'support',
          includeGameStats: true
        });
        
        // Auto-close after 3 seconds
        setTimeout(() => {
          onClose();
          setSubmitStatus({ type: null, message: '' });
        }, 3000);
        
      } else {
        setSubmitStatus({
          type: 'error',
          message: response.message || 'Failed to send support ticket'
        });
      }
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormData = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  // Success state
  if (submitStatus.type === 'success') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-lg shadow-2xl border border-green-500 max-w-md w-full">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-center rounded-t-lg">
            <CheckCircle className="w-16 h-16 text-white mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white">Support Ticket Sent!</h2>
            {submitStatus.ticketId && (
              <p className="text-green-100 mt-2">Ticket ID: {submitStatus.ticketId}</p>
            )}
          </div>
          
          <div className="p-6 text-center">
            <p className="text-gray-300 mb-4">{submitStatus.message}</p>
            <p className="text-gray-400 text-sm">
              You'll receive a confirmation email shortly. We typically respond within 24 hours.
            </p>
            <div className="mt-6">
              <button
                onClick={onClose}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            <MessageCircle className="w-8 h-8 text-white" />
            <div>
              <h2 className="text-2xl font-bold text-white">Contact Support</h2>
              <p className="text-cyan-100">We're here to help with any issues or feedback</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 max-h-96 overflow-y-auto">
          {/* Support Type Selection */}
          <div className="mb-6">
            <label className="block text-gray-300 text-sm font-bold mb-3">
              What can we help you with?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {supportTypes.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateFormData('type', value)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    formData.type === value
                      ? 'border-cyan-500 bg-cyan-900/30'
                      : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
                  <span className="text-gray-300 text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Player Name */}
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2">
              Player Name (Optional)
            </label>
            <input
              type="text"
              value={formData.playerName}
              onChange={(e) => updateFormData('playerName', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:border-cyan-500 text-white"
              placeholder="How should we address you?"
            />
          </div>

          {/* Email */}
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => updateFormData('email', e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:border-cyan-500 text-white"
              placeholder="your@email.com"
            />
          </div>

          {/* Subject */}
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2">
              Subject *
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => updateFormData('subject', e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:border-cyan-500 text-white"
              placeholder="Brief description of your issue or feedback"
            />
          </div>

          {/* Message */}
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2">
              Message *
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => updateFormData('message', e.target.value)}
              required
              rows={4}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:border-cyan-500 text-white resize-none"
              placeholder="Please provide details about your issue, feedback, or request..."
            />
          </div>

          {/* Include Game Stats */}
          {gameStats && (
            <div className="mb-6">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.includeGameStats}
                  onChange={(e) => updateFormData('includeGameStats', e.target.checked)}
                  className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                />
                <span className="text-gray-300 text-sm">
                  Include my current game statistics (helpful for bug reports)
                </span>
              </label>
              
              {formData.includeGameStats && (
                <div className="mt-3 p-3 bg-gray-800 rounded-lg border border-gray-600">
                  <p className="text-gray-400 text-xs mb-2">Game stats that will be included:</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-gray-300">Score: <span className="text-cyan-400">{gameStats.score.toLocaleString()}</span></span>
                    <span className="text-gray-300">Time: <span className="text-cyan-400">{gameStats.survivalTime.toFixed(1)}s</span></span>
                    <span className="text-gray-300">Meteors: <span className="text-cyan-400">{gameStats.meteorsDestroyed}</span></span>
                    <span className="text-gray-300">Distance: <span className="text-cyan-400">{gameStats.distanceTraveled.toFixed(0)}px</span></span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {submitStatus.type === 'error' && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded-lg">
              <p className="text-red-300 text-sm">{submitStatus.message}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Message
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 