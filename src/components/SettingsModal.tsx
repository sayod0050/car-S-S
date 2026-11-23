import React, { useState } from 'react';
import { Cpu, Music, ShieldAlert, Smartphone, Volume2, X } from 'lucide-react';
import { AIDifficulty, GameSettings } from '../types/game';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsModalProps {
  settings: GameSettings;
  initialTab?: 'general' | 'android';
  onUpdateSettings: (next: GameSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  initialTab = 'general',
  onUpdateSettings,
  onClose,
}) => {
  const [tab, setTab] = useState<'general' | 'android'>(initialTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/84 p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-white/15 p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="font-display text-2xl font-bold uppercase text-white">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-950 p-1">
          <button
            type="button"
            onClick={() => setTab('general')}
            className={`rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition ${
              tab === 'general' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Game &amp; Audio
          </button>
          <button
            type="button"
            onClick={() => setTab('android')}
            className={`rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition ${
              tab === 'android' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Android APK Guide
          </button>
        </div>

        {tab === 'general' ? (
          <div className="mt-4 flex flex-col gap-3">
            {/* Sound */}
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({ ...settings, soundEnabled: !settings.soundEnabled })
              }
              className="flex items-center justify-between rounded-xl bg-slate-800/80 border border-white/10 px-4 py-3 text-left hover:bg-slate-800 transition"
            >
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-orange-400" />
                <div>
                  <div className="text-sm font-bold text-white">Sound Effects</div>
                  <div className="text-xs text-slate-400">Engine, Drift Smoke, Nitro &amp; Crash</div>
                </div>
              </div>
              <span
                className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase ${
                  settings.soundEnabled
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {settings.soundEnabled ? 'On' : 'Off'}
              </span>
            </button>

            {/* Music */}
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({ ...settings, musicEnabled: !settings.musicEnabled })
              }
              className="flex items-center justify-between rounded-xl bg-slate-800/80 border border-white/10 px-4 py-3 text-left hover:bg-slate-800 transition"
            >
              <div className="flex items-center gap-3">
                <Music className="w-5 h-5 text-cyan-400" />
                <div>
                  <div className="text-sm font-bold text-white">Racing Music</div>
                  <div className="text-xs text-slate-400">Arcade synth soundtrack</div>
                </div>
              </div>
              <span
                className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase ${
                  settings.musicEnabled
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {settings.musicEnabled ? 'On' : 'Off'}
              </span>
            </button>

            {/* AI Difficulty */}
            <div className="rounded-xl bg-slate-800/80 border border-white/10 p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <div className="text-sm font-bold text-white">AI Opponent Difficulty</div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'hard'] as AIDifficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, difficulty: d })}
                    className={`rounded-lg py-2 text-xs font-bold uppercase transition ${
                      settings.difficulty === d
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Graphics Quality */}
            <div className="rounded-xl bg-slate-800/80 border border-white/10 p-4">
              <div className="flex items-center gap-3 mb-2.5">
                <Cpu className="w-5 h-5 text-sky-400" />
                <div>
                  <div className="text-sm font-bold text-white">Graphics Quality</div>
                  <div className="text-xs text-slate-400">Optimized for Android phones</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, quality: 'high' })}
                  className={`rounded-lg py-2 text-xs font-bold uppercase transition ${
                    settings.quality === 'high'
                      ? 'bg-sky-500 text-slate-950'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  High (Shadows)
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, quality: 'low' })}
                  className={`rounded-lg py-2 text-xs font-bold uppercase transition ${
                    settings.quality === 'low'
                      ? 'bg-sky-500 text-slate-950'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Eco (60fps)
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3 text-xs text-slate-300 leading-relaxed">
            <div className="rounded-xl bg-slate-800/80 border border-white/10 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white mb-1.5">
                <Smartphone className="w-4 h-4 text-sky-400" />
                Instant Android PWA Install
              </div>
              <p>
                Open <strong>S&amp;S Racing</strong> in Chrome on Android and tap{' '}
                <strong>Install Android App</strong> for offline fullscreen play.
              </p>
              <div className="mt-3">
                <PWAInstallButton onOpenAndroidGuide={() => setTab('android')} />
              </div>
            </div>

            <div className="rounded-xl bg-slate-950 border border-white/10 p-4">
              <div className="text-sm font-bold text-white mb-1.5">
                Auto-Build APK via GitHub Releases
              </div>
              <p className="text-slate-400 mb-2">
                Push this project to GitHub and{' '}
                <code className="text-sky-300">.github/workflows/android-apk-release.yml</code>{' '}
                automatically builds and publishes{' '}
                <code className="text-emerald-300">SS-Racing-release.apk</code> &amp;{' '}
                <code className="text-emerald-300">SS-Racing-debug.apk</code> under{' '}
                <strong className="text-white">Releases</strong> for 1-tap Android download.
              </p>
              <pre className="overflow-x-auto rounded-lg bg-slate-900 p-2.5 text-[11px] text-emerald-300 font-mono">
{`# Or run local build script:
bash scripts/build-android.sh`}
              </pre>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-orange-500 py-3 font-display text-sm font-bold uppercase tracking-wider text-white hover:bg-orange-400 active:scale-95 transition"
        >
          Done
        </button>
      </div>
    </div>
  );
};
