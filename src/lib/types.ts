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
