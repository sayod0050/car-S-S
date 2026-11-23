import React, { useState } from 'react';
import { ArrowLeft, Check, Coins, Lock, Play, Wrench } from 'lucide-react';
import {
  CarCategory,
  CarSpec,
  CarUpgrades,
  DEFAULT_UPGRADES,
  RACING_CARS,
} from '../types/game';

interface GarageModalProps {
  initialTab: 'cars' | 'upgrades';
  coins: number;
  unlockedCarIds: string[];
  selectedCarId: string;
  carUpgrades: Record<string, CarUpgrades>;
  onPreviewCar: (carId: string) => void;
  onSelectCar: (carId: string) => void;
  onUnlockCar: (car: CarSpec) => boolean;
  onUpgradeCar: (carId: string, stat: keyof CarUpgrades, cost: number) => boolean;
  onBack: () => void;
  onPlayNow: () => void;
}

const CATEGORIES: ('All' | CarCategory)[] = [
  'All',
  'Sports',
  'Drift',
  'Muscle',
  'SUV',
  'Police',
  'Supercar',
  'Race',
];

export const GarageModal: React.FC<GarageModalProps> = ({
  initialTab,
  coins,
  unlockedCarIds,
  selectedCarId,
  carUpgrades,
  onPreviewCar,
  onSelectCar,
  onUnlockCar,
  onUpgradeCar,
  onBack,
  onPlayNow,
}) => {
  const [tab, setTab] = useState<'cars' | 'upgrades'>(initialTab);
  const [category, setCategory] = useState<'All' | CarCategory>('All');
  const [viewedCarId, setViewedCarId] = useState(selectedCarId);
  const [coinWarning, setCoinWarning] = useState('');

  const viewedCar = RACING_CARS.find((c) => c.id === viewedCarId) ?? RACING_CARS[0];
  const isUnlocked = unlockedCarIds.includes(viewedCar.id);
  const isEquipped = selectedCarId === viewedCar.id;
  const upgrades = carUpgrades[viewedCar.id] ?? DEFAULT_UPGRADES;

  const filteredCars =
    category === 'All'
      ? RACING_CARS
      : RACING_CARS.filter((c) => c.category === category);

  const handleSelectPreview = (car: CarSpec) => {
    setCoinWarning('');
    setViewedCarId(car.id);
    onPreviewCar(car.id);
  };

  const handleUnlockOrEquip = () => {
    setCoinWarning('');
    if (isUnlocked) {
      onSelectCar(viewedCar.id);
      return;
    }
    const ok = onUnlockCar(viewedCar);
    if (!ok) {
      setCoinWarning(`Need ${(viewedCar.price - coins).toLocaleString()} more coins!`);
    }
  };

  const upgradeCost = (lvl: number) => lvl * 120;

  const handleUpgrade = (stat: keyof CarUpgrades) => {
    setCoinWarning('');
    const curLvl = upgrades[stat];
    if (curLvl >= 5) return;
    const cost = upgradeCost(curLvl);
    const ok = onUpgradeCar(viewedCar.id, stat, cost);
    if (!ok) {
      setCoinWarning(`Need ${(cost - coins).toLocaleString()} more coins to upgrade!`);
    }
  };

  const boostedSpeed = viewedCar.topSpeedKmh + (upgrades.engine - 1) * 14;

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-3 sm:p-5">
      {/* Top Bar */}
      <div className="pointer-events-auto flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            onPreviewCar(selectedCarId);
            onBack();
          }}
          className="flex items-center gap-1.5 rounded-xl bg-slate-900/92 border border-white/15 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-lg hover:bg-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex rounded-xl bg-slate-900/92 border border-white/15 p-1 shadow-lg">
          <button
            type="button"
            onClick={() => setTab('cars')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold uppercase transition ${
              tab === 'cars' ? 'bg-orange-500 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Cars ({RACING_CARS.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('upgrades')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold uppercase transition ${
              tab === 'upgrades' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            Upgrades
          </button>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl bg-slate-900/92 border border-white/15 px-3.5 py-2 shadow-lg">
          <Coins className="w-4 h-4 text-yellow-400" />
          <span className="font-display text-sm sm:text-base font-bold text-yellow-300 tabular-nums">
            {coins.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Center stays open for 3D Car Inspection (drag to rotate) */}
      <div className="flex-1" />

      {/* Bottom Showroom Panel */}
      <div className="pointer-events-auto mx-auto w-full max-w-4xl rounded-2xl bg-slate-950/92 border border-white/15 p-3.5 sm:p-4 shadow-2xl">
        {/* Car Info Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="h-3.5 w-3.5 rounded-sm border border-white/40"
                style={{ backgroundColor: viewedCar.primaryColor }}
              />
              <h2 className="font-display text-lg sm:text-2xl font-bold uppercase text-white">
                {viewedCar.name}
              </h2>
              <span className="rounded-md bg-sky-500/20 border border-sky-400/30 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-300">
                {viewedCar.category}
              </span>
              {isEquipped && (
                <span className="rounded-md bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                  Equipped
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
              Top Speed: <strong className="text-amber-300">{boostedSpeed} km/h</strong> · Drag 3D car above to spin
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:w-64">
            {[
              { label: 'Speed', val: Math.min(100, viewedCar.speedStat + (upgrades.engine - 1) * 4), col: 'bg-orange-500' },
              { label: 'Accel', val: Math.min(100, viewedCar.accelStat + (upgrades.turbo - 1) * 4), col: 'bg-amber-400' },
              { label: 'Grip', val: Math.min(100, viewedCar.handlingStat + (upgrades.tires - 1) * 4), col: 'bg-cyan-400' },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-300 mb-0.5">
                  <span>{s.label}</span>
                  <span className="tabular-nums">{s.val}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className={`h-full ${s.col}`} style={{ width: `${s.val}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {tab === 'cars' ? (
          <>
            {/* Category Filter */}
            <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase transition ${
                    category === cat
                      ? 'bg-sky-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Horizontal Car Roster */}
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1.5">
              {filteredCars.map((car) => {
                const owned = unlockedCarIds.includes(car.id);
                const active = viewedCar.id === car.id;
                const equipped = selectedCarId === car.id;
                return (
                  <button
                    key={car.id}
                    type="button"
                    onClick={() => handleSelectPreview(car)}
                    className={`shrink-0 w-32 rounded-xl p-2.5 text-left border transition ${
                      active
                        ? 'bg-slate-800 border-orange-400'
                        : 'bg-slate-900/90 border-white/10 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="h-3 w-5 rounded-sm border border-white/30"
                        style={{ backgroundColor: car.primaryColor }}
                      />
                      {equipped ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : !owned ? (
                        <Lock className="w-3 h-3 text-amber-400" />
                      ) : null}
                    </div>
                    <div className="mt-1.5 truncate font-display text-xs font-bold text-white">
                      {car.name}
                    </div>
                    <div className="text-[10px] text-slate-400">{car.category}</div>
                    <div className="mt-1 text-[11px] font-bold text-amber-300 tabular-nums">
                      {owned ? 'Owned' : `${car.price} Coins`}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          /* Garage Upgrades Panel */
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(
              [
                { key: 'engine', label: 'Engine', desc: '+Top Speed' },
                { key: 'turbo', label: 'Turbo', desc: '+Acceleration' },
                { key: 'tires', label: 'Tires', desc: '+Handling & Grip' },
                { key: 'nitro', label: 'Nitro', desc: '+Boost Power' },
              ] as { key: keyof CarUpgrades; label: string; desc: string }[]
            ).map((item) => {
              const lvl = upgrades[item.key];
              const maxed = lvl >= 5;
              const cost = upgradeCost(lvl);
              return (
                <div
                  key={item.key}
                  className="flex flex-col justify-between rounded-xl bg-slate-900 border border-white/10 p-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm font-bold uppercase text-white">
                        {item.label}
                      </span>
                      <span className="text-[11px] font-bold text-cyan-300 tabular-nums">
                        Lv {lvl}/5
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">{item.desc}</div>
                    <div className="mt-2 flex gap-1">
                      {[1, 2, 3, 4, 5].map((pip) => (
                        <span
                          key={pip}
                          className={`h-1.5 flex-1 rounded-full ${
                            pip <= lvl ? 'bg-orange-400' : 'bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!isUnlocked || maxed}
                    onClick={() => handleUpgrade(item.key)}
                    className={`mt-2.5 flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold uppercase transition ${
                      !isUnlocked
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : maxed
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : coins >= cost
                        ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 active:scale-95'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Wrench className="w-3 h-3" />
                    {!isUnlocked ? 'Locked' : maxed ? 'MAXED' : `${cost} Coins`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Action Bar */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          {coinWarning ? (
            <span className="text-xs font-bold text-rose-400">{coinWarning}</span>
          ) : (
            <span className="text-[11px] text-slate-400">
              Win races to earn coins &amp; unlock all 14 Sports, Drift, Muscle, SUV, Police, Supercar &amp; Race cars!
            </span>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {isUnlocked ? (
              <>
                {!isEquipped && (
                  <button
                    type="button"
                    onClick={handleUnlockOrEquip}
                    className="rounded-xl bg-sky-500 px-4 py-2 font-display text-xs sm:text-sm font-bold uppercase text-slate-950 hover:bg-sky-400 transition"
                  >
                    Select Car
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onSelectCar(viewedCar.id);
                    onPlayNow();
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 px-5 py-2 font-display text-xs sm:text-sm font-bold uppercase text-white shadow-lg hover:brightness-110 transition"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Race
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleUnlockOrEquip}
                className={`flex items-center gap-1.5 rounded-xl px-5 py-2 font-display text-xs sm:text-sm font-bold uppercase transition ${
                  coins >= viewedCar.price
                    ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-lg'
                    : 'bg-slate-800 text-slate-400 border border-white/10'
                }`}
              >
                <Coins className="w-4 h-4" />
                Buy ({viewedCar.price})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
