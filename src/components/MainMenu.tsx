import React from 'react';
import {
  Car,
  Coins,
  Flag,
  LogOut,
  Play,
  Settings,
  Trophy,
  Wrench,
} from 'lucide-react';
import {
  CarSpec,
  MapMeta,
  ModeMeta,
} from '../types/game';
import { PWAInstallButton } from './PWAInstallButton';
import { SSLogo } from './SSLogo';

interface MainMenuProps {
  coins: number;
  wins: number;
  selectedCar: CarSpec;
  selectedMode: ModeMeta;
  selectedMap: MapMeta;
  onPlay: () => void;
  onOpenGarage: () => void;
  onOpenCars: () => void;
  onOpenModes: () => void;
  onOpenSettings: () => void;
  onOpenAndroidGuide: () => void;
  onExit: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  coins,
  wins,
  selectedCar,
  selectedMode,
  selectedMap,
  onPlay,
  onOpenGarage,
  onOpenCars,
  onOpenModes,
  onOpenSettings,
  onOpenAndroidGuide,
  onExit,
}) => {
  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3.5 sm:p-6">
      {/* Top Bar */}
      <div className="flex items-start justify-between gap-2">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl bg-slate-900/90 border border-white/15 px-3.5 py-2 shadow-lg">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="font-display text-base font-bold text-yellow-300 tabular-nums">
              {coins.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-slate-900/90 border border-white/15 px-3.5 py-2 shadow-lg">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-bold uppercase text-slate-400">Wins</span>
            <span className="font-display text-base font-bold text-white tabular-nums">
              {wins}
            </span>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <PWAInstallButton onOpenAndroidGuide={onOpenAndroidGuide} />
          <button
            type="button"
            onClick={onExit}
            aria-label="Exit"
            className="flex items-center gap-1.5 rounded-xl bg-slate-900/90 border border-white/15 px-3 py-2 text-xs font-bold uppercase tracking-wider text-rose-300 hover:bg-slate-800 active:scale-95 transition"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </div>

      {/* Upper Glowing S&S Lockup */}
      <div className="flex flex-col items-center -mt-3 sm:-mt-6">
        <SSLogo compact />
      </div>

      {/* Center stays open for live 3D Car Showcase */}
      <div className="flex-1" />

      {/* Bottom Dock: Selected Setup + All 6 Menu Buttons */}
      <div className="pointer-events-auto mx-auto flex w-full max-w-2xl flex-col items-center gap-2.5">
        {/* Current Setup Pill */}
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl bg-slate-950/88 border border-white/15 px-3.5 py-1.5 text-xs font-semibold text-slate-200 shadow-lg">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm border border-white/40"
            style={{ backgroundColor: selectedCar.primaryColor }}
          />
          <span className="text-white font-bold">{selectedCar.name}</span>
          <span className="text-slate-500">·</span>
          <span className="text-cyan-300">{selectedMode.name}</span>
          <span className="text-slate-500">·</span>
          <span className="text-amber-300">{selectedMap.name}</span>
        </div>

        {/* Primary PLAY + Secondary Menu Grid */}
        <div className="flex w-full flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <button
            type="button"
            onClick={onPlay}
            className="flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 border border-amber-300/40 px-8 py-3.5 font-display text-xl font-bold uppercase tracking-wider text-white shadow-[0_8px_24px_rgba(234,88,12,0.45)] hover:brightness-110 active:scale-95 transition sm:min-w-[170px]"
          >
            <Play className="w-6 h-6 fill-current" />
            Play
          </button>

          <div className="grid flex-1 grid-cols-4 gap-2">
            <button
              type="button"
              onClick={onOpenModes}
              className="flex flex-col items-center justify-center gap-1 rounded-xl bg-slate-900/92 border border-white/15 py-2.5 px-2 text-white hover:bg-slate-800 active:scale-95 transition"
            >
              <Flag className="w-4 h-4 text-cyan-400" />
              <span className="font-display text-[11px] font-bold uppercase tracking-wider">
                Modes
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenCars}
              className="flex flex-col items-center justify-center gap-1 rounded-xl bg-slate-900/92 border border-white/15 py-2.5 px-2 text-white hover:bg-slate-800 active:scale-95 transition"
            >
              <Car className="w-4 h-4 text-orange-400" />
              <span className="font-display text-[11px] font-bold uppercase tracking-wider">
                Cars
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenGarage}
              className="flex flex-col items-center justify-center gap-1 rounded-xl bg-slate-900/92 border border-white/15 py-2.5 px-2 text-white hover:bg-slate-800 active:scale-95 transition"
            >
              <Wrench className="w-4 h-4 text-amber-400" />
              <span className="font-display text-[11px] font-bold uppercase tracking-wider">
                Garage
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              className="flex flex-col items-center justify-center gap-1 rounded-xl bg-slate-900/92 border border-white/15 py-2.5 px-2 text-white hover:bg-slate-800 active:scale-95 transition"
            >
              <Settings className="w-4 h-4 text-slate-300" />
              <span className="font-display text-[11px] font-bold uppercase tracking-wider">
                Settings
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
