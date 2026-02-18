"use client";

import React from 'react';

const Logo = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg viewBox="0 0 200 100" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
        {/* Bonequinho 1 (Ponto) */}
        <circle cx="40" cy="45" r="6" fill="#ffa534" />
        
        {/* Bonequinho 2 (Médio) */}
        <circle cx="75" cy="35" r="6" fill="#ffa534" />
        <rect x="71" cy="45" width="8" height="20" rx="4" fill="#008ca0" />
        
        {/* Bonequinho 3 (Grande - Braços abertos) */}
        <circle cx="115" cy="25" r="8" fill="#ffa534" />
        <path 
          d="M95 55 C105 40 125 40 135 55 M115 40 L115 70 M100 85 L115 70 L130 85" 
          stroke="#008ca0" 
          strokeWidth="8" 
          strokeLinecap="round" 
          fill="none" 
        />
        
        {/* Texto ECO */}
        <text 
          x="10" 
          y="95" 
          fontFamily="sans-serif" 
          fontWeight="900" 
          fontSize="32" 
          fill="#008ca0"
          style={{ letterSpacing: '-1px' }}
        >
          ECO
        </text>
        
        {/* Texto BÚZIOS */}
        <text 
          x="82" 
          y="95" 
          fontFamily="sans-serif" 
          fontWeight="300" 
          fontSize="32" 
          fill="#ffa534"
        >
          BÚZIOS
        </text>
      </svg>
    </div>
  );
};

export default Logo;