import { CarUpgrades, DEFAULT_UPGRADES, RACING_CARS, SaveData } from '../types/game';

const STORAGE_KEY = 'sns_racing_save_v1';

export const DEFAULT_SAVE_DATA: SaveData = {
  coins: 0,
  wins: 0,
  totalRaces: 0,
  championshipWins: 0,
  unlockedCarIds: [RACING_CARS[0].id],
  selectedCarId: RACING_CARS[0].id,
  carUpgrades: {},
  settings: {
    soundEnabled: true,
    musicEnabled: true,
    quality: 'high',
    difficulty: 'medium',
    selectedMode: 'quick',
    selectedMap: 'city',
  },
};

export function getCarUpgrades(save: SaveData, carId: string): CarUpgrades {
  const u = save.carUpgrades[carId];
  if (!u) return { ...DEFAULT_UPGRADES };
  return {
    engine: clampLvl(u.engine),
    turbo: clampLvl(u.turbo),
    tires: clampLvl(u.tires),
    nitro: clampLvl(u.nitro),
  };
}

function clampLvl(v: unknown): number {
  if (typeof v !== 'number' || Number.isNaN(v)) return 1;
  return Math.max(1, Math.min(5, Math.floor(v)));
}

export function loadSaveData(): SaveData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_SAVE_DATA);
    const parsed = JSON.parse(raw) as Partial<SaveData>;

    const validIds = new Set(RACING_CARS.map((c) => c.id));
    const unlocked = Array.isArray(parsed.unlockedCarIds)
      ? parsed.unlockedCarIds.filter((id) => validIds.has(id))
      : [];
    if (!unlocked.includes(RACING_CARS[0].id)) {
      unlocked.unshift(RACING_CARS[0].id);
    }

    const selected =
      typeof parsed.selectedCarId === 'string' && unlocked.includes(parsed.selectedCarId)
        ? parsed.selectedCarId
        : RACING_CARS[0].id;

    return {
      coins: typeof parsed.coins === 'number' && parsed.coins >= 0 ? Math.floor(parsed.coins) : 0,
      wins: typeof parsed.wins === 'number' && parsed.wins >= 0 ? Math.floor(parsed.wins) : 0,
      totalRaces:
        typeof parsed.totalRaces === 'number' && parsed.totalRaces >= 0
          ? Math.floor(parsed.totalRaces)
          : 0,
      championshipWins:
        typeof parsed.championshipWins === 'number' && parsed.championshipWins >= 0
          ? Math.floor(parsed.championshipWins)
          : 0,
      unlockedCarIds: Array.from(new Set(unlocked)),
      selectedCarId: selected,
      carUpgrades: parsed.carUpgrades && typeof parsed.carUpgrades === 'object' ? parsed.carUpgrades : {},
      settings: {
        soundEnabled: parsed.settings?.soundEnabled ?? true,
        musicEnabled: parsed.settings?.musicEnabled ?? true,
        quality: parsed.settings?.quality === 'low' ? 'low' : 'high',
        difficulty:
          parsed.settings?.difficulty === 'easy' || parsed.settings?.difficulty === 'hard'
            ? parsed.settings.difficulty
            : 'medium',
        selectedMode: parsed.settings?.selectedMode ?? 'quick',
        selectedMap: parsed.settings?.selectedMap ?? 'city',
      },
    };
  } catch {
    return structuredClone(DEFAULT_SAVE_DATA);
  }
}

export function persistSaveData(data: SaveData): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore private mode storage errors
  }
}
