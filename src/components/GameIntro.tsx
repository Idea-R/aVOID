import React, { useState, useEffect } from 'react';

interface GameIntroProps {
  onComplete: () => void;
}

export default function GameIntro({ onComplete }: GameIntroProps) {
  const [phase, setPhase] = useState<'countdown' | 'warning' | 'instructions' | 'complete'>('countdown');
  const [countdown, setCountdown] = useState(3);
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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (phase === 'countdown') {
        if (countdown > 1) {
          setCountdown(countdown - 1);
        } else {
          setPhase('warning');
        }
      } else if (phase === 'warning') {
        setPhase('instructions');
      } else if (phase === 'instructions') {
        setPhase('complete');
        onComplete();
      }
    }, phase === 'countdown' ? 1000 : phase === 'warning' ? 1000 : 2000);

    return () => clearTimeout(timer);
  }, [phase, countdown, onComplete]);

  // Track user engagement
  useEffect(() => {
    const handleMouseMove = () => {
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'user_engaged_during_intro', {
          event_category: 'engagement',
          event_label: 'mouse_movement_detected'
        });
      }
    };

    const handleTouchStart = () => {
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'user_engaged_during_intro', {
          event_category: 'engagement',
          event_label: 'touch_detected'
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { once: true });
    window.addEventListener('touchstart', handleTouchStart, { once: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);

  if (phase === 'complete') return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm" />
      
      {/* Content */}
      <div className="relative text-center space-y-8">
        {phase === 'countdown' && (
          <div className="animate-pulse">
            <div className="text-8xl md:text-9xl font-bold text-cyan-400 mb-4 animate-bounce">
              {countdown}
            </div>
            <div className="text-xl md:text-2xl text-cyan-300 font-semibold">
              Get Ready...
            </div>
          </div>
        )}

        {phase === 'warning' && (
          <div className="animate-pulse">
            <div className="text-6xl md:text-8xl font-bold text-red-400 mb-4 animate-ping">
              LOOK OUT!
            </div>
            <div className="text-lg md:text-xl text-red-300 font-semibold animate-bounce">
              Meteors incoming!
            </div>
          </div>
        )}

        {phase === 'instructions' && (
          <div className="animate-fade-in">
            <div className="text-2xl md:text-3xl font-bold text-yellow-400 mb-4">
              {isMobile ? '📱 Tap and move finger to survive' : '🖱️ Move your cursor to survive'}
            </div>
            <div className="text-lg md:text-xl text-yellow-300 font-semibold">
              {isMobile ? 'Double-tap for knockback power!' : 'Double-click for knockback power!'}
            </div>
            <div className="mt-6 text-sm md:text-base text-cyan-300 opacity-80">
              Avoid the meteors • Survive as long as possible • Beat your high score
            </div>
          </div>
        )}
      </div>

      {/* Animated border effect */}
      <div className="absolute inset-4 border-2 border-cyan-500 rounded-lg opacity-30 animate-pulse" />
      
      {/* Corner decorations */}
      <div className="absolute top-8 left-8 w-8 h-8 border-l-2 border-t-2 border-cyan-400 animate-pulse" />
      <div className="absolute top-8 right-8 w-8 h-8 border-r-2 border-t-2 border-cyan-400 animate-pulse" />
      <div className="absolute bottom-8 left-8 w-8 h-8 border-l-2 border-b-2 border-cyan-400 animate-pulse" />
      <div className="absolute bottom-8 right-8 w-8 h-8 border-r-2 border-b-2 border-cyan-400 animate-pulse" />
    </div>
  );
}