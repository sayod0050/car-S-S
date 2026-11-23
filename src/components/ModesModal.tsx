import React from 'react';
import { ArrowLeft, Flag, MapPin, Play, ShieldAlert } from 'lucide-react';
import {
  AIDifficulty,
  MapId,
  RACE_MAPS,
  RACE_MODES,
  RaceModeId,
} from '../types/game';

interface ModesModalProps {
  selectedMode: RaceModeId;
  selectedMap: MapId;
  difficulty: AIDifficulty;
  onSelectMode: (mode: RaceModeId) => void;
  onSelectMap: (map: MapId) => void;
  onSelectDifficulty: (diff: AIDifficulty) => void;
  onStartRace: () => void;
  onBack: () => void;
}

export const ModesModal: React.FC<ModesModalProps> = ({
  selectedMode,
  selectedMap,
  difficulty,
  onSelectMode,
  onSelectMap,
  onSelectDifficulty,
  onStartRace,
  onBack,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/82 p-3 sm:p-6">
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl bg-slate-900 border border-white/15 p-4 sm:p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-3.5 py-2 text-xs font-bold uppercase text-white hover:bg-slate-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h2 className="font-display text-xl sm:text-2xl font-bold uppercase text-white">
            Game Modes &amp; Tracks
          </h2>
          <div className="w-16" />
        </div>

        {/* 6 Game Modes */}
        <div className="mt-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300 mb-2">
            <Flag className="w-4 h-4" />
            Select Game Mode (6 Modes)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {RACE_MODES.map((m) => {
              const active = m.id === selectedMode;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelectMode(m.id)}
                  className={`flex flex-col justify-between rounded-xl p-3 text-left border transition ${
                    active
                      ? 'bg-slate-800 border-orange-400 shadow-[0_0_0_1px_rgba(251,146,60,0.6)]'
                      : 'bg-slate-950/80 border-white/10 hover:bg-slate-800/70'
                  }`}
                >
                  <div>
                    <div className="font-display text-sm sm:text-base font-bold uppercase text-white">
                      {m.name}
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-400 leading-snug">
                      {m.tagline}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] font-bold">
                    <span className="text-sky-300">{m.lapsLabel}</span>
                    <span className="text-amber-300">{m.rewardHint}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5 Maps */}
        <div className="mt-5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300 mb-2">
            <MapPin className="w-4 h-4" />
            Select 3D Environment (5 Maps)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {RACE_MAPS.map((mp) => {
              const active = mp.id === selectedMap;
              const disabled = selectedMode === 'championship';
              return (
                <button
                  key={mp.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelectMap(mp.id)}
                  className={`rounded-xl p-2.5 text-left border transition ${
                    disabled
                      ? 'bg-slate-950/40 border-white/5 opacity-55 cursor-not-allowed'
                      : active
                      ? 'bg-slate-800 border-cyan-400'
                      : 'bg-slate-950/80 border-white/10 hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: mp.badgeColor }}
                    />
                    <span className="font-display text-xs font-bold uppercase text-white truncate">
                      {mp.name}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400 leading-tight">
                    {mp.subtitle}
                  </p>
                </button>
              );
            })}
          </div>
          {selectedMode === 'championship' && (
            <p className="mt-1.5 text-[11px] text-cyan-300">
              Championship tours 3 maps automatically: Metro City → Alpine Ridge → Night Highway.
            </p>
          )}
        </div>

        {/* AI Difficulty + Start Race */}
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="text-xs font-bold uppercase text-slate-300">AI Difficulty:</span>
            <div className="flex gap-1.5">
              {(['easy', 'medium', 'hard'] as AIDifficulty[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onSelectDifficulty(d)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition ${
                    difficulty === d
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onStartRace}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 px-7 py-3 font-display text-base font-bold uppercase tracking-wider text-white shadow-lg hover:brightness-110 active:scale-95 transition"
          >
            <Play className="w-5 h-5 fill-current" />
            Start Race
          </button>
        </div>
      </div>
    </div>
  );
};
