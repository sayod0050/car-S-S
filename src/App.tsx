/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { soundEngine } from './audio/soundEngine';
import { GarageModal } from './components/GarageModal';
import { MainMenu } from './components/MainMenu';
import { ModesModal } from './components/ModesModal';
import { PauseModal } from './components/PauseModal';
import { RaceHUD } from './components/RaceHUD';
import { ResultsModal } from './components/ResultsModal';
import { SettingsModal } from './components/SettingsModal';
import { SplashScreen } from './components/SplashScreen';
import { SSLogo } from './components/SSLogo';
import { RacingEngine } from './game/RacingEngine';
import {
  AIDifficulty,
  CHAMPIONSHIP_TOUR,
  CarSpec,
  CarUpgrades,
  GameScreen,
  GameSettings,
  MapId,
  RACE_MAPS,
  RACE_MODES,
  RACING_CARS,
  RaceModeId,
  RaceResult,
  RaceTelemetry,
  SaveData,
} from './types/game';
import { getCarUpgrades, loadSaveData, persistSaveData } from './utils/storage';

const INITIAL_TELEMETRY: RaceTelemetry = {
  countdownText: '3',
  countdownPhase: 3,
  speedKmh: 0,
  position: 1,
  totalCars: 6,
  lap: 1,
  totalLaps: 1,
  elapsedSec: 0,
  timeLimitSec: 0,
  nitroCharge: 100,
  isBoosting: false,
  isDrifting: false,
  driftPoints: 0,
  activeDriftCombo: 0,
  trackProgressPct: 0,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<RacingEngine | null>(null);

  const [saveData, setSaveData] = useState<SaveData>(() => loadSaveData());
  const [screen, setScreen] = useState<GameScreen>('SPLASH');
  const [garageInitialTab, setGarageInitialTab] = useState<'cars' | 'upgrades'>('cars');
  const [settingsReturnScreen, setSettingsReturnScreen] = useState<GameScreen>('MENU');
  const [settingsTab, setSettingsTab] = useState<'general' | 'android'>('general');

  const [telemetry, setTelemetry] = useState<RaceTelemetry>(INITIAL_TELEMETRY);
  const [lastResult, setLastResult] = useState<RaceResult | null>(null);

  // Championship state
  const [champRound, setChampRound] = useState(1);
  const [champPoints, setChampPoints] = useState<Record<string, number>>({});

  const saveRef = useRef(saveData);
  saveRef.current = saveData;

  const screenRef = useRef(screen);
  screenRef.current = screen;

  const selectedCar = useMemo(
    () => RACING_CARS.find((c) => c.id === saveData.selectedCarId) ?? RACING_CARS[0],
    [saveData.selectedCarId]
  );

  const selectedModeMeta = useMemo(
    () => RACE_MODES.find((m) => m.id === saveData.settings.selectedMode) ?? RACE_MODES[0],
    [saveData.settings.selectedMode]
  );

  const selectedMapMeta = useMemo(
    () => RACE_MAPS.find((m) => m.id === saveData.settings.selectedMap) ?? RACE_MAPS[0],
    [saveData.settings.selectedMap]
  );

  useEffect(() => {
    soundEngine.setSettings(saveData.settings.soundEnabled, saveData.settings.musicEnabled);
    persistSaveData(saveData);
  }, [saveData]);

  // Mount Three.js Engine Once
  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const initial = saveRef.current;
    const car = RACING_CARS.find((c) => c.id === initial.selectedCarId) ?? RACING_CARS[0];

    const engine = new RacingEngine(
      mountEl,
      car,
      initial.settings.selectedMap,
      initial.settings.quality,
      {
        onTelemetry: (t) => setTelemetry(t),
        onFinish: (result) => {
          setSaveData((prev) => ({
            ...prev,
            coins: prev.coins + result.totalCoinsEarned,
            wins: prev.wins + (result.position === 1 && result.targetBeat ? 1 : 0),
            totalRaces: prev.totalRaces + 1,
          }));

          if (result.mode === 'championship') {
            setChampPoints((prevPts) => {
              const nextPts = { ...prevPts };
              nextPts['You'] = (nextPts['You'] ?? 0) + (result.championshipPointsAwarded ?? 0);
              const aiNames = ['Turbo Max', 'Drift Kai', 'Viper Ace', 'Apex Kira', 'Nitro Leo'];
              const pool = [10, 6, 4, 2, 1, 1].filter(
                (_, idx) => idx !== result.position - 1
              );
              aiNames.forEach((name, idx) => {
                nextPts[name] = (nextPts[name] ?? 0) + (pool[idx] ?? 1);
              });
              return nextPts;
            });
          }

          setLastResult(result);
          setScreen('RESULTS');
        },
        onRequestPause: () => {
          if (screenRef.current === 'RACING') {
            engine.setPaused(true);
            setScreen('PAUSED');
          }
        },
      }
    );

    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const launchRace = useCallback(
    (modeOverride?: RaceModeId, mapOverride?: MapId, roundNum?: number) => {
      soundEngine.unlock();
      soundEngine.playButton();
      const s = saveRef.current;
      const mode = modeOverride ?? s.settings.selectedMode;
      const isChamp = mode === 'championship';
      const round = roundNum ?? (isChamp ? 1 : undefined);
      const map = isChamp
        ? CHAMPIONSHIP_TOUR[((round ?? 1) - 1) % CHAMPIONSHIP_TOUR.length]
        : mapOverride ?? s.settings.selectedMap;

      if (isChamp && (round ?? 1) === 1) {
        setChampRound(1);
        setChampPoints({
          You: 0,
          'Turbo Max': 0,
          'Drift Kai': 0,
          'Viper Ace': 0,
          'Apex Kira': 0,
          'Nitro Leo': 0,
        });
      }

      const car = RACING_CARS.find((c) => c.id === s.selectedCarId) ?? RACING_CARS[0];
      const upgrades = getCarUpgrades(s, car.id);

      setLastResult(null);
      setScreen('RACING');
      engineRef.current?.startRace({
        mode,
        map,
        difficulty: s.settings.difficulty,
        playerCar: car,
        upgrades,
        championshipRound: round,
      });
    },
    []
  );

  const handleReturnToMenu = useCallback(() => {
    soundEngine.playButton();
    const s = saveRef.current;
    const car = RACING_CARS.find((c) => c.id === s.selectedCarId) ?? RACING_CARS[0];
    engineRef.current?.setupShowroom(car, s.settings.selectedMap);
    setLastResult(null);
    setScreen('MENU');
  }, []);

  const handleOpenGarageOrCars = useCallback((tab: 'cars' | 'upgrades') => {
    soundEngine.unlock();
    soundEngine.playButton();
    setGarageInitialTab(tab);
    const s = saveRef.current;
    const car = RACING_CARS.find((c) => c.id === s.selectedCarId) ?? RACING_CARS[0];
    engineRef.current?.setupShowroom(car, s.settings.selectedMap);
    setScreen(tab === 'cars' ? 'CARS' : 'GARAGE');
  }, []);

  const handlePreviewCar = useCallback((carId: string) => {
    soundEngine.playButton();
    const car = RACING_CARS.find((c) => c.id === carId) ?? RACING_CARS[0];
    engineRef.current?.setupShowroom(car, saveRef.current.settings.selectedMap);
  }, []);

  const handleSelectCar = useCallback((carId: string) => {
    soundEngine.playButton();
    setSaveData((prev) => ({
      ...prev,
      selectedCarId: carId,
    }));
    const car = RACING_CARS.find((c) => c.id === carId) ?? RACING_CARS[0];
    engineRef.current?.setupShowroom(car, saveRef.current.settings.selectedMap);
  }, []);

  const handleUnlockCar = useCallback((car: CarSpec): boolean => {
    if (saveRef.current.coins < car.price) return false;
    soundEngine.playUnlock();
    setSaveData((prev) => {
      if (prev.coins < car.price || prev.unlockedCarIds.includes(car.id)) return prev;
      return {
        ...prev,
        coins: prev.coins - car.price,
        unlockedCarIds: [...prev.unlockedCarIds, car.id],
        selectedCarId: car.id,
      };
    });
    engineRef.current?.setupShowroom(car, saveRef.current.settings.selectedMap);
    return true;
  }, []);

  const handleUpgradeCar = useCallback(
    (carId: string, stat: keyof CarUpgrades, cost: number): boolean => {
      if (saveRef.current.coins < cost) return false;
      soundEngine.playUnlock();
      setSaveData((prev) => {
        if (prev.coins < cost) return prev;
        const cur = getCarUpgrades(prev, carId);
        if (cur[stat] >= 5) return prev;
        return {
          ...prev,
          coins: prev.coins - cost,
          carUpgrades: {
            ...prev.carUpgrades,
            [carId]: {
              ...cur,
              [stat]: cur[stat] + 1,
            },
          },
        };
      });
      return true;
    },
    []
  );

  const handleUpdateSettings = useCallback((next: GameSettings) => {
    soundEngine.playButton();
    setSaveData((prev) => ({
      ...prev,
      settings: next,
    }));
    engineRef.current?.setQuality(next.quality);
  }, []);

  const handleSelectMap = useCallback((map: MapId) => {
    soundEngine.playButton();
    setSaveData((prev) => ({
      ...prev,
      settings: { ...prev.settings, selectedMap: map },
    }));
    const car =
      RACING_CARS.find((c) => c.id === saveRef.current.selectedCarId) ?? RACING_CARS[0];
    engineRef.current?.setupShowroom(car, map);
  }, []);

  const handleSelectMode = useCallback((mode: RaceModeId) => {
    soundEngine.playButton();
    setSaveData((prev) => ({
      ...prev,
      settings: { ...prev.settings, selectedMode: mode },
    }));
  }, []);

  const handleSelectDifficulty = useCallback((difficulty: AIDifficulty) => {
    soundEngine.playButton();
    setSaveData((prev) => ({
      ...prev,
      settings: { ...prev.settings, difficulty },
    }));
  }, []);

  const championshipStandings = useMemo(() => {
    return Object.entries(champPoints)
      .map(([name, points]) => ({
        name,
        points,
        isPlayer: name === 'You',
      }))
      .sort((a, b) => b.points - a.points);
  }, [champPoints]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      {/* Dedicated Isolated 3D WebGL Mount */}
      <div ref={canvasMountRef} className="fixed inset-0 z-0" />

      {screen === 'SPLASH' && (
        <SplashScreen
          onDone={() => {
            soundEngine.unlock();
            setScreen('MENU');
          }}
        />
      )}

      {screen === 'MENU' && (
        <MainMenu
          coins={saveData.coins}
          wins={saveData.wins}
          selectedCar={selectedCar}
          selectedMode={selectedModeMeta}
          selectedMap={selectedMapMeta}
          onPlay={() => launchRace()}
          onOpenGarage={() => handleOpenGarageOrCars('upgrades')}
          onOpenCars={() => handleOpenGarageOrCars('cars')}
          onOpenModes={() => {
            soundEngine.unlock();
            soundEngine.playButton();
            setScreen('MODES');
          }}
          onOpenSettings={() => {
            soundEngine.unlock();
            soundEngine.playButton();
            setSettingsReturnScreen('MENU');
            setSettingsTab('general');
            setScreen('SETTINGS');
          }}
          onOpenAndroidGuide={() => {
            soundEngine.unlock();
            soundEngine.playButton();
            setSettingsReturnScreen('MENU');
            setSettingsTab('android');
            setScreen('SETTINGS');
          }}
          onExit={() => {
            soundEngine.playButton();
            setScreen('EXIT');
          }}
        />
      )}

      {screen === 'MODES' && (
        <ModesModal
          selectedMode={saveData.settings.selectedMode}
          selectedMap={saveData.settings.selectedMap}
          difficulty={saveData.settings.difficulty}
          onSelectMode={handleSelectMode}
          onSelectMap={handleSelectMap}
          onSelectDifficulty={handleSelectDifficulty}
          onStartRace={() => launchRace()}
          onBack={() => {
            soundEngine.playButton();
            setScreen('MENU');
          }}
        />
      )}

      {(screen === 'GARAGE' || screen === 'CARS') && (
        <GarageModal
          initialTab={garageInitialTab}
          coins={saveData.coins}
          unlockedCarIds={saveData.unlockedCarIds}
          selectedCarId={saveData.selectedCarId}
          carUpgrades={saveData.carUpgrades}
          onPreviewCar={handlePreviewCar}
          onSelectCar={handleSelectCar}
          onUnlockCar={handleUnlockCar}
          onUpgradeCar={handleUpgradeCar}
          onBack={handleReturnToMenu}
          onPlayNow={() => launchRace()}
        />
      )}

      {screen === 'RACING' && (
        <RaceHUD
          mode={saveData.settings.selectedMode}
          telemetry={telemetry}
          soundEnabled={saveData.settings.soundEnabled}
          onPause={() => {
            soundEngine.playButton();
            engineRef.current?.setPaused(true);
            setScreen('PAUSED');
          }}
          onToggleSound={() => {
            soundEngine.unlock();
            setSaveData((prev) => ({
              ...prev,
              settings: {
                ...prev.settings,
                soundEnabled: !prev.settings.soundEnabled,
              },
            }));
          }}
          onControl={(c, active) => engineRef.current?.setTouchInput(c, active)}
        />
      )}

      {screen === 'PAUSED' && (
        <PauseModal
          onResume={() => {
            soundEngine.unlock();
            soundEngine.playButton();
            engineRef.current?.setPaused(false);
            setScreen('RACING');
          }}
          onRestart={() =>
            launchRace(
              saveData.settings.selectedMode,
              saveData.settings.selectedMap,
              saveData.settings.selectedMode === 'championship' ? champRound : undefined
            )
          }
          onSettings={() => {
            soundEngine.playButton();
            setSettingsReturnScreen('PAUSED');
            setSettingsTab('general');
            setScreen('SETTINGS');
          }}
          onHome={handleReturnToMenu}
        />
      )}

      {screen === 'RESULTS' && lastResult && (
        <ResultsModal
          result={lastResult}
          championshipActive={lastResult.mode === 'championship'}
          championshipRound={champRound}
          championshipTotalRounds={CHAMPIONSHIP_TOUR.length}
          championshipStandings={championshipStandings}
          onNextChampionshipRound={() => {
            const nextRound = champRound + 1;
            setChampRound(nextRound);
            launchRace('championship', undefined, nextRound);
          }}
          onRestart={() =>
            launchRace(
              lastResult.mode,
              lastResult.map,
              lastResult.mode === 'championship' ? 1 : undefined
            )
          }
          onGarage={() => handleOpenGarageOrCars('upgrades')}
          onMainMenu={handleReturnToMenu}
        />
      )}

      {screen === 'SETTINGS' && (
        <SettingsModal
          settings={saveData.settings}
          initialTab={settingsTab}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => {
            soundEngine.playButton();
            setScreen(settingsReturnScreen);
          }}
        />
      )}

      {screen === 'EXIT' && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/94 p-6 text-center">
          <SSLogo />
          <p className="mt-6 max-w-sm text-sm text-slate-300">
            Thanks for playing <strong className="text-white">S&amp;S Racing</strong>! Your coins,
            unlocked cars, and upgrades are saved automatically.
          </p>
          <button
            type="button"
            onClick={() => {
              soundEngine.playButton();
              setScreen('MENU');
            }}
            className="mt-6 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 px-8 py-3 font-display text-lg font-bold uppercase tracking-wider text-white shadow-lg hover:brightness-110 active:scale-95 transition"
          >
            Return to Menu
          </button>
        </div>
      )}
    </div>
  );
}
