export const BEST_KEY = 'pond-dash.best.v1';
export const SOUND_KEY = 'pond-dash.sound.v1';
export function readSetting(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
export function writeSetting(key: string, value: string): boolean {
  try { window.localStorage.setItem(key, value); return true; } catch { return false; }
}
export function readBest(): number {
  const value = Number(readSetting(BEST_KEY));
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}
