import React from 'react';
import { Car, Coins, Play, Settings, Trophy } from 'lucide-react';
import { CarSpec } from '../types/game';
import { PWAInstallButton } from './PWAInstallButton';

interface TitleScreenProps {
  highScore: number;
  coins: number;
  selectedCar: CarSpec;
  onPlay: () => void;
  onOpenGarage: () => void;
  onOpenSettings: () => void;
  onOpenAndroidGuide: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  highScore,
  coins,
  selectedCar,
  onPlay,
  onOpenGarage,
  onOpenSettings,
  onOpenAndroidGuide,
}) => {
  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Bar: Stats + Settings / Install */}
      <div className="flex items-start justify-between gap-3">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-xl bg-slate-900/90 border border-white/15 px-3.5 py-2 shadow-lg">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
              Best
            </span>
            <span className="font-display text-base font-bold text-white tabular-nums">
              {highScore.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-slate-900/90 border border-white/15 px-3.5 py-2 shadow-lg">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="font-display text-base font-bold text-yellow-300 tabular-nums">
              {coins.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <PWAInstallButton onOpenAndroidGuide={onOpenAndroidGuide} />
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Settings"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900/90 border border-white/15 text-white shadow-lg hover:bg-slate-800 active:scale-95 transition"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Upper Sky Title Lockup (keeps center car unobstructed!) */}
      <div className="flex flex-col items-center text-center -mt-4 sm:-mt-8">
        <svg
          viewBox="0 0 540 124"
          className="w-[310px] sm:w-[440px] max-w-[92vw] drop-shadow-[0_6px_18px_rgba(15,23,42,0.55)]"
          aria-label="Street Rush 3D"
        >
          <defs>
            <linearGradient id="rushTitleGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="55%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#bae6fd" />
            </linearGradient>
            <linearGradient id="rushAccentGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ff5500" />
              <stop offset="100%" stopColor="#facc15" />
            </linearGradient>
          </defs>
          {/* Motorsport Speed Bars */}
          <polygon points="48,18 168,18 156,28 36,28" fill="#06b6d4" />
          <polygon points="384,18 504,18 492,28 372,28" fill="url(#rushAccentGrad)" />
          {/* Main Lockup */}
          <text
            x="270"
            y="78"
            textAnchor="middle"
            fill="url(#rushTitleGrad)"
            stroke="#0f172a"
            strokeWidth="7"
            paintOrder="stroke"
            style={{
              fontFamily: "'Chakra Petch', sans-serif",
              fontWeight: 700,
              fontStyle: 'italic',
              fontSize: '58px',
              letterSpacing: '2px',
            }}
          >
            STREET RUSH
          </text>
          {/* 3D Badge */}
          <rect x="220" y="88" width="100" height="28" rx="6" fill="url(#rushAccentGrad)" stroke="#0f172a" strokeWidth="3" />
          <text
            x="270"
            y="108"
            textAnchor="middle"
            fill="#0f172a"
            style={{
              fontFamily: "'Chakra Petch', sans-serif",
              fontWeight: 700,
              fontSize: '18px',
              letterSpacing: '4px',
            }}
          >
            3D
          </text>
        </svg>

        <div className="mt-1 inline-flex items-center gap-2 rounded-lg bg-slate-900/85 border border-white/15 px-3 py-1 text-xs font-semibold text-sky-200">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm border border-white/40"
            style={{ backgroundColor: selectedCar.primaryColor }}
          />
          <span>{selectedCar.name}</span>
          <span className="text-slate-400">·</span>
          <span className="text-amber-300 tabular-nums">{selectedCar.topSpeedKmh} km/h</span>
        </div>
      </div>

      {/* Spacer for unobstructed 3D car showcase */}
      <div className="flex-1" />

      {/* Bottom Action Dock */}
      <div className="flex flex-col items-center gap-3 pb-1">
        <div className="pointer-events-auto flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenGarage}
            className="flex items-center gap-2 rounded-2xl bg-slate-900/92 border border-white/18 px-5 py-3.5 font-display text-base font-bold uppercase tracking-wider text-white shadow-xl hover:bg-slate-800 active:scale-95 transition"
          >
            <Car className="w-5 h-5 text-sky-400" />
            Garage
          </button>

          <button
            type="button"
            onClick={onPlay}
            className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 border border-amber-300/40 px-9 py-3.5 font-display text-xl font-bold uppercase tracking-wider text-white shadow-[0_8px_24px_rgba(234,88,12,0.45)] hover:brightness-110 active:scale-95 transition"
          >
            <Play className="w-6 h-6 fill-current" />
            Play
          </button>
        </div>

        <p className="rounded-lg bg-slate-950/75 px-3 py-1 text-[11px] sm:text-xs font-medium tracking-wide text-slate-200">
          Swipe / WASD Steer · Up Boost · Down Brake · Esc Pause
        </p>
      </div>
    </div>
  );
};
