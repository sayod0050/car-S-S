import React from 'react';
import { Home, Play, RotateCcw, Settings } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onSettings: () => void;
  onHome: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onSettings,
  onHome,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/78 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/15 p-6 shadow-2xl">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">
            S&amp;S Racing
          </p>
          <h2 className="mt-1 font-display text-3xl font-bold uppercase text-white">
            Race Paused
          </h2>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onResume}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 py-3.5 font-display text-lg font-bold uppercase tracking-wider text-white shadow-lg hover:brightness-110 active:scale-95 transition"
          >
            <Play className="w-5 h-5 fill-current" />
            Resume Race
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 border border-white/10 py-3 font-display text-base font-bold uppercase tracking-wider text-white hover:bg-slate-700 active:scale-95 transition"
          >
            <RotateCcw className="w-4 h-4" />
            Restart Race
          </button>

          <button
            type="button"
            onClick={onSettings}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 border border-white/10 py-3 font-display text-base font-bold uppercase tracking-wider text-white hover:bg-slate-700 active:scale-95 transition"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>

          <button
            type="button"
            onClick={onHome}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 border border-white/10 py-3 font-display text-base font-bold uppercase tracking-wider text-slate-300 hover:bg-slate-800 active:scale-95 transition"
          >
            <Home className="w-4 h-4" />
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
