import Image from 'next/image';
import React from 'react';

interface LogoProps {
  variant?: 'full' | 'compact' | 'light' | 'white';
  className?: string;
  height?: number;
  priority?: boolean;
}

export function Logo({ variant = 'full', className = '', height = 52, priority = false }: LogoProps) {
  const isDarkSurface = variant === 'light' || variant === 'white';
  const logoHeight = variant === 'compact' ? Math.min(height, 40) : height;
  const logoWidth = Math.round(logoHeight * 2.75);

  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden bg-transparent ${className}`}
      style={{ width: logoWidth, height: logoHeight }}
    >
      <Image
        src="/Logo.png"
        alt="Veli Sigorta"
        fill
        sizes={`${logoWidth}px`}
        className={`select-none object-cover object-[50%_51%] ${
          isDarkSurface
            ? 'drop-shadow-[0_5px_9px_rgba(0,0,0,0.38)]'
            : 'drop-shadow-[0_4px_8px_rgba(0,51,102,0.18)]'
        }`}
        quality={90}
        priority={priority}
        draggable={false}
      />
    </span>
  );
}
