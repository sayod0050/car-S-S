import { GARAGE_CARS, SaveData } from '../types/game';

const STORAGE_KEY = 'street_rush_3d_save_v1';

export const DEFAULT_SAVE_DATA: SaveData = {
  coins: 0,
  highScore: 0,
  bestDistance: 0,
  unlockedCarIds: [GARAGE_CARS[0].id],
  selectedCarId: GARAGE_CARS[0].id,
  settings: {
    soundEnabled: true,
    musicEnabled: true,
    quality: 'high',
    showTapControls: false,
  },
};

export function loadSaveData(): SaveData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_SAVE_DATA);
    const parsed = JSON.parse(raw) as Partial<SaveData>;

    const validCarIds = new Set(GARAGE_CARS.map((c) => c.id));
    const unlocked = Array.isArray(parsed.unlockedCarIds)
      ? parsed.unlockedCarIds.filter((id) => validCarIds.has(id))
      : [];
    if (!unlocked.includes(GARAGE_CARS[0].id)) {
      unlocked.unshift(GARAGE_CARS[0].id);
    }

    const selected =
      typeof parsed.selectedCarId === 'string' && unlocked.includes(parsed.selectedCarId)
        ? parsed.selectedCarId
        : GARAGE_CARS[0].id;

    return {
      coins: typeof parsed.coins === 'number' && parsed.coins >= 0 ? Math.floor(parsed.coins) : 0,
      highScore:
        typeof parsed.highScore === 'number' && parsed.highScore >= 0
          ? Math.floor(parsed.highScore)
          : 0,
      bestDistance:
        typeof parsed.bestDistance === 'number' && parsed.bestDistance >= 0
          ? Math.floor(parsed.bestDistance)
          : 0,
      unlockedCarIds: Array.from(new Set(unlocked)),
      selectedCarId: selected,
      settings: {
        soundEnabled: parsed.settings?.soundEnabled ?? true,
        musicEnabled: parsed.settings?.musicEnabled ?? true,
        quality: parsed.settings?.quality === 'low' ? 'low' : 'high',
        showTapControls: parsed.settings?.showTapControls ?? false,
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
    // Ignore quota/storage privacy mode errors gracefully
  }
}
