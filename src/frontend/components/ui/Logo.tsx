import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  layout?: 'horizontal' | 'vertical';
  className?: string;
  iconOnly?: boolean;
}

/**
 * Custom HireOracle Logo Icon
 */
export function HireOracleSearchCartoonIcon({ 
  size = 48, 
  className = '' 
}: { 
  size?: number; 
  className?: string;
}) {
  return (
    <div 
      style={{ width: size, height: size }}
      className={`relative shrink-0 flex items-center justify-center select-none transition-transform hover:scale-105 duration-200 ${className}`}
    >
      <img
        src="/logo-icon.png"
        alt="HireOracle Icon"
        width={size}
        height={size}
        className="w-full h-full object-contain"
        loading="eager"
      />
    </div>
  );
}

/**
 * Custom HireOracle Brand Logo:
 * - Search icon is the logo mark
 * - "Hireoracle" is the wordmark
 */
export function Logo({
  size = 'md',
  layout = 'horizontal',
  className = '',
  iconOnly = false,
}: LogoProps) {
  const dimensions = {
    sm: {
      iconSize: 26,
      textSize: 'text-xl',
      gap: 'gap-2',
    },
    md: {
      iconSize: 34,
      textSize: 'text-2xl',
      gap: 'gap-2.5',
    },
    lg: {
      iconSize: 44,
      textSize: 'text-3xl',
      gap: 'gap-3',
    },
    xl: {
      iconSize: 56,
      textSize: 'text-4xl',
      gap: 'gap-3.5',
    },
  }[size];

  if (iconOnly) {
    return <HireOracleSearchCartoonIcon size={dimensions.iconSize} className={className} />;
  }

  return (
    <div
      className={`inline-flex ${
        layout === 'vertical' ? 'flex-col items-center text-center' : 'items-center'
      } ${dimensions.gap} transition-transform hover:opacity-95 duration-200 ${className}`}
    >
      {/* 1. Search Icon Logo */}
      <img
        src="/logo-icon.png"
        alt="HireOracle Logo Icon"
        style={{ width: dimensions.iconSize, height: 'auto' }}
        className="shrink-0 object-contain transition-transform hover:scale-105 duration-200 select-none pointer-events-none"
        loading="eager"
      />

      {/* 2. Hireoracle Word in Real Font (Clickable, Selectable & Copyable) */}
      <span className={`font-black tracking-[-0.03em] leading-none select-text cursor-text ${dimensions.textSize}`}>
        <span className="text-black dark:text-white">Hire</span>
        <span className="text-[#4b7dd2]">oracle</span>
      </span>
    </div>
  );
}

export default Logo;

