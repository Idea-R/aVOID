import React, { useState, useEffect } from 'react';
import { X, Mouse, Smartphone, Zap, Target, Trophy, Star } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                            window.innerWidth <= 768;
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl border border-cyan-500 max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              {isMobile ? <Smartphone className="w-6 h-6 text-white" /> : <Mouse className="w-6 h-6 text-white" />}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">How to Play aVOID</h2>
              <p className="text-blue-100">Master the art of survival</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          <div className="space-y-6">
            {/* Basic Controls */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
                {isMobile ? <Smartphone className="w-5 h-5" /> : <Mouse className="w-5 h-5" />}
                Basic Controls
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    1
                  </div>
                  <div>
                    <p className="text-white font-semibold">
                      {isMobile ? 'Touch and Move' : 'Mouse Movement'}
                    </p>
                    <p className="text-gray-300 text-sm">
                      {isMobile 
                        ? 'Tap anywhere on the screen and move your finger to control your position'
                        : 'Move your mouse cursor to control your position on screen'
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    2
                  </div>
                  <div>
                    <p className="text-white font-semibold">Avoid Meteors</p>
                    <p className="text-gray-300 text-sm">
                      Dodge the colorful meteors falling from all directions. Don't let them touch you!
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    3
                  </div>
                  <div>
                    <p className="text-white font-semibold">Survive & Score</p>
                    <p className="text-gray-300 text-sm">
                      Your score increases with survival time. The longer you last, the higher your score!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Power-ups */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Detonator Power-ups
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-yellow-300 font-semibold">Atomic Detonator & Chain Detonation</p>
                    <p className="text-yellow-200 text-sm">Regular power-ups appear every 5-20s. Rare chain detonations spawn 4 purple fragments!</p>
                  </div>
                </div>

                <div className="bg-gray-700 rounded-lg p-3">
                  <p className="text-white font-semibold mb-2">Regular Power-ups:</p>
                  <p className="text-gray-300 text-sm mb-2">
                    • Hold up to 3 detonator charges simultaneously
                  </p>
                  <p className="text-gray-300 text-sm mb-2">
                    • Each use consumes only 1 charge, not all charges
                  </p>
                  <p className="text-gray-300 text-sm mb-2">
                    • Multiple pulsing rings show your current charge count
                  </p>
                  <p className="text-gray-300 text-sm mb-4">
                    • Power-ups are magnetically attracted when you get close
                  </p>
                  
                  <p className="text-white font-semibold mb-2">Regular Detonator Activation:</p>
                  <p className="text-gray-300 text-sm mb-2">
                    {isMobile 
                      ? '• Double-tap anywhere on screen to activate knockback'
                      : '• Double-click anywhere to activate knockback'
                    }
                  </p>
                  <p className="text-gray-300 text-sm mb-2">
                    • Destroys meteors within close range (+50 points each)
                  </p>
                  <p className="text-gray-300 text-sm">
                    • Pushes away meteors in medium range
                  </p>
                  
                  <p className="text-white font-semibold mb-2 mt-4">🔗 Chain Detonation (RARE):</p>
                  <p className="text-purple-300 text-sm mb-2">
                    • 4 purple crystal fragments spawn randomly (15% chance every 2s)
                  </p>
                  <p className="text-purple-300 text-sm mb-2">
                    • Collect ALL 4 fragments within 5 seconds
                  </p>
                  <p className="text-purple-300 text-sm mb-2">
                    • Success = MASSIVE screen-clearing explosion
                  </p>
                  <p className="text-purple-300 text-sm mb-2">
                    • 25 points per meteor destroyed + 100 completion bonus
                  </p>
                  <p className="text-purple-300 text-sm">
                    • High risk, extremely high reward!
                  </p>
                </div>
              </div>
            </div>

            {/* Meteor Types */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Meteor Types
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-blue-900/30 border border-blue-500/50 rounded-lg">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
                  <div>
                    <p className="text-blue-300 font-semibold">Regular Meteors</p>
                    <p className="text-blue-200 text-sm">Standard speed and size - most common type</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
                  <div className="w-8 h-8 bg-gradient-to-r from-red-400 to-orange-400 rounded-full"></div>
                  <div>
                    <p className="text-red-300 font-semibold">Super Meteors</p>
                    <p className="text-red-200 text-sm">Larger, faster, and more dangerous - avoid at all costs!</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips & Strategy */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Pro Tips
              </h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  <span className="text-gray-300">Stay near the center of the screen for maximum escape routes</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  <span className="text-gray-300">Stockpile multiple charges for strategic advantage</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  <span className="text-gray-300">Use magnetic attraction to collect power-ups safely</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  <span className="text-gray-300">Watch for meteor spawn patterns - they target your position</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  <span className="text-gray-300">Game speed increases over time - stay alert!</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  <span className="text-gray-300">Sign up to save your high scores and compete on the leaderboard</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-800 p-4 border-t border-gray-700">
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              Good luck, and may you survive the meteor storm! 🌟
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}