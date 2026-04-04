export interface UserPreferences {
  name: string;
  voiceId: string;
  voiceName: string;
  interests: string[];
  tone?: 'professional' | 'casual' | 'conversational';
  briefLength?: 'brief' | 'standard' | 'deep';
}

export interface VoiceOption {
  name: string;
  id: string;
  description: string;
  previewLine: string;
  gradient: string;
}

const STORAGE_KEY = 'newzzy_prefs';
const RATINGS_KEY = 'newzzy_ratings';

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

export function saveRating(articleId: string, rating: number, feedback?: string) {
  const raw = localStorage.getItem(RATINGS_KEY);
  let ratings: Record<string, { rating: number; feedback?: string }> = {};
  try { if (raw) ratings = JSON.parse(raw); } catch {}
  ratings[articleId] = { rating, feedback };
  localStorage.setItem(RATINGS_KEY, JSON.stringify(ratings));
}

export function getRating(articleId: string): { rating: number; feedback?: string } | null {
  const raw = localStorage.getItem(RATINGS_KEY);
  if (!raw) return null;
  try {
    const ratings = JSON.parse(raw);
    return ratings[articleId] || null;
  } catch {
    return null;
  }
}

// Default voice — Adam, used everywhere
export const DEFAULT_VOICE: VoiceOption = {
  name: 'Adam',
  id: 'pNInz6obpgDQGcFmaJgB',
  description: 'Measured, direct, and confident like a newsroom host.',
  previewLine: 'Let me walk you through what matters most today.',
  gradient: 'from-[#1d4ed8] via-[#38bdf8] to-[#22c55e]',
};

// Keep for backward compat but not exposed in UI
export const VOICES: VoiceOption[] = [DEFAULT_VOICE];

export const INTERESTS = [
  'Tech',
  'AI',
  'Politics',
  'Science',
  'World News',
  'Business',
  'Health',
  'Entertainment',
  'Climate',
  'Sports',
  'Crypto',
  'Gaming',
  'Space',
  'Culture',
] as const;
