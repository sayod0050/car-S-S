export type CarCategory =
  | 'Sports'
  | 'Supercar'
  | 'Muscle'
  | 'Drift'
  | 'Police'
  | 'SUV'
  | 'Race';

export type CarBodyStyle =
  | 'sports'
  | 'supercar'
  | 'muscle'
  | 'drift'
  | 'police'
  | 'suv'
  | 'race';

export type RaceModeId =
  | 'quick'
  | 'circuit'
  | 'drag'
  | 'timetrial'
  | 'drift'
  | 'championship';

export type MapId = 'city' | 'desert' | 'mountain' | 'forest' | 'night';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export type GraphicsQuality = 'high' | 'low';

export type GameScreen =
  | 'SPLASH'
  | 'MENU'
  | 'MODES'
  | 'GARAGE'
  | 'CARS'
  | 'SETTINGS'
  | 'RACING'
  | 'PAUSED'
  | 'RESULTS'
  | 'EXIT';

export interface CarSpec {
  id: string;
  name: string;
  category: CarCategory;
  bodyStyle: CarBodyStyle;
  price: number;
  primaryColor: string;
  accentColor: string;
  trimColor: string;
  topSpeedKmh: number;
  speedStat: number;
  accelStat: number;
  handlingStat: number;
  driftFactor: number;
}

export interface CarUpgrades {
  engine: number; // 1..5
  turbo: number;  // 1..5
  tires: number;  // 1..5
  nitro: number;  // 1..5
}

export const DEFAULT_UPGRADES: CarUpgrades = {
  engine: 1,
  turbo: 1,
  tires: 1,
  nitro: 1,
};

