import { supabase } from '@/integrations/supabase/client';
import type { GeneratedArticle } from '@/lib/types';

const SUPABASE_FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export class SearchWebError extends Error {
  status: number;
  retryAfterSeconds?: number;

  constructor(message: string, status: number, retryAfterSeconds?: number) {
    super(message);
    this.name = 'SearchWebError';
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface ConversationAuth {
  conversationToken?: string;
  signedUrl?: string;
  connectionType: 'webrtc' | 'websocket';
}

export async function getConversationAuth(participantName?: string): Promise<ConversationAuth> {
  const { data, error } = await supabase.functions.invoke('elevenlabs-signed-url', {
    body: participantName ? { participantName } : {},
  });
  if (error) throw new Error(error.message);
  if (data?.conversation_token) {
    return {
      conversationToken: data.conversation_token as string,
      connectionType: 'webrtc',
    };
  }
  if (data?.signed_url) {
    return {
      signedUrl: data.signed_url as string,
      connectionType: 'websocket',
    };
  }
  throw new Error('No ElevenLabs conversation credentials received');
}

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  source: string;
  image: string | null;
  keyPoints?: string[];
  excerpt?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  textSummary: string;
}

export interface DebateResearchPoint {
  point: string;
  evidence?: string;
  source: string;
}

export interface DebateResearchResponse {
  topic: string;
  pros: DebateResearchPoint[];
  cons: DebateResearchPoint[];
  sources?: { url: string; title?: string }[];
}

function parseRetryAfterSeconds(message: string) {
  const match = message.match(/retry after\s+(\d+)s/i);
  return match ? Number(match[1]) : undefined;
}

export async function searchWeb(query: string, extractPoints = false): Promise<SearchResponse> {
  const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/search-web`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ query, extractPoints }),
  });

  const rawBody = await response.text();
  let payload: unknown = null;

  if (rawBody) {
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message = (payload as any)?.error || rawBody || `Search request failed with status ${response.status}`;
    throw new SearchWebError(message, response.status, parseRetryAfterSeconds(message));
  }

  if (!payload) {
    throw new SearchWebError('Search returned an empty response body', response.status);
  }

  return payload as SearchResponse;
}

export async function getDebateResearch(topic: string): Promise<DebateResearchResponse> {
  const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/search-web`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ mode: 'debate', topic }),
  });

  const rawBody = await response.text();
  let payload: unknown = null;

  if (rawBody) {
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message = (payload as any)?.error || rawBody || `Debate research failed with status ${response.status}`;
    throw new SearchWebError(message, response.status, parseRetryAfterSeconds(message));
  }

  if (!payload) {
    throw new SearchWebError('Debate research returned an empty response body', response.status);
  }

  return payload as DebateResearchResponse;
}

export async function generateArticle(topic: string): Promise<GeneratedArticle> {
  const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/generate-article`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ topic }),
  });

  const rawBody = await response.text();
  let payload: unknown = null;

  if (rawBody) {
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message = (payload as any)?.error || rawBody || `Article generation failed with status ${response.status}`;
    throw new SearchWebError(message, response.status, parseRetryAfterSeconds(message));
  }

  if (!payload) {
    throw new SearchWebError('Article generation returned empty response', response.status);
  }

  return payload as GeneratedArticle;
}
