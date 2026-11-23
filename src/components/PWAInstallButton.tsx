import React, { useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  onOpenAndroidGuide: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ onOpenAndroidGuide }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-lg hover:bg-sky-400 active:scale-95 transition"
      >
        <Download className="w-4 h-4" />
        Install Android App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-xl bg-slate-900/90 border border-white/15 px-3.5 py-2 text-xs font-semibold text-sky-300 hover:bg-slate-800 transition"
        >
          <Smartphone className="w-4 h-4" />
          Add to Home Screen
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/15 p-6 shadow-2xl">
              <h3 className="font-display text-xl font-bold text-white">Install on iPhone / iPad</h3>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                1. Tap the <strong className="text-white">Share</strong> button in the Safari toolbar.
                <br />
                2. Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-orange-500 py-2.5 text-sm font-bold text-white hover:bg-orange-400 transition"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpenAndroidGuide}
      className="flex items-center gap-2 rounded-xl bg-slate-900/90 border border-white/15 px-3.5 py-2 text-xs font-semibold text-sky-300 hover:bg-slate-800 active:scale-95 transition"
    >
      <Smartphone className="w-4 h-4" />
      Android APK & Install
    </button>
  );
};
