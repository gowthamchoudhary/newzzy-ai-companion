import { supabase } from '@/integrations/supabase/client';

export async function getSignedUrl() {
  const { data, error } = await supabase.functions.invoke('elevenlabs-signed-url');
  if (error) throw new Error(error.message);
  if (!data?.signed_url) throw new Error('No signed URL received');
  return data.signed_url as string;
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

export async function searchWeb(query: string, extractPoints = false): Promise<SearchResponse> {
  const { data, error } = await supabase.functions.invoke('search-web', {
    body: { query, extractPoints },
  });
  if (error) throw new Error(error.message);
  return data as SearchResponse;
}
