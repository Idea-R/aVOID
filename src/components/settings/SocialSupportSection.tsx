import React, { useState } from 'react';
import { Heart, Github, Twitter, ExternalLink, Twitch, MessageCircle } from 'lucide-react';
import SupportModal from '../SupportModal';

export default function SocialSupportSection() {
  const [showSupportModal, setShowSupportModal] = useState(false);

  const handlePayPalTip = () => {
    window.open('https://paypal.me/Xentrilo', '_blank');
  };

  return (
    <>
      <div className="space-y-6">
        {/* Contact Support Button */}
        <div className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 border border-cyan-500/50 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <MessageCircle className="w-6 h-6 text-cyan-400" />
            <div>
              <h3 className="text-xl font-semibold text-cyan-300">Need Help?</h3>
              <p className="text-cyan-200 text-sm">Get support directly from the aVOID team</p>
            </div>
          </div>
          
          <p className="text-cyan-200 text-sm mb-4">
            Found a bug? Have feedback? Need help? Our support team is here to assist you with any 
            issues or questions about aVOID.
          </p>
          
          <button
            onClick={() => setShowSupportModal(true)}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 mb-4"
          >
            <MessageCircle className="w-5 h-5" />
            Contact Support
          </button>

          <div className="text-center text-cyan-300 text-sm">
            We typically respond within 24 hours! 🚀
          </div>
        </div>

        {/* Developer Support */}
        <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-500/50 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Heart className="w-6 h-6 text-pink-400" />
            <div>
              <h3 className="text-xl font-semibold text-purple-300">Support MadXent</h3>
              <p className="text-purple-200 text-sm">Creator of aVOID</p>
            </div>
          </div>
          
          <p className="text-purple-200 text-sm mb-4">
            aVOID is a free, open-source game made with passion! If you enjoy playing, 
            consider supporting the developer to help create more amazing games.
          </p>
          
          <button
            onClick={handlePayPalTip}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 mb-4"
          >
            <Heart className="w-5 h-5" />
            Tip via PayPal
          </button>

          <div className="text-center text-purple-300 text-sm">
            Every contribution helps keep the game free for everyone! 💜
          </div>
        </div>

        {/* Social Links */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Connect with MadXent
          </h3>
          
          <div className="space-y-3">
            <a
              href="https://twitter.com/Xentrilo"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-3"
            >
              <Twitter className="w-5 h-5" />
              Follow on Twitter
              <ExternalLink className="w-4 h-4" />
            </a>

            <a
              href="https://twitch.tv/MadXent"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-3"
            >
              <Twitch className="w-5 h-5" />
              Watch on Twitch
              <ExternalLink className="w-4 h-4" />
            </a>

            <a
              href="https://github.com/Idea-R"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-3"
            >
              <Github className="w-5 h-5" />
              View on GitHub
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Game Info */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-cyan-300 mb-4">About aVOID</h3>
          <div className="space-y-2 text-sm text-gray-300">
            <p><strong>Version:</strong> 1.0.0</p>
            <p><strong>Built with:</strong> React, TypeScript, Canvas API</p>
            <p><strong>Database:</strong> Supabase</p>
            <p><strong>License:</strong> Open Source</p>
            <p><strong>Performance:</strong> Adaptive quality scaling</p>
          </div>
          
          <div className="mt-4 p-3 bg-cyan-900/30 border border-cyan-500/50 rounded-lg">
            <p className="text-cyan-200 text-sm">
              🎮 <strong>How to play:</strong> Move your mouse to avoid meteors. 
              Double-click to use knockback power when available. Survive as long as possible!
            </p>
            <p className="text-cyan-200 text-sm mt-2">
              ⚡ <strong>Customization:</strong> Visit your Profile to customize cursor color and add social links!
            </p>
          </div>
        </div>
      </div>

      {/* Support Modal */}
      <SupportModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
        gameStats={undefined} // Could be passed in if available
        playerName={undefined} // Could be passed from user context
        playerEmail={undefined} // Could be passed from user context
      />
    </>
  );
}