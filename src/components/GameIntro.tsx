import React, { useState, useEffect } from 'react';

interface GameIntroProps {
  onComplete: () => void;
}

export default function GameIntro({ onComplete }: GameIntroProps) {
  const [phase, setPhase] = useState<'countdown' | 'warning' | 'complete'>('countdown');
  const [countdown, setCountdown] = useState(3);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile device for faster timing
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
    // Mobile gets faster timing: 400ms vs 600ms
    const countdownDuration = isMobile ? 400 : 600;
    const warningDuration = 400; // Always 400ms for "LOOK OUT!"
    
    const timer = setTimeout(() => {
      if (phase === 'countdown') {
        if (countdown > 1) {
          setCountdown(countdown - 1);
          
          // Start game engine initialization when countdown hits "2"
          if (countdown === 2) {
            console.log('🚀 Starting game engine initialization during countdown');
            // Dispatch event to start engine initialization
            window.dispatchEvent(new CustomEvent('startEngineInit'));
          }
        } else {
          // Move to warning phase
          setPhase('warning');
        }
      } else if (phase === 'warning') {
        // Complete immediately after warning
        setPhase('complete');
        onComplete();
      }
    }, phase === 'countdown' ? countdownDuration : warningDuration);

    return () => clearTimeout(timer);
  }, [phase, countdown, isMobile, onComplete]);

  if (phase === 'complete') return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
      {/* Minimal background overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50" />
      
      {/* Content */}
      <div className="relative text-center">
        {phase === 'countdown' && (
          <div className="animate-pulse">
            <div className="text-6xl md:text-8xl font-bold text-cyan-400 transition-opacity duration-200">
              {countdown}
            </div>
          </div>
        )}

        {phase === 'warning' && (
          <div className="animate-pulse">
            <div className="text-4xl md:text-6xl font-bold text-red-400 transition-opacity duration-200">
              LOOK OUT!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}