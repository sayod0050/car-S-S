export type GameMode =
  | 'TITLE'
  | 'PLAYING'
  | 'PAUSED'
  | 'GARAGE'
  | 'SETTINGS'
  | 'GAMEOVER';

export type GraphicsQuality = 'high' | 'low';

export type CarBodyStyle = 'viper' | 'drift' | 'muscle' | 'exotic' | 'hyper';

export interface CarSpec {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  bodyStyle: CarBodyStyle;
  primaryColor: string;
  accentColor: string;
  trimColor: string;
  topSpeedKmh: number;
  /** 1-100 rating bars for UI */
  speedStat: number;
  handlingStat: number;
  accelStat: number;
  /** Physics multipliers */
  speedMultiplier: number;
  laneSnapSpeed: number;
  nitroDrainRate: number;
}

export const GARAGE_CARS: CarSpec[] = [
  {
    id: 'apex_viper',
    name: 'Apex Viper',
    subtitle: 'Starter Street Coupe',
    price: 0,
    bodyStyle: 'viper',
    primaryColor: '#ef4444',
    accentColor: '#ffffff',
    trimColor: '#1e293b',
    topSpeedKmh: 225,
    speedStat: 64,
    handlingStat: 70,
    accelStat: 66,
    speedMultiplier: 1.0,
    laneSnapSpeed: 13.5,
    nitroDrainRate: 28,
  },
  {
    id: 'cobalt_drift',
    name: 'Cobalt Drift',
    subtitle: 'Agile JDM Tuner',
    price: 150,
    bodyStyle: 'drift',
    primaryColor: '#2563eb',
    accentColor: '#38bdf8',
    trimColor: '#0f172a',
    topSpeedKmh: 245,
    speedStat: 74,
    handlingStat: 88,
    accelStat: 76,
    speedMultiplier: 1.08,
    laneSnapSpeed: 16.5,
    nitroDrainRate: 25,
  },
  {
    id: 'solar_muscle',
    name: 'Solar Muscle',
    subtitle: 'Supercharged V8',
    price: 350,
    bodyStyle: 'muscle',
    primaryColor: '#f59e0b',
    accentColor: '#111827',
    trimColor: '#1f2937',
    topSpeedKmh: 265,
    speedStat: 84,
    handlingStat: 74,
    accelStat: 82,
    speedMultiplier: 1.15,
    laneSnapSpeed: 14.5,
    nitroDrainRate: 20,
  },
  {
    id: 'phantom_gt',
    name: 'Phantom GT',
    subtitle: 'Aero Carbon Exotic',
    price: 700,
    bodyStyle: 'exotic',
    primaryColor: '#e2e8f0',
    accentColor: '#ff5500',
    trimColor: '#0f172a',
    topSpeedKmh: 290,
    speedStat: 92,
    handlingStat: 91,
    accelStat: 90,
    speedMultiplier: 1.24,
    laneSnapSpeed: 18.0,
    nitroDrainRate: 22,
  },
  {
    id: 'hyperion_x',
    name: 'Hyperion X',
    subtitle: 'Apex Prototype Hypercar',
    price: 1200,
    bodyStyle: 'hyper',
    primaryColor: '#0f172a',
    accentColor: '#06b6d4',
    trimColor: '#1e293b',
    topSpeedKmh: 320,
    speedStat: 99,
    handlingStat: 97,
    accelStat: 98,
    speedMultiplier: 1.34,
    laneSnapSpeed: 20.5,
    nitroDrainRate: 18,
  },
];

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  quality: GraphicsQuality;
  showTapControls: boolean;
}

export interface SaveData {
  coins: number;
  highScore: number;
  bestDistance: number;
  unlockedCarIds: string[];
  selectedCarId: string;
  settings: GameSettings;
}

export interface RunTelemetry {
  score: number;
  distanceMeters: number;
  runCoins: number;
  speedKmh: number;
  nitroCharge: number;
  isBoosting: boolean;
  isBraking: boolean;
  nearMissCount: number;
  nearMissPopupId: number;
  coinPopupId: number;
}

export interface GameOverSummary {
  finalScore: number;
  isNewBest: boolean;
  coinsEarned: number;
  distanceMeters: number;
  topSpeedKmh: number;
  nearMissCount: number;
}
