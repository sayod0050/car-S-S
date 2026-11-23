import React from 'react';
import { Award, Coins, Home, Play, RotateCcw, Trophy, Wrench } from 'lucide-react';
import { RaceResult } from '../types/game';

interface ResultsModalProps {
  result: RaceResult;
  championshipActive: boolean;
  championshipRound: number;
  championshipTotalRounds: number;
  championshipStandings: { name: string; points: number; isPlayer: boolean }[];
  onNextChampionshipRound: () => void;
  onRestart: () => void;
  onGarage: () => void;
  onMainMenu: () => void;
}

function ordinal(n: number): string {
  if (n === 1) return '1st Place';
  if (n === 2) return '2nd Place';
  if (n === 3) return '3rd Place';
  return `${n}th Place`;
}

export const ResultsModal: React.FC<ResultsModalProps> = ({
  result,
  championshipActive,
  championshipRound,
  championshipTotalRounds,
  championshipStandings,
  onNextChampionshipRound,
  onRestart,
  onGarage,
  onMainMenu,
}) => {
  const isVictory =
    result.mode === 'drift' || result.mode === 'timetrial'
      ? result.targetBeat
      : result.position === 1;

  const isChampionshipFinished =
    championshipActive && championshipRound >= championshipTotalRounds;

  const champWinner = championshipStandings[0];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/82 p-4">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl bg-slate-900 border border-white/15 p-5 sm:p-6 shadow-2xl">
        {/* Victory / Finish Banner */}
        <div className="text-center">
          <div
            className={`mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl border ${
              isVictory
                ? 'bg-amber-400/20 border-amber-400/40 text-amber-300'
                : 'bg-sky-500/15 border-sky-400/30 text-sky-300'
            }`}
          >
            {isVictory ? <Trophy className="w-8 h-8" /> : <Award className="w-8 h-8" />}
          </div>

          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
            {result.mode === 'championship'
              ? `Championship Round ${championshipRound} / ${championshipTotalRounds}`
              : result.mode.toUpperCase() + ' RESULTS'}
          </p>

          <h2 className="mt-1 font-display text-3xl sm:text-4xl font-bold uppercase text-white">
            {result.mode === 'drift'
              ? result.targetBeat
                ? 'Drift Master!'
                : 'Drift Complete'
              : result.mode === 'timetrial'
              ? result.targetBeat
                ? 'Clock Beaten!'
                : 'Time Complete'
              : isVictory
              ? 'Victory!'
              : ordinal(result.position)}
          </h2>
        </div>

        {/* Key Stats */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-slate-950 border border-white/10 p-3 text-center">
            <div className="text-[10px] font-bold uppercase text-slate-400">
              {result.mode === 'drift' ? 'Drift Score' : 'Finish Time'}
            </div>
            <div className="font-display text-xl font-bold text-white tabular-nums mt-0.5">
              {result.mode === 'drift'
                ? result.driftPoints.toLocaleString()
                : `${result.finishTimeSec.toFixed(1)}s`}
            </div>
          </div>

          <div className="rounded-xl bg-slate-950 border border-white/10 p-3 text-center">
            <div className="text-[10px] font-bold uppercase text-slate-400">
              {result.mode === 'drift' ? 'Target 1,500' : 'Standing'}
            </div>
            <div className="font-display text-xl font-bold text-amber-300 tabular-nums mt-0.5">
              {result.mode === 'drift'
                ? result.targetBeat
                  ? 'Cleared!'
                  : 'Keep Sliding'
                : result.mode === 'timetrial'
                ? result.targetBeat
                  ? 'Gold Pace!'
                  : 'Under Target'
                : `${ordinal(result.position)} / ${result.totalCars}`}
            </div>
          </div>
        </div>

        {/* Coin Rewards Breakdown */}
        <div className="mt-3 rounded-xl bg-slate-800/75 border border-white/10 p-3.5 text-xs">
          <div className="flex justify-between text-slate-300">
            <span>Race Finish Reward</span>
            <span className="font-bold text-yellow-300 tabular-nums">+{result.baseReward}</span>
          </div>
          {result.driftBonus > 0 && (
            <div className="mt-1 flex justify-between text-slate-300">
              <span>Drift Style Bonus</span>
              <span className="font-bold text-cyan-300 tabular-nums">+{result.driftBonus}</span>
            </div>
          )}
          {result.challengeBonus > 0 && (
            <div className="mt-1 flex justify-between text-slate-300">
              <span>Win / Challenge Bonus</span>
              <span className="font-bold text-emerald-300 tabular-nums">+{result.challengeBonus}</span>
            </div>
          )}
          <div className="mt-2 border-t border-white/10 pt-2 flex items-center justify-between text-sm font-bold text-white">
            <span className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-yellow-400" />
              Total Coins Earned
            </span>
            <span className="font-display text-lg text-yellow-300 tabular-nums">
              +{result.totalCoinsEarned}
            </span>
          </div>
        </div>

        {/* Championship Standings */}
        {championshipActive && championshipStandings.length > 0 && (
          <div className="mt-3 rounded-xl bg-slate-950 border border-white/10 p-3">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase text-amber-300 mb-2">
              <span>
                {isChampionshipFinished
                  ? `Champion: ${champWinner?.name}`
                  : 'Championship Standings'}
              </span>
              <span>Pts</span>
            </div>
            <div className="flex flex-col gap-1">
              {championshipStandings.slice(0, 4).map((entry, idx) => (
                <div
                  key={entry.name}
                  className={`flex justify-between rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    entry.isPlayer
                      ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/30'
                      : 'text-slate-300'
                  }`}
                >
                  <span>
                    {idx + 1}. {entry.name}
                  </span>
                  <span className="tabular-nums font-bold">{entry.points}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex flex-col gap-2.5">
          {championshipActive && !isChampionshipFinished ? (
            <button
              type="button"
              onClick={onNextChampionshipRound}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 py-3.5 font-display text-lg font-bold uppercase tracking-wider text-slate-950 shadow-lg hover:brightness-110 active:scale-95 transition"
            >
              <Play className="w-5 h-5 fill-current" />
              Next Round ({championshipRound + 1}/{championshipTotalRounds})
            </button>
          ) : (
            <button
              type="button"
              onClick={onRestart}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 py-3.5 font-display text-lg font-bold uppercase tracking-wider text-white shadow-lg hover:brightness-110 active:scale-95 transition"
            >
              <RotateCcw className="w-5 h-5" />
              Race Again
            </button>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onGarage}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 border border-white/10 py-3 font-display text-sm font-bold uppercase text-amber-300 hover:bg-slate-700 transition"
            >
              <Wrench className="w-4 h-4" />
              Garage
            </button>
            <button
              type="button"
              onClick={onMainMenu}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 border border-white/10 py-3 font-display text-sm font-bold uppercase text-white hover:bg-slate-700 transition"
            >
              <Home className="w-4 h-4" />
              Main Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
