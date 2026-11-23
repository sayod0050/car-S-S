import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Coins,
  Flame,
  OctagonAlert,
  Pause,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { RunTelemetry } from '../types/game';

interface GameHUDProps {
  telemetry: RunTelemetry;
  highScore: number;
  totalBankCoins: number;
  soundEnabled: boolean;
  showTapControls: boolean;
  onPause: () => void;
  onToggleSound: () => void;
  onSteerLeft: () => void;
  onSteerRight: () => void;
  onBoostStart: () => void;
  onBoostEnd: () => void;
  onBrakeStart: () => void;
  onBrakeEnd: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  telemetry,
  highScore,
  totalBankCoins,
  soundEnabled,
  showTapControls,
  onPause,
  onToggleSound,
  onSteerLeft,
  onSteerRight,
  onBoostStart,
  onBoostEnd,
  onBrakeStart,
  onBrakeEnd,
}) => {
  const [showNearMiss, setShowNearMiss] = useState(false);

  useEffect(() => {
    if (telemetry.nearMissPopupId === 0) return;
    setShowNearMiss(true);
    const id = window.setTimeout(() => setShowNearMiss(false), 950);
    return () => clearTimeout(id);
  }, [telemetry.nearMissPopupId]);

  const speedPct = Math.min(1, telemetry.speedKmh / 340);
  const arcRadius = 34;
  const arcCircumference = Math.PI * arcRadius * 1.4; // 252 deg sweep
  const dashOffset = arcCircumference * (1 - speedPct);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-5">
      {/* Top Perimeter Bar */}
      <div className="flex items-start justify-between gap-2">
        {/* Top-Left: Score & Distance */}
        <div className="flex flex-col gap-1.5">
          <div className="rounded-xl bg-slate-900/88 border border-white/15 px-3.5 py-2 shadow-lg">
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Score
              </span>
              {telemetry.score > highScore && highScore > 0 && (
                <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300">
                  Best
                </span>
              )}
            </div>
            <div className="font-display text-2xl sm:text-3xl font-bold leading-none text-white tabular-nums">
              {telemetry.score.toLocaleString()}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] font-semibold text-sky-300 tabular-nums">
              <span>{telemetry.distanceMeters.toLocaleString()} m</span>
              {telemetry.isBoosting && (
                <span className="text-cyan-300 font-bold">2x NITRO</span>
              )}
            </div>
          </div>

          {showNearMiss && (
            <div className="rounded-lg bg-cyan-500/95 px-2.5 py-1 text-xs font-display font-bold uppercase tracking-wider text-slate-950 shadow-md">
              Near Miss +50
            </div>
          )}
        </div>

        {/* Top-Right: Coins + Mute + Pause */}
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl bg-slate-900/88 border border-white/15 px-3 py-2 shadow-lg">
            <Coins className="w-4 h-4 text-yellow-400" />
            <div className="flex flex-col items-end leading-none">
              <span className="font-display text-base font-bold text-yellow-300 tabular-nums">
                +{telemetry.runCoins}
              </span>
              <span className="text-[10px] font-medium text-slate-400 tabular-nums">
                {(totalBankCoins + telemetry.runCoins).toLocaleString()}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleSound}
            aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900/88 border border-white/15 text-slate-200 shadow-lg hover:bg-slate-800 active:scale-95 transition"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-rose-400" />}
          </button>

          <button
            type="button"
            onClick={onPause}
            aria-label="Pause game"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900/88 border border-white/15 text-white shadow-lg hover:bg-slate-800 active:scale-95 transition"
          >
            <Pause className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bottom Perimeter Bar */}
      <div className="flex items-end justify-between gap-3">
        {/* Bottom-Left: Optional On-Screen Steer Tap Buttons */}
        <div className="pointer-events-auto flex items-center gap-2.5">
          {showTapControls && (
            <>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onSteerLeft();
                }}
                aria-label="Steer Left"
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900/82 border border-white/20 text-white shadow-xl active:scale-90 active:bg-sky-500/30 transition"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onSteerRight();
                }}
                aria-label="Steer Right"
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900/82 border border-white/20 text-white shadow-xl active:scale-90 active:bg-sky-500/30 transition"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}
        </div>

        {/* Bottom-Right: Optional Boost/Brake Tap + Speedometer & Nitro */}
        <div className="flex items-end gap-3">
          {showTapControls && (
            <div className="pointer-events-auto flex flex-col gap-2">
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onBoostStart();
                }}
                onPointerUp={onBoostEnd}
                onPointerLeave={onBoostEnd}
                onPointerCancel={onBoostEnd}
                aria-label="Nitro Boost"
                className="flex h-12 w-14 items-center justify-center rounded-xl bg-cyan-500/88 border border-cyan-200/40 text-slate-950 shadow-lg active:scale-90 transition"
              >
                <Flame className="w-6 h-6 fill-current" />
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onBrakeStart();
                }}
                onPointerUp={onBrakeEnd}
                onPointerLeave={onBrakeEnd}
                onPointerCancel={onBrakeEnd}
                aria-label="Brake"
                className="flex h-12 w-14 items-center justify-center rounded-xl bg-rose-600/88 border border-rose-200/30 text-white shadow-lg active:scale-90 transition"
              >
                <OctagonAlert className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Speedometer + Nitro Gauge */}
          <div className="flex flex-col items-end gap-1.5 rounded-2xl bg-slate-900/88 border border-white/15 px-3.5 py-2.5 shadow-xl">
            <div className="relative flex items-center justify-center w-24 h-20">
              <svg viewBox="0 0 90 76" className="w-full h-full overflow-visible">
                <circle
                  cx="45"
                  cy="44"
                  r={arcRadius}
                  fill="none"
                  stroke="rgba(148,163,184,0.22)"
                  strokeWidth="7"
                  strokeDasharray={`${arcCircumference} 400`}
                  strokeLinecap="round"
                  transform="rotate(144 45 44)"
                />
                <circle
                  cx="45"
                  cy="44"
                  r={arcRadius}
                  fill="none"
                  stroke={
                    telemetry.isBoosting
                      ? '#06b6d4'
                      : telemetry.isBraking
                      ? '#f43f5e'
                      : '#ff6b2c'
                  }
                  strokeWidth="7"
                  strokeDasharray={`${arcCircumference} 400`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  transform="rotate(144 45 44)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
                <span className="font-display text-2xl font-bold leading-none text-white tabular-nums">
                  {telemetry.speedKmh}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                  km/h
                </span>
              </div>
            </div>

            {/* Nitro Bar */}
            <div className="w-24">
              <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-cyan-300 mb-0.5">
                <span>Nitro</span>
                <span className="tabular-nums">{telemetry.nitroCharge}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800 border border-white/10">
                <div
                  className={`h-full transition-all duration-75 ${
                    telemetry.isBoosting ? 'bg-cyan-300' : 'bg-cyan-500'
                  }`}
                  style={{ width: `${telemetry.nitroCharge}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