export const RACING_CARS: CarSpec[] = [
  // 1. Starter Free Sports Car
  {
    id: 'ss_coupe',
    name: 'S&S Velocity',
    category: 'Sports',
    bodyStyle: 'sports',
    price: 0,
    primaryColor: '#ef4444',
    accentColor: '#ffffff',
    trimColor: '#1e293b',
    topSpeedKmh: 215,
    speedStat: 62,
    accelStat: 64,
    handlingStat: 68,
    driftFactor: 1.0,
  },
  // 2. Sports Car
  {
    id: 'apex_gts',
    name: 'Apex GT-S',
    category: 'Sports',
    bodyStyle: 'sports',
    price: 220,
    primaryColor: '#2563eb',
    accentColor: '#38bdf8',
    trimColor: '#0f172a',
    topSpeedKmh: 236,
    speedStat: 70,
    accelStat: 72,
    handlingStat: 74,
    driftFactor: 1.05,
  },
  // 3. Drift Car 1
  {
    id: 'tokyo_slide',
    name: 'Tokyo Slide R',
    category: 'Drift',
    bodyStyle: 'drift',
    price: 380,
    primaryColor: '#10b981',
    accentColor: '#0f172a',
    trimColor: '#18181b',
    topSpeedKmh: 242,
    speedStat: 72,
    accelStat: 75,
    handlingStat: 86,
    driftFactor: 1.38,
  },
  // 4. Muscle Car 1
  {
    id: 'iron_v8',
    name: 'Iron V8 Muscle',
    category: 'Muscle',
    bodyStyle: 'muscle',
    price: 520,
    primaryColor: '#f59e0b',
    accentColor: '#111827',
    trimColor: '#1f2937',
    topSpeedKmh: 254,
    speedStat: 78,
    accelStat: 80,
    handlingStat: 66,
    driftFactor: 1.18,
  },
  // 5. SUV 1
  {
    id: 'titan_suv',
    name: 'Titan Trail SUV',
    category: 'SUV',
    bodyStyle: 'suv',
    price: 640,
    primaryColor: '#475569',
    accentColor: '#f97316',
    trimColor: '#0f172a',
    topSpeedKmh: 228,
    speedStat: 68,
    accelStat: 70,
    handlingStat: 76,
    driftFactor: 0.9,
  },
  // 6. Drift Car 2
  {
    id: 'kyoto_pro',
    name: 'Kyoto Drift Pro',
    category: 'Drift',
    bodyStyle: 'drift',
    price: 800,
    primaryColor: '#d946ef',
    accentColor: '#22d3ee',
    trimColor: '#090d16',
    topSpeedKmh: 262,
    speedStat: 79,
    accelStat: 82,
    handlingStat: 92,
    driftFactor: 1.5,
  },
  // 7. Police Car 1
  {
    id: 'metro_pd',
    name: 'Metro Cruiser PD',
    category: 'Police',
    bodyStyle: 'police',
    price: 950,
    primaryColor: '#0f172a',
    accentColor: '#f8fafc',
    trimColor: '#1e293b',
    topSpeedKmh: 270,
    speedStat: 82,
    accelStat: 84,
    handlingStat: 80,
    driftFactor: 1.1,
  },
  // 8. Muscle Car 2
  {
    id: 'hellfire_ss',
    name: 'S&S Hellfire V8',
    category: 'Muscle',
    bodyStyle: 'muscle',
    price: 1150,
    primaryColor: '#dc2626',
    accentColor: '#facc15',
    trimColor: '#111827',
    topSpeedKmh: 282,
    speedStat: 86,
    accelStat: 88,
    handlingStat: 74,
    driftFactor: 1.22,
  },
  // 9. SUV 2
  {
    id: 'apex_g63',
    name: 'Apex G-Force SUV',
    category: 'SUV',
    bodyStyle: 'suv',
    price: 1350,
    primaryColor: '#090d16',
    accentColor: '#e2e8f0',
    trimColor: '#334155',
    topSpeedKmh: 264,
    speedStat: 80,
    accelStat: 83,
    handlingStat: 82,
    driftFactor: 0.96,
  },
  // 10. Police Car 2
  {
    id: 'enforcer_gt',
    name: 'Highway Enforcer',
    category: 'Police',
    bodyStyle: 'police',
    price: 1600,
    primaryColor: '#1e3a8a',
    accentColor: '#ffffff',
    trimColor: '#0f172a',
    topSpeedKmh: 295,
    speedStat: 89,
    accelStat: 90,
    handlingStat: 87,
    driftFactor: 1.15,
  },
  // 11. Supercar 1
  {
    id: 'valkyrie_720',
    name: 'Valkyrie 720',
    category: 'Supercar',
    bodyStyle: 'supercar',
    price: 1900,
    primaryColor: '#f8fafc',
    accentColor: '#ff5500',
    trimColor: '#0f172a',
    topSpeedKmh: 310,
    speedStat: 92,
    accelStat: 91,
    handlingStat: 90,
    driftFactor: 1.12,
  },
  // 12. Supercar 2
  {
    id: 'obsidian_sv',
    name: 'Obsidian SV',
    category: 'Supercar',
    bodyStyle: 'supercar',
    price: 2500,
    primaryColor: '#111827',
    accentColor: '#facc15',
    trimColor: '#1e293b',
    topSpeedKmh: 326,
    speedStat: 95,
    accelStat: 94,
    handlingStat: 92,
    driftFactor: 1.15,
  },
  // 13. Race Car 1
  {
    id: 'ss_gt3',
    name: 'S&S GT3 Cup',
    category: 'Race',
    bodyStyle: 'race',
    price: 3200,
    primaryColor: '#f1f5f9',
    accentColor: '#06b6d4',
    trimColor: '#0f172a',
    topSpeedKmh: 340,
    speedStat: 97,
    accelStat: 96,
    handlingStat: 96,
    driftFactor: 1.2,
  },
  // 14. Race Car 2 (Ultimate Hyper-Racer)
  {
    id: 'ss_formula_x',
    name: 'S&S Formula Apex',
    category: 'Race',
    bodyStyle: 'race',
    price: 4500,
    primaryColor: '#06b6d4',
    accentColor: '#f97316',
    trimColor: '#090d16',
    topSpeedKmh: 362,
    speedStat: 100,
    accelStat: 99,
    handlingStat: 99,
    driftFactor: 1.25,
  },
];

