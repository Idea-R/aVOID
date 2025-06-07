import React, { useState, useEffect, useRef } from 'react';

interface CyberpunkScoreDisplayProps {
  score: number;
}

export default function CyberpunkScoreDisplay({ score }: CyberpunkScoreDisplayProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const [previousScore, setPreviousScore] = useState(0);
  const [animationClass, setAnimationClass] = useState('');
  const [glitchActive, setGlitchActive] = useState(false);
  const [milestoneEffect, setMilestoneEffect] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Smooth score animation
  useEffect(() => {
    if (score !== displayScore) {
      const difference = score - displayScore;
      const increment = Math.ceil(Math.abs(difference) / 10);
      const timer = setTimeout(() => {
        if (score > displayScore) {
          setDisplayScore(prev => Math.min(prev + increment, score));
        } else {
          setDisplayScore(prev => Math.max(prev - increment, score));
        }
      }, 16); // ~60fps

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

      // Check for milestones
      const milestones = [100, 500, 1000, 2500, 5000, 10000];
      if (milestones.some(milestone => previousScore < milestone && score >= milestone)) {
        setMilestoneEffect(true);
        setTimeout(() => setMilestoneEffect(false), 2000);
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
    <div 
      ref={containerRef}
      className={`cyberpunk-score-container ${animationClass} ${glitchActive ? 'glitch-active' : ''} ${milestoneEffect ? 'milestone-active' : ''}`}
    >
      {/* Hexagonal tech border */}
      <div className="cyberpunk-score-border">
        <div className="cyberpunk-score-content">
          {/* Circuit pattern background */}
          <div className="cyberpunk-circuit-pattern"></div>
          
          {/* Scan lines */}
          <div className="cyberpunk-scan-lines"></div>
          
          {/* Score digits */}
          <div className="cyberpunk-score-digits">
            {scoreChars.map((char, index) => (
              <span 
                key={index} 
                className={`cyberpunk-digit ${char === '0' && index < scoreChars.length - 3 ? 'leading-zero' : ''}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {char}
              </span>
            ))}
          </div>
          
          {/* Holographic shimmer overlay */}
          <div className="cyberpunk-shimmer"></div>
          
          {/* Glow ring for large increases */}
          <div className="cyberpunk-glow-ring"></div>
        </div>
      </div>
      
      {/* Milestone celebration effect */}
      {milestoneEffect && (
        <div className="cyberpunk-milestone-effect">
          <div className="milestone-text">MILESTONE ACHIEVED!</div>
          <div className="milestone-sparks">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="milestone-spark" style={{ '--spark-delay': `${i * 100}ms` } as React.CSSProperties}></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}