import React from 'react';

interface BoltBadgeProps {
  onMeteorDefense?: (meteorId: string, x: number, y: number) => void;
}

export default function BoltBadge({ onMeteorDefense }: BoltBadgeProps) {
  return (
    <>
      {/* Custom Bolt.new Badge Configuration */}
      <style>{`
        .bolt-badge {
          transition: all 0.3s ease;
        }
        @keyframes badgeIntro {
          0% { transform: translateX(100px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        .bolt-badge-intro {
          animation: badgeIntro 0.6s ease-out 1s both;
        }
        .bolt-badge-intro.animated {
          animation: none;
        }
        @keyframes badgeHover {
          0% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.1) rotate(22deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        .bolt-badge:hover {
          animation: badgeHover 0.6s ease-in-out;
        }
        @keyframes defenseField {
          0% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 0.6; transform: scale(1.2); }
          100% { opacity: 0.3; transform: scale(1); }
        }
        .defense-field {
          animation: defenseField 2s ease-in-out infinite;
        }
      `}</style>

      {/* Badge Container with Defense Field */}
      <div className="fixed bottom-4 right-4 z-50" id="bolt-badge-container">
        {/* Invisible Defense Area */}
        <div 
          className="absolute inset-0 w-40 h-40 -translate-x-16 -translate-y-16 pointer-events-none"
          id="bolt-defense-zone"
        >
          {/* Visual Defense Field (optional, can be hidden) */}
          <div className="absolute inset-0 rounded-full border-2 border-yellow-400/40 defense-field opacity-0 hover:opacity-100 transition-opacity duration-300" />
        </div>

        {/* Bolt Badge */}
        <a 
          href="https://bolt.new/" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="block transition-all duration-300 hover:shadow-2xl"
        >
          <img 
            src="https://storage.bolt.army/logotext_poweredby_360w.png" 
            alt="Powered by Bolt.new badge" 
            className="h-8 md:h-10 w-auto shadow-lg opacity-90 hover:opacity-100 bolt-badge bolt-badge-intro"
            onAnimationEnd={(e) => e.currentTarget.classList.add('animated')}
          />
        </a>
      </div>
    </>
  );
}