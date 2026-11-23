import React, { useEffect, useState } from 'react';
import { SSLogo } from './SSLogo';

interface SplashScreenProps {
  onDone: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onDone }) => {
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    const t1 = window.setTimeout(() => setProgress(65), 250);
    const t2 = window.setTimeout(() => setProgress(100), 650);
    const t3 = window.setTimeout(onDone, 1050);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onDone]);

  return (
    <div
      onClick={onDone}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 p-6 cursor-pointer"
    >
      <SSLogo />

      <div className="mt-10 w-64 max-w-[80vw]">
        <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
          <span>Loading 3D Track</span>
          <span className="tabular-nums text-cyan-300">{progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800 border border-white/10">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-orange-500 to-amber-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 text-center text-[11px] text-slate-500">
          Tap anywhere to enter
        </p>
      </div>
    </div>
  );
};
