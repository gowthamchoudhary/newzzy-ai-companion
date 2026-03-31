export interface UserPreferences {
  name: string;
  voiceId: string;
  voiceName: string;
  interests: string[];
}

export interface VoiceOption {
  name: string;
  id: string;
  description: string;
  previewLine: string;
  gradient: string;
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

export const VOICES: VoiceOption[] = [
  {
    name: 'Rachel',
    id: 'EXAVITQu4vr4xnSDxMaL',
    description: 'Polished, warm, and built for fast daily briefings.',
    previewLine: 'Here is your concise rundown, right on cue.',
    gradient: 'from-[#8b5cf6] via-[#a78bfa] to-[#2dd4bf]',
  },
  {
    name: 'Adam',
    id: 'pNInz6obpgDQGcFmaJgB',
    description: 'Measured, direct, and confident like a newsroom host.',
    previewLine: 'Let me walk you through what matters most today.',
    gradient: 'from-[#1d4ed8] via-[#38bdf8] to-[#22c55e]',
  },
  {
    name: 'Bella',
    id: 'MF3mGyEYCl7XYWbV9V6O',
    description: 'Soft-spoken and conversational for calmer listening.',
    previewLine: 'Your feed is ready, and I can keep it human.',
    gradient: 'from-[#ec4899] via-[#f472b6] to-[#fb7185]',
  },
  {
    name: 'Antoni',
    id: 'ErXwobaYiN019PkySvjV',
    description: 'Deep, dramatic delivery for premium editorial energy.',
    previewLine: 'Tonight in the world, here is the signal in the noise.',
    gradient: 'from-[#f97316] via-[#facc15] to-[#fb7185]',
  },
  {
    name: 'Elli',
    id: 'MF3mGyEYCl7XYWbV9V6O',
    description: 'Bright, agile, and suited to discovery-heavy sessions.',
    previewLine: 'I found the story behind the story for you.',
    gradient: 'from-[#14b8a6] via-[#2dd4bf] to-[#a78bfa]',
  },
];

export const INTERESTS = [
  'Tech',
  'AI',
  'Sports',
  'Gaming',
  'Crypto',
  'Politics',
  'Science',
  'Entertainment',
  'Business',
  'Health',
  'World News',
  'Climate',
  'Space',
  'Culture',
] as const;
