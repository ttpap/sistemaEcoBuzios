"use client";

import React from 'react';

const Logo = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img 
        src="https://files.dyad.sh/pasted-image-2026-02-18T17-34-12-789Z.png" 
        alt="EcoBúzios Logo" 
        className="max-w-full h-auto object-contain"
      />
    </div>
  );
};

export default Logo;