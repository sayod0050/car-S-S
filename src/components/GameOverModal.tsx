import React from 'react';
import { Car, Coins, Gauge, Home, RotateCcw, Trophy, Zap } from 'lucide-react';
import { GameOverSummary } from '../types/game';

interface GameOverModalProps {
  summary: GameOverSummary;
  highScore: number;
  onRestart: () => void;
  onHome: () => void;
  onOpenGarage: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  summary,
  highScore,
  onRestart,
  onHome,
  onOpenGarage,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/78 p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/15 p-6 shadow-2xl">
        <div className="text-center">
          {summary.isNewBest ? (
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400/20 border border-amber-400/40 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300 mb-2">
              <Trophy className="w-3.5 h-3.5" />
              New High Score!
            </div>
          ) : (
            <p className="text-xs font-bold uppercase tracking-widest text-rose-400 mb-1">
              Wrecked!
            </p>
          )}
          <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase text-white">
            Game Over
          </h2>
        </div>

        {/* Main Score Box */}
        <div className="mt-4 rounded-xl bg-slate-950 border border-white/10 p-4 text-center">
          <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Final Score
          </div>
          <div className="font-display text-4xl font-bold text-white tabular-nums mt-0.5">
            {summary.finalScore.toLocaleString()}
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-400 tabular-nums">
            Best: {highScore.toLocaleString()}
          </div>
        </div>

        {/* Run Breakdown */}
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          <div className="rounded-xl bg-slate-800/80 border border-white/10 p-3 text-center">
            <Coins className="w-4 h-4 text-yellow-400 mx-auto" />
            <div className="mt-1 font-display text-lg font-bold text-yellow-300 tabular-nums">
              +{summary.coinsEarned}
            </div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">Coins</div>
          </div>

          <div className="rounded-xl bg-slate-800/80 border border-white/10 p-3 text-center">
            <Gauge className="w-4 h-4 text-orange-400 mx-auto" />
            <div className="mt-1 font-display text-lg font-bold text-white tabular-nums">
              {summary.topSpeedKmh}
            </div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">Top km/h</div>
          </div>

          <div className="rounded-xl bg-slate-800/80 border border-white/10 p-3 text-center">
            <Zap className="w-4 h-4 text-cyan-400 mx-auto" />
            <div className="mt-1 font-display text-lg font-bold text-cyan-300 tabular-nums">
              {summary.distanceMeters}m
            </div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">Distance</div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onRestart}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 py-3.5 font-display text-lg font-bold uppercase tracking-wider text-white shadow-lg hover:brightness-110 active:scale-95 transition"
          >
            <RotateCcw className="w-5 h-5" />
            Restart Race
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onOpenGarage}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 border border-white/10 py-3 font-display text-sm font-bold uppercase tracking-wider text-sky-300 hover:bg-slate-700 active:scale-95 transition"
            >
              <Car className="w-4 h-4" />
              Garage
            </button>

            <button
              type="button"
              onClick={onHome}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 border border-white/10 py-3 font-display text-sm font-bold uppercase tracking-wider text-white hover:bg-slate-700 active:scale-95 transition"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
