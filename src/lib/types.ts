export interface GeneratedArticle {
  id: string;
  headline: string;
  subheadline: string;
  category: string;
  lede: string;
  body: string[];
  pullQuote: string;
  analysis: string;
  conclusion: string;
  sources: { name: string; url: string }[];
  readingTime: number;
  heroImage?: string | null;
  generatedAt: string;
}

export interface QuickHit {
  id: string;
  topic: string;
  summary: string;
  source: { name: string; url: string };
}

export interface ByTheNumber {
  id: string;
  number: string;
  context: string;
  source: { name: string; url: string };
}

export interface DailyBriefData {
  deepDives: GeneratedArticle[];
  quickHits: QuickHit[];
  byTheNumbers: ByTheNumber[];
  generatedAt: string;
}
