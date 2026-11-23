import React, { useState } from 'react';
import { ArrowLeft, Check, Coins, Lock, Play } from 'lucide-react';
import { CarSpec, GARAGE_CARS } from '../types/game';

interface GarageModalProps {
  coins: number;
  unlockedCarIds: string[];
  selectedCarId: string;
  onPreviewCar: (carId: string) => void;
  onSelectCar: (carId: string) => void;
  onUnlockCar: (car: CarSpec) => boolean;
  onBack: () => void;
  onPlayWithSelected: () => void;
}

export const GarageModal: React.FC<GarageModalProps> = ({
  coins,
  unlockedCarIds,
  selectedCarId,
  onPreviewCar,
  onSelectCar,
  onUnlockCar,
  onBack,
  onPlayWithSelected,
}) => {
  const [viewedCarId, setViewedCarId] = useState(selectedCarId);
  const [insufficientMsg, setInsufficientMsg] = useState(false);

  const viewedCar = GARAGE_CARS.find((c) => c.id === viewedCarId) ?? GARAGE_CARS[0];
  const isUnlocked = unlockedCarIds.includes(viewedCar.id);
  const isEquipped = selectedCarId === viewedCar.id;
  const canAfford = coins >= viewedCar.price;

  const handleCardClick = (car: CarSpec) => {
    setInsufficientMsg(false);
    setViewedCarId(car.id);
    onPreviewCar(car.id);
  };

  const handleAction = () => {
    if (isUnlocked) {
      onSelectCar(viewedCar.id);
      return;
    }
    const ok = onUnlockCar(viewedCar);
    if (!ok) {
      setInsufficientMsg(true);
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Bar */}
      <div className="pointer-events-auto flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            onPreviewCar(selectedCarId);
            onBack();
          }}
          className="flex items-center gap-2 rounded-xl bg-slate-900/92 border border-white/15 px-4 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-slate-800 active:scale-95 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="rounded-xl bg-slate-900/85 border border-white/15 px-3.5 py-1.5 text-center hidden sm:block">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-300">
            Drag to rotate · 5 Unlockable Rides
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-slate-900/92 border border-white/15 px-4 py-2.5 shadow-lg">
          <Coins className="w-4 h-4 text-yellow-400" />
          <span className="font-display text-base font-bold text-yellow-300 tabular-nums">
            {coins.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Center remains 100% open for 3D Showroom Car */}
      <div className="flex-1" />

      {/* Bottom Showroom Dock */}
      <div className="pointer-events-auto mx-auto w-full max-w-3xl rounded-2xl bg-slate-950/92 border border-white/15 p-4 shadow-2xl">
        {/* Selected Car Details & Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2.5">
              <span
                className="h-3.5 w-3.5 rounded-sm border border-white/40"
                style={{ backgroundColor: viewedCar.primaryColor }}
              />
              <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-wide text-white">
                {viewedCar.name}
              </h2>
              {isEquipped && (
                <span className="rounded-md bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                  Equipped
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-slate-400 mt-0.5">
              {viewedCar.subtitle} · Top {viewedCar.topSpeedKmh} km/h
            </p>
          </div>

          {/* 3 Compact Stat Bars */}
          <div className="grid grid-cols-3 gap-3 sm:w-72">
            {[
              { label: 'Speed', val: viewedCar.speedStat, color: 'bg-orange-500' },
              { label: 'Handling', val: viewedCar.handlingStat, color: 'bg-cyan-400' },
              { label: 'Accel', val: viewedCar.accelStat, color: 'bg-amber-400' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-300 mb-1">
                  <span>{stat.label}</span>
                  <span className="tabular-nums">{stat.val}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className={`h-full ${stat.color}`} style={{ width: `${stat.val}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5 Car Selector Cards */}
        <div className="mt-3 grid grid-cols-5 gap-2">
          {GARAGE_CARS.map((car) => {
            const owned = unlockedCarIds.includes(car.id);
            const active = viewedCar.id === car.id;
            const equipped = selectedCarId === car.id;
            return (
              <button
                key={car.id}
                type="button"
                onClick={() => handleCardClick(car)}
                className={`relative flex flex-col items-start justify-between rounded-xl p-2 sm:p-2.5 text-left transition border ${
                  active
                    ? 'bg-slate-800 border-orange-400 shadow-[0_0_0_1px_rgba(251,146,60,0.6)]'
                    : 'bg-slate-900/90 border-white/10 hover:bg-slate-800/80'
                }`}
              >
                <div className="flex w-full items-center justify-between gap-1">
                  <span
                    className="h-3 w-5 rounded-sm border border-white/30"
                    style={{ backgroundColor: car.primaryColor }}
                  />
                  {equipped ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : !owned ? (
                    <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                  ) : null}
                </div>
                <div className="mt-1.5 w-full">
                  <div className="truncate font-display text-[11px] sm:text-xs font-bold text-white">
                    {car.name}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-400 tabular-nums">
                    {owned ? 'Owned' : `${car.price} c`}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Action Row */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          {insufficientMsg ? (
            <span className="text-xs font-semibold text-rose-400">
              Need {(viewedCar.price - coins).toLocaleString()} more coins to unlock!
            </span>
          ) : (
            <span className="text-xs text-slate-400">
              Collect gold coins on the highway to unlock faster supercars.
            </span>
          )}

          <div className="flex items-center gap-2.5 ml-auto">
            {isUnlocked ? (
              <>
                {!isEquipped && (
                  <button
                    type="button"
                    onClick={handleAction}
                    className="rounded-xl bg-sky-500 px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-slate-950 hover:bg-sky-400 active:scale-95 transition"
                  >
                    Select Car
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onSelectCar(viewedCar.id);
                    onPlayWithSelected();
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-white shadow-lg hover:brightness-110 active:scale-95 transition"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Race Now
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleAction}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wider transition active:scale-95 ${
                  canAfford
                    ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-lg'
                    : 'bg-slate-800 text-slate-400 border border-white/10'
                }`}
              >
                <Coins className="w-4 h-4" />
                Unlock ({viewedCar.price})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
