import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  textSize?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = "h-8", 
  showText = true,
  textSize = ""
}) => {
  // Determine text size based on container height if not provided
  const inferredTextSize = textSize || (
    className.includes('h-24') || className.includes('h-32') 
      ? 'text-4xl md:text-5xl' 
      : className.includes('h-16')
        ? 'text-3xl'
        : 'text-xl'
  );

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Icon Part */}
      <svg
        viewBox="0 0 95 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto aspect-square"
      >
        {/* Cloud Body */}
        <path
          d="M25 70C16.7157 70 10 63.2843 10 55C10 47.4566 15.5866 41.2173 22.8465 40.1381C25.4691 28.675 35.733 20 48 20C58.8256 20 68.1065 26.7909 71.7454 36.436C74.3312 35.5034 77.1049 35 80 35C88.2843 35 95 41.7157 95 50C95 58.2843 88.2843 65 80 65H25V70Z"
          fill="#3B82F6"
        />
        
        {/* Flask Shape (Negative Space) */}
        <path
          d="M55 45H41L45 55L35 75H61L51 55L55 45Z"
          fill="white"
        />
        
        {/* Stopper/Liquid Top */}
        <path
          d="M55 45H41V48H55V45Z"
          fill="#60A5FA"
        />

        {/* Bubbles */}
        <circle cx="45" cy="65" r="2.5" fill="#3B82F6" />
        <circle cx="51" cy="68" r="2" fill="#3B82F6" />
        <circle cx="48" cy="60" r="1.5" fill="#3B82F6" />
      </svg>

      {/* Text Part */}
      {showText && (
        <span className={`font-bold tracking-tight text-white whitespace-nowrap ${inferredTextSize}`}>
          Cloud<span className="text-blue-500">Lab</span>
        </span>
      )}
    </div>
  );
};
