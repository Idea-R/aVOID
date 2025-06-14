import React, { useState, useEffect, useRef } from 'react';

interface CyberpunkScoreDisplayProps {
  score: number;
}

export default function CyberpunkScoreDisplay({ score }: CyberpunkScoreDisplayProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const [previousScore, setPreviousScore] = useState(0);
  const [animationClass, setAnimationClass] = useState('');
  const [glitchActive, setGlitchActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Smooth score animation
  useEffect(() => {
    if (score !== displayScore) {
      const difference = score - displayScore;
      // Make animation much more fluid - smaller increments, faster updates
      const increment = Math.max(1, Math.ceil(Math.abs(difference) / 30)); // Reduced from /10 to /30
      const timer = setTimeout(() => {
        if (score > displayScore) {
          setDisplayScore(prev => Math.min(prev + increment, score));
        } else {
          setDisplayScore(prev => Math.max(prev - increment, score));
        }
      }, 8); // Reduced from 16ms to 8ms for smoother animation (~120fps)

      return () => clearTimeout(timer);
    }
  }, [score, displayScore]);

  // Animation effects based on score increase
  useEffect(() => {
    if (score > previousScore) {
      const increase = score - previousScore;
      
      // Determine animation type based on increase
      if (increase >= 50) {
        // Large increase - dramatic effects
        setAnimationClass('cyberpunk-score-large-increase');
        setGlitchActive(true);
        
        // Reset glitch after animation
        setTimeout(() => setGlitchActive(false), 500);
      } else if (increase >= 11) {
        // Medium increase - scale and spark
        setAnimationClass('cyberpunk-score-medium-increase');
      } else {
        // Small increase - gentle pulse
        setAnimationClass('cyberpunk-score-small-increase');
      }

      // Reset animation class
      setTimeout(() => setAnimationClass(''), 600);
    }
    
    setPreviousScore(score);
  }, [score, previousScore]);

  // Format score with leading zeros and commas
  const formatScore = (num: number): string => {
    const formatted = num.toLocaleString();
    // Pad with leading zeros to maintain consistent width
    return formatted.padStart(8, '0');
  };

  // Split formatted score into individual characters for animation
  const scoreChars = formatScore(displayScore).split('');

  return (
    <>
      {/* Cyberpunk Score Display */}
      <div 
        ref={containerRef}
        style={{
          position: 'fixed',
          top: '16px',
          left: '50%',
          transform: `translateX(-50%) ${animationClass.includes('large-increase') ? 'scale(1.1)' : 
                    animationClass.includes('medium-increase') ? 'scale(1.05)' : 
                    animationClass.includes('small-increase') ? 'scale(1.02)' : 'scale(1)'}`,
          zIndex: 1000,
          background: 'linear-gradient(135deg, rgba(0, 20, 40, 0.9), rgba(0, 40, 80, 0.8))',
          border: '2px solid #06b6d4',
          borderRadius: '12px',
          padding: '12px 24px',
          boxShadow: '0 0 20px rgba(6, 182, 212, 0.5), inset 0 0 20px rgba(6, 182, 212, 0.1)',
          fontFamily: '"Orbitron", monospace',
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#ffffff',
          textShadow: '0 0 10px #06b6d4, 0 0 20px #06b6d4, 0 0 30px #06b6d4',
          minWidth: '200px',
          textAlign: 'center' as const,
          overflow: 'hidden' as const,
          userSelect: 'none' as const,
          WebkitUserSelect: 'none' as const,
          MozUserSelect: 'none' as const,
          msUserSelect: 'none' as const,
          transition: 'transform 0.3s ease'
        }}
      >
        {/* Circuit pattern background */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(6, 182, 212, 0.1) 10px, rgba(6, 182, 212, 0.1) 11px)',
            animation: 'circuitFlow 3s linear infinite',
            zIndex: 1
          }}
        />
        
        {/* Scan lines */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6, 182, 212, 0.1) 2px, rgba(6, 182, 212, 0.1) 3px)',
            animation: 'scanLines 2s linear infinite',
            zIndex: 2
          }}
        />
        
        {/* Score digits */}
        <div style={{ position: 'relative', zIndex: 3 }}>
          {scoreChars.map((char, index) => (
            <span 
              key={index} 
              style={{
                opacity: char === '0' && index < scoreChars.length - 3 ? 0.4 : 1,
                transition: 'all 0.3s ease',
                display: 'inline-block'
              }}
            >
              {char}
            </span>
          ))}
        </div>
        
        {/* Holographic shimmer overlay */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
            animation: 'shimmer 3s ease-in-out infinite',
            zIndex: 4
          }}
        />
        
        {/* Glow ring for large increases */}
        {glitchActive && (
          <div 
            style={{
              position: 'absolute',
              top: '-10px',
              left: '-10px',
              right: '-10px',
              bottom: '-10px',
              border: '2px solid #ffd700',
              borderRadius: '16px',
              boxShadow: '0 0 30px #ffd700',
              animation: 'glowRing 0.5s ease-out',
              zIndex: 0
            }}
          />
        )}
      </div>
      
      {/* CSS animations */}
      <style>{`
        @keyframes circuitFlow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes scanLines {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        
        @keyframes shimmer {
          0% { left: -100%; }
          50% { left: 100%; }
          100% { left: 100%; }
        }
        
        @keyframes glowRing {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.2); opacity: 0; }
        }
      `}</style>
    </>
  );
}