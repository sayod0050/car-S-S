import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Gauge,
  OctagonAlert,
  Pause,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { RaceModeId, RaceTelemetry } from '../types/game';

interface RaceHUDProps {
  mode: RaceModeId;
  telemetry: RaceTelemetry;
  soundEnabled: boolean;
  onPause: () => void;
  onToggleSound: () => void;
  onControl: (control: 'left' | 'right' | 'gas' | 'brake' | 'nitro', active: boolean) => void;
}

function ordinal(n: number): string {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

function formatTime(sec: number): string {
  const s = Math.max(0, sec);
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${mins > 0 ? `${mins}:` : ''}${rem < 10 && mins > 0 ? '0' : ''}${rem.toFixed(1)}s`;
}

export const RaceHUD: React.FC<RaceHUDProps> = ({
  mode,
  telemetry,
  soundEnabled,
  onPause,
  onToggleSound,
  onControl,
}) => {
  const isDriftMode = mode === 'drift';
  const isTimeTrial = mode === 'timetrial';
  const isDrag = mode === 'drag';

  const displayTime = isDriftMode
    ? Math.max(0, 60 - telemetry.elapsedSec)
    : telemetry.elapsedSec;

  const bindHold = (control: 'left' | 'right' | 'gas' | 'brake' | 'nitro') => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      onControl(control, true);
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      onControl(control, false);
    },
    onPointerCancel: () => onControl(control, false),
  });

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-5">
      {/* Top Perimeter HUD */}
      <div className="flex items-start justify-between gap-2">
        {/* Top-Left: Position & Lap */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3 rounded-xl bg-slate-950/88 border border-white/15 px-3.5 py-2 shadow-lg">
            {!isDriftMode && !isTimeTrial ? (
              <div className="flex items-baseline gap-1">
                <span className="font-display text-2xl sm:text-3xl font-bold text-amber-400 tabular-nums leading-none">
                  {ordinal(telemetry.position)}
                </span>
                <span className="text-xs font-bold text-slate-400 tabular-nums">
                  / {telemetry.totalCars}
                </span>
              </div>
            ) : (
              <div className="font-display text-lg font-bold uppercase text-cyan-300">
                {isDriftMode ? 'DRIFT' : 'SOLO'}
              </div>
            )}

            <div className="h-6 w-px bg-white/15" />

            <div className="flex flex-col leading-tight">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {isDrag ? 'Distance' : isDriftMode ? 'Drift Pts' : 'Lap'}
              </span>
              <span className="font-display text-sm sm:text-base font-bold text-white tabular-nums">
                {isDrag
                  ? `${Math.round(telemetry.trackProgressPct)}%`
                  : isDriftMode
                  ? telemetry.driftPoints.toLocaleString()
                  : `${telemetry.lap} / ${telemetry.totalLaps}`}
              </span>
            </div>
          </div>

          {/* Active Drift Callout */}
          {(telemetry.isDrifting || telemetry.activeDriftCombo > 0) && (
            <div className="rounded-lg bg-amber-400 px-3 py-1 font-display text-xs font-bold uppercase tracking-wider text-slate-950 shadow-md">
              DRIFTING +{telemetry.activeDriftCombo}
            </div>
          )}
        </div>

        {/* Top-Center: Timer & Progress */}
        <div className="hidden sm:flex flex-col items-center rounded-xl bg-slate-950/88 border border-white/15 px-4 py-2 shadow-lg min-w-[140px]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {isDriftMode ? 'Time Left' : isTimeTrial ? 'Target 78.0s' : 'Race Time'}
          </span>
          <span
            className={`font-display text-xl font-bold tabular-nums leading-tight ${
              isDriftMode && displayTime < 10 ? 'text-rose-400' : 'text-white'
            }`}
          >
            {formatTime(displayTime)}
          </span>
          {!isDriftMode && (
            <div className="mt-1 h-1 w-28 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-cyan-400"
                style={{ width: `${telemetry.trackProgressPct}%` }}
              />
            </div>
          )}
        </div>

        {/* Top-Right: Mobile Timer + Mute + Pause */}
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="sm:hidden rounded-xl bg-slate-950/88 border border-white/15 px-2.5 py-2 text-center">
            <div className="font-display text-sm font-bold text-white tabular-nums">
              {formatTime(displayTime)}
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleSound}
            aria-label="Toggle Sound"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950/88 border border-white/15 text-slate-200 shadow-lg hover:bg-slate-800 active:scale-95 transition"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-rose-400" />}
          </button>

          <button
            type="button"
            onClick={onPause}
            aria-label="Pause Race"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950/88 border border-white/15 text-white shadow-lg hover:bg-slate-800 active:scale-95 transition"
          >
            <Pause className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Countdown 3 - 2 - 1 - GO! Banner */}
      {telemetry.countdownText && (
        <div className="flex items-center justify-center">
          <div
            className={`rounded-2xl border px-8 py-4 shadow-2xl ${
              telemetry.countdownText === 'GO!'
                ? 'bg-emerald-500 border-emerald-200 text-slate-950'
                : 'bg-slate-950/92 border-cyan-400/50 text-white'
            }`}
          >
            <span className="font-display text-5xl sm:text-6xl font-bold italic tracking-wider">
              {telemetry.countdownText}
            </span>
          </div>
        </div>
      )}

      {/* Bottom Controls & Speedometer */}
      <div className="flex items-end justify-between gap-2">
        {/* Bottom-Left: Left & Right Steering Arrows */}
        <div className="pointer-events-auto flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            {...bindHold('left')}
            aria-label="Turn Left"
            className="flex h-16 w-16 sm:h-18 sm:w-18 items-center justify-center rounded-2xl bg-slate-950/82 border border-white/25 text-white shadow-xl active:scale-90 active:bg-cyan-500/40 transition"
          >
            <ChevronLeft className="w-9 h-9" />
          </button>
          <button
            type="button"
            {...bindHold('right')}
            aria-label="Turn Right"
            className="flex h-16 w-16 sm:h-18 sm:w-18 items-center justify-center rounded-2xl bg-slate-950/82 border border-white/25 text-white shadow-xl active:scale-90 active:bg-cyan-500/40 transition"
          >
            <ChevronRight className="w-9 h-9" />
          </button>
        </div>

        {/* Bottom-Right: Speedometer + Nitro + Brake + Gas */}
        <div className="flex items-end gap-2 sm:gap-3">
          {/* Speedometer + Nitro Gauge */}
          <div className="flex flex-col items-end rounded-2xl bg-slate-950/88 border border-white/15 px-3 py-2 shadow-xl">
            <div className="flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-orange-400" />
              <span className="font-display text-xl sm:text-2xl font-bold text-white tabular-nums leading-none">
                {telemetry.speedKmh}
              </span>
              <span className="text-[10px] font-bold uppercase text-slate-400">km/h</span>
            </div>
            <div className="mt-1.5 w-24">
              <div className="flex justify-between text-[9px] font-bold uppercase text-cyan-300 mb-0.5">
                <span>Nitro</span>
                <span className="tabular-nums">{telemetry.nitroCharge}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full ${telemetry.isBoosting ? 'bg-cyan-300' : 'bg-cyan-500'}`}
                  style={{ width: `${telemetry.nitroCharge}%` }}
                />
              </div>
            </div>
          </div>

          {/* Pedals & Nitro */}
          <div className="pointer-events-auto flex items-end gap-2">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                {...bindHold('nitro')}
                aria-label="Nitro Boost"
                className="flex h-12 w-14 sm:w-16 flex-col items-center justify-center rounded-xl bg-cyan-500/90 border border-cyan-200/50 text-slate-950 shadow-lg active:scale-90 transition"
              >
                <Flame className="w-5 h-5 fill-current" />
                <span className="font-display text-[9px] font-bold uppercase">Nitro</span>
              </button>

              <button
                type="button"
                {...bindHold('brake')}
                aria-label="Brake"
                className="flex h-12 w-14 sm:w-16 flex-col items-center justify-center rounded-xl bg-rose-600/90 border border-rose-300/35 text-white shadow-lg active:scale-90 transition"
              >
                <OctagonAlert className="w-4 h-4" />
                <span className="font-display text-[9px] font-bold uppercase">Brake</span>
              </button>
            </div>

            <button
              type="button"
              {...bindHold('gas')}
              aria-label="Gas Pedal"
              className="flex h-24 w-16 sm:h-26 sm:w-20 flex-col items-center justify-center rounded-2xl bg-gradient-to-t from-emerald-600 to-emerald-400 border border-emerald-200/45 text-slate-950 shadow-xl active:scale-95 transition"
            >
              <span className="font-display text-sm sm:text-base font-bold uppercase tracking-wider">
                Gas
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