export interface ModeMeta {
  id: RaceModeId;
  name: string;
  tagline: string;
  lapsLabel: string;
  rewardHint: string;
}

export const RACE_MODES: ModeMeta[] = [
  {
    id: 'quick',
    name: 'Quick Race',
    tagline: '1-lap sprint against 5 AI racers.',
    lapsLabel: '1 Lap · 6 Cars',
    rewardHint: 'Up to 180 Coins',
  },
  {
    id: 'circuit',
    name: 'Circuit Race',
    tagline: '3-lap championship circuit battle.',
    lapsLabel: '3 Laps · 6 Cars',
    rewardHint: 'Up to 320 Coins',
  },
  {
    id: 'drag',
    name: 'Drag Race',
    tagline: 'Straight-line full-throttle speed duel!',
    lapsLabel: '620m Strip · 1v1',
    rewardHint: 'Up to 220 Coins',
  },
  {
    id: 'timetrial',
    name: 'Time Trial',
    tagline: 'Beat the target clock across 2 solo laps.',
    lapsLabel: '2 Laps · Solo',
    rewardHint: 'Up to 260 Coins',
  },
  {
    id: 'drift',
    name: 'Drift Mode',
    tagline: 'Slide corners for 60s & rack up drift points!',
    lapsLabel: '60s · Smoke & Style',
    rewardHint: 'Up to 300 Coins',
  },
  {
    id: 'championship',
    name: 'Championship',
    tagline: '3-round tour across City, Mountain & Night!',
    lapsLabel: '3 Races · Cup Tour',
    rewardHint: 'Up to 750 Coins',
  },
];

export interface MapMeta {
  id: MapId;
  name: string;
  subtitle: string;
  badgeColor: string;
}

export const RACE_MAPS: MapMeta[] = [
  { id: 'city', name: 'Metro City', subtitle: 'Sunlit glass skyline & urban expressway', badgeColor: '#38bdf8' },
  { id: 'desert', name: 'Sunburst Desert', subtitle: 'Red-rock canyon sands & open heat', badgeColor: '#f59e0b' },
  { id: 'mountain', name: 'Alpine Ridge', subtitle: 'Crisp mountain peaks & scenic bends', badgeColor: '#94a3b8' },
  { id: 'forest', name: 'Emerald Forest', subtitle: 'Lush pine canopy & woodland curves', badgeColor: '#22c55e' },
  { id: 'night', name: 'Night Highway', subtitle: 'Neon skyline, streetlights & headlights', badgeColor: '#818cf8' },
];

export const CHAMPIONSHIP_TOUR: MapId[] = ['city', 'mountain', 'night'];

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  quality: GraphicsQuality;
  difficulty: AIDifficulty;
  selectedMode: RaceModeId;
  selectedMap: MapId;
}

export interface SaveData {
  coins: number;
  wins: number;
  totalRaces: number;
  championshipWins: number;
  unlockedCarIds: string[];
  selectedCarId: string;
  carUpgrades: Record<string, CarUpgrades>;
  settings: GameSettings;
}

export interface RaceTelemetry {
  countdownText: string;
  countdownPhase: number; // 3, 2, 1, 0 (GO), -1 (racing)
  speedKmh: number;
  position: number;
  totalCars: number;
  lap: number;
  totalLaps: number;
  elapsedSec: number;
  timeLimitSec: number;
  nitroCharge: number;
  isBoosting: boolean;
  isDrifting: boolean;
  driftPoints: number;
  activeDriftCombo: number;
  trackProgressPct: number;
}

export interface RaceResult {
  mode: RaceModeId;
  map: MapId;
  position: number;
  totalCars: number;
  finishTimeSec: number;
  driftPoints: number;
  targetBeat: boolean;
  baseReward: number;
  driftBonus: number;
  challengeBonus: number;
  totalCoinsEarned: number;
  championshipRound?: number;
  championshipPointsAwarded?: number;
  championshipStandings?: { name: string; points: number; isPlayer: boolean }[];
}
