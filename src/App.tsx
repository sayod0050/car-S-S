/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { soundEngine } from './audio/soundEngine';
import { GameHUD } from './components/GameHUD';
import { GameOverModal } from './components/GameOverModal';
import { GarageModal } from './components/GarageModal';
import { PauseModal } from './components/PauseModal';
import { SettingsModal } from './components/SettingsModal';
import { TitleScreen } from './components/TitleScreen';
import { StreetRushEngine } from './game/StreetRushEngine';
import {
  CarSpec,
  GARAGE_CARS,
  GameMode,
  GameOverSummary,
  GameSettings,
  RunTelemetry,
  SaveData,
} from './types/game';
import { loadSaveData, persistSaveData } from './utils/storage';

const INITIAL_TELEMETRY: RunTelemetry = {
  score: 0,
  distanceMeters: 0,
  runCoins: 0,
  speedKmh: 0,
  nitroCharge: 100,
  isBoosting: false,
  isBraking: false,
  nearMissCount: 0,
  nearMissPopupId: 0,
  coinPopupId: 0,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<StreetRushEngine | null>(null);

  const [saveData, setSaveData] = useState<SaveData>(() => loadSaveData());
  const [mode, setMode] = useState<GameMode>('TITLE');
  const [settingsReturnMode, setSettingsReturnMode] = useState<GameMode>('TITLE');
  const [settingsTab, setSettingsTab] = useState<'general' | 'android'>('general');
  const [telemetry, setTelemetry] = useState<RunTelemetry>(INITIAL_TELEMETRY);
  const [gameOverSummary, setGameOverSummary] = useState<GameOverSummary | null>(null);

  const saveDataRef = useRef(saveData);
  saveDataRef.current = saveData;

  const modeRef = useRef(mode);
  modeRef.current = mode;

  const selectedCar = useMemo(
    () => GARAGE_CARS.find((c) => c.id === saveData.selectedCarId) ?? GARAGE_CARS[0],
    [saveData.selectedCarId]
  );

  // Sync audio settings
  useEffect(() => {
    soundEngine.setSettings(saveData.settings.soundEnabled, saveData.settings.musicEnabled);
    persistSaveData(saveData);
  }, [saveData]);

  // Mount Three.js engine once
  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const initialSave = saveDataRef.current;
    const initialCar =
      GARAGE_CARS.find((c) => c.id === initialSave.selectedCarId) ?? GARAGE_CARS[0];

    const engine = new StreetRushEngine(
      mountEl,
      initialCar,
      initialSave.highScore,
      initialSave.settings.quality,
      {
        onTelemetry: (next) => {
          setTelemetry(next);
        },
        onGameOver: (summary) => {
          setSaveData((prev) => {
            const nextHigh = Math.max(prev.highScore, summary.finalScore);
            const nextBestDist = Math.max(prev.bestDistance, summary.distanceMeters);
            const nextCoins = prev.coins + summary.coinsEarned;
            return {
              ...prev,
              coins: nextCoins,
              highScore: nextHigh,
              bestDistance: nextBestDist,
            };
          });
          setGameOverSummary(summary);
          setMode('GAMEOVER');
        },
        onRequestPause: () => {
          if (modeRef.current === 'PLAYING') {
            engine.setMode('PAUSED');
            setMode('PAUSED');
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

  const handlePlay = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playButton();
    setGameOverSummary(null);
    engineRef.current?.selectCar(saveDataRef.current.selectedCarId);
    engineRef.current?.startNewRun();
    setMode('PLAYING');
  }, []);

  // Enter / Space shortcut on Title Screen
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (modeRef.current === 'TITLE' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        handlePlay();
      } else if (modeRef.current === 'PAUSED' && e.code === 'Escape') {
        e.preventDefault();
        soundEngine.playButton();
        engineRef.current?.setMode('PLAYING');
        setMode('PLAYING');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlePlay]);

  const handlePause = useCallback(() => {
    soundEngine.playButton();
    engineRef.current?.setMode('PAUSED');
    setMode('PAUSED');
  }, []);

  const handleResume = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playButton();
    engineRef.current?.setMode('PLAYING');
    setMode('PLAYING');
  }, []);

  const handleHome = useCallback(() => {
    soundEngine.playButton();
    setGameOverSummary(null);
    engineRef.current?.selectCar(saveDataRef.current.selectedCarId);
    engineRef.current?.setMode('TITLE');
    setMode('TITLE');
  }, []);

  const handleOpenGarage = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playButton();
    setGameOverSummary(null);
    engineRef.current?.selectCar(saveDataRef.current.selectedCarId);
    engineRef.current?.setMode('GARAGE');
    setMode('GARAGE');
  }, []);

  const handleOpenSettings = useCallback((from: GameMode, tab: 'general' | 'android' = 'general') => {
    soundEngine.unlock();
    soundEngine.playButton();
    setSettingsReturnMode(from);
    setSettingsTab(tab);
    engineRef.current?.setMode('SETTINGS');
    setMode('SETTINGS');
  }, []);

  const handleCloseSettings = useCallback(() => {
    soundEngine.playButton();
    engineRef.current?.setMode(settingsReturnMode);
    setMode(settingsReturnMode);
  }, [settingsReturnMode]);

  const handleUpdateSettings = useCallback((next: GameSettings) => {
    soundEngine.playButton();
    setSaveData((prev) => ({
      ...prev,
      settings: next,
    }));
    engineRef.current?.setQuality(next.quality);
  }, []);

  const handleToggleSoundQuick = useCallback(() => {
    soundEngine.unlock();
    setSaveData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        soundEnabled: !prev.settings.soundEnabled,
      },
    }));
  }, []);

  const handlePreviewCar = useCallback((carId: string) => {
    soundEngine.playButton();
    engineRef.current?.selectCar(carId);
  }, []);

  const handleSelectCar = useCallback((carId: string) => {
    soundEngine.playButton();
    setSaveData((prev) => ({
      ...prev,
      selectedCarId: carId,
    }));
    engineRef.current?.selectCar(carId);
  }, []);

  const handleUnlockCar = useCallback((car: CarSpec): boolean => {
    if (saveDataRef.current.coins < car.price) {
      return false;
    }
    soundEngine.playUnlock();
    setSaveData((prev) => {
      if (prev.coins < car.price || prev.unlockedCarIds.includes(car.id)) {
        return prev;
      }
      return {
        ...prev,
        coins: prev.coins - car.price,
        unlockedCarIds: [...prev.unlockedCarIds, car.id],
        selectedCarId: car.id,
      };
    });
    engineRef.current?.selectCar(car.id);
    return true;
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      {/* Dedicated Isolated WebGL Container */}
      <div ref={canvasMountRef} className="fixed inset-0 z-0" />

      {/* Title Screen */}
      {mode === 'TITLE' && (
        <TitleScreen
          highScore={saveData.highScore}
          coins={saveData.coins}
          selectedCar={selectedCar}
          onPlay={handlePlay}
          onOpenGarage={handleOpenGarage}
          onOpenSettings={() => handleOpenSettings('TITLE', 'general')}
          onOpenAndroidGuide={() => handleOpenSettings('TITLE', 'android')}
        />
      )}

      {/* Active Gameplay HUD */}
      {mode === 'PLAYING' && (
        <GameHUD
          telemetry={telemetry}
          highScore={saveData.highScore}
          totalBankCoins={saveData.coins}
          soundEnabled={saveData.settings.soundEnabled}
          showTapControls={saveData.settings.showTapControls}
          onPause={handlePause}
          onToggleSound={handleToggleSoundQuick}
          onSteerLeft={() => engineRef.current?.steerLeft()}
          onSteerRight={() => engineRef.current?.steerRight()}
          onBoostStart={() => engineRef.current?.setHeldBoost(true)}
          onBoostEnd={() => engineRef.current?.setHeldBoost(false)}
          onBrakeStart={() => engineRef.current?.setHeldBrake(true)}
          onBrakeEnd={() => engineRef.current?.setHeldBrake(false)}
        />
      )}

      {/* 3D Garage Showroom */}
      {mode === 'GARAGE' && (
        <GarageModal
          coins={saveData.coins}
          unlockedCarIds={saveData.unlockedCarIds}
          selectedCarId={saveData.selectedCarId}
          onPreviewCar={handlePreviewCar}
          onSelectCar={handleSelectCar}
          onUnlockCar={handleUnlockCar}
          onBack={handleHome}
          onPlayWithSelected={handlePlay}
        />
      )}

      {/* Pause Overlay */}
      {mode === 'PAUSED' && (
        <PauseModal
          onResume={handleResume}
          onRestart={handlePlay}
          onSettings={() => handleOpenSettings('PAUSED', 'general')}
          onHome={handleHome}
        />
      )}

      {/* Game Over Screen */}
      {mode === 'GAMEOVER' && gameOverSummary && (
        <GameOverModal
          summary={gameOverSummary}
          highScore={saveData.highScore}
          onRestart={handlePlay}
          onHome={handleHome}
          onOpenGarage={handleOpenGarage}
        />
      )}

      {/* Settings & Android APK Guide Modal */}
      {mode === 'SETTINGS' && (
        <SettingsModal
          settings={saveData.settings}
          initialTab={settingsTab}
          onUpdateSettings={handleUpdateSettings}
          onClose={handleCloseSettings}
        />
      )}
    </div>
  );
}
