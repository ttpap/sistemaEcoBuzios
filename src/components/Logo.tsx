"use client";

import React from 'react';

const Logo = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg viewBox="0 0 300 220" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
        {/* Bonequinho 1 (Apenas o círculo laranja) */}
        <circle cx="90" cy="85" r="12" fill="#ffa534" />
        
        {/* Bonequinho 2 (i - Círculo laranja e corpo azul) */}
        <circle cx="125" cy="65" r="12" fill="#ffa534" />
        <rect x="120" y="85" width="11" height="38" rx="4" fill="#008ca0" />
        
        {/* Bonequinho 3 (Corpo em X - Braços e pernas abertos) */}
        <circle cx="165" cy="45" r="14" fill="#ffa534" />
        <path 
          d="M145 115 L165 80 L185 115 M148 65 L165 80 L182 65" 
          stroke="#008ca0" 
          strokeWidth="13" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          fill="none" 
        />
        
        {/* Texto ECO (Negrito e Azul) */}
        <text 
          x="35" 
          y="190" 
          fontFamily="sans-serif" 
          fontWeight="900" 
          fontSize="62" 
          fill="#008ca0"
          style={{ letterSpacing: '-2px' }}
        >
          ECO
        </text>
        
        {/* Texto BÚZIOS (Fino e Laranja) */}
        <text 
          x="162" 
          y="190" 
          fontFamily="sans-serif" 
          fontWeight="100" 
          fontSize="62" 
          fill="#ffa534"
          style={{ letterSpacing: '-1px' }}
        >
          BÚZIOS
        </text>
      </svg>
    </div>
  );
};

export default Logo;