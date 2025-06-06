import React from 'react';

interface StartScreenProps {
  onStart: () => void;
}

export default function StartScreen({ onStart }: StartScreenProps) {
  return (
    <div 
      onClick={onStart}
      className="cursor-pointer group"
    >
      <div className="w-4 h-4 rounded-full bg-cyan-500 animate-pulse group-hover:animate-ping transition-all duration-300 ease-in-out" />
    </div>
  );
}