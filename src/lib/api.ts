import { supabase } from '@/integrations/supabase/client';

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

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error || `Search request failed with status ${response.status}`;
    throw new SearchWebError(message, response.status, parseRetryAfterSeconds(message));
  }

  return payload as SearchResponse;
}
