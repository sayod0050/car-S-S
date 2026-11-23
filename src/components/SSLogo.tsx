import React from 'react';

interface SSLogoProps {
  compact?: boolean;
}

export const SSLogo: React.FC<SSLogoProps> = ({ compact = false }) => {
  return (
    <div className="flex flex-col items-center text-center">
      <svg
        viewBox="0 0 420 118"
        className={
          compact
            ? 'w-[220px] sm:w-[270px] max-w-[82vw] drop-shadow-[0_0_20px_rgba(6,182,212,0.55)]'
            : 'w-[290px] sm:w-[370px] max-w-[90vw] drop-shadow-[0_0_28px_rgba(6,182,212,0.65)]'
        }
        aria-label="S&S Racing"
      >
        <defs>
          <linearGradient id="ssCyanGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#67e8f9" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="ssOrangeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ff5500" />
            <stop offset="100%" stopColor="#facc15" />
          </linearGradient>
        </defs>

        {/* Speed Wing Bars */}
        <polygon points="24,22 126,22 114,31 12,31" fill="#06b6d4" />
        <polygon points="294,22 408,22 396,31 282,31" fill="url(#ssOrangeGrad)" />

        {/* Glowing S&S Monogram */}
        <text
          x="210"
          y="74"
          textAnchor="middle"
          fill="url(#ssCyanGrad)"
          stroke="#0f172a"
          strokeWidth="8"
          paintOrder="stroke"
          style={{
            fontFamily: "'Chakra Petch', sans-serif",
            fontWeight: 700,
            fontStyle: 'italic',
            fontSize: '70px',
            letterSpacing: '4px',
          }}
        >
          S&amp;S
        </text>

        {/* RACING Pill Tag */}
        <rect
          x="120"
          y="83"
          width="180"
          height="28"
          rx="6"
          fill="url(#ssOrangeGrad)"
          stroke="#0f172a"
          strokeWidth="3"
        />
        <text
          x="210"
          y="103"
          textAnchor="middle"
          fill="#0f172a"
          style={{
            fontFamily: "'Chakra Petch', sans-serif",
            fontWeight: 700,
            fontSize: '18px',
            letterSpacing: '6px',
          }}
        >
          RACING
        </text>
      </svg>

      <div className="mt-1.5 flex flex-col items-center">
        <span className="font-display text-[11px] sm:text-xs font-bold uppercase tracking-[0.22em] text-cyan-300 drop-shadow-[0_1px_6px_rgba(6,182,212,0.75)]">
          CREATED BY SAYOD AND SUBHON
        </span>
        <span className="text-[10px] font-extrabold uppercase tracking-[0.32em] text-amber-300/95 mt-0.5">
          S&amp;S STUDIOS
        </span>
      </div>
    </div>
  );
};
