export interface UserPreferences {
  name: string;
  voiceId: string;
  voiceName: string;
  interests: string[];
}

const STORAGE_KEY = 'newzzy_prefs';

export function savePreferences(prefs: UserPreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function getPreferences(): UserPreferences | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const VOICES = [
  { name: 'Rachel', id: 'EXAVITQu4vr4xnSDxMaL' },
  { name: 'Adam', id: 'pNInz6obpgDQGcFmaJgB' },
  { name: 'Bella', id: 'EXAVITQu4vr4xnSDxMaL' },
  { name: 'Antoni', id: 'ErXwobaYiN019PkySvjV' },
  { name: 'Elli', id: 'MF3mGyEYCl7XYWbV9V6O' },
] as const;

export const INTERESTS = [
  'Tech', 'AI', 'Sports', 'Gaming', 'Crypto',
  'Politics', 'Science', 'Entertainment', 'Business', 'Health',
] as const;
