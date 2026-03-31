const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function extractPoints(markdown: string): string[] {
  if (!markdown) return [];
  
  const sentences = markdown
    .split(/[.!?\n]+/)
    .map(s => s.trim())
    .filter(s => {
      if (s.length < 30 || s.length > 500) return false;
      const words = s.split(/\s+/);
      if (words.length < 5) return false;
      const alphaChars = s.replace(/[^a-zA-Z]/g, '').length;
      if (alphaChars / s.length < 0.5) return false;
      // Filter nav/social junk
      const junkPatterns = /^(share|follow|subscribe|click|sign up|log in|cookie|privacy|menu|navigation|copyright|©)/i;
      if (junkPatterns.test(s)) return false;
      return true;
    });

  return sentences.slice(0, 8);
}

const DEBATE_SCHEMA = {
  type: 'object',
  properties: {
    topic: { type: 'string' },
    pros: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          point: { type: 'string' },
          evidence: { type: 'string' },
          source: { type: 'string' },
        },
        required: ['point', 'source'],
      },
    },
    cons: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          point: { type: 'string' },
          evidence: { type: 'string' },
          source: { type: 'string' },
        },
        required: ['point', 'source'],
      },
    },
    sources: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          title: { type: 'string' },
        },
        required: ['url'],
      },
    },
  },
  required: ['topic', 'pros', 'cons'],
};

async function pollAgentResult(apiKey: string, jobId: string) {
  const startedAt = Date.now();
  const timeoutMs = 45_000;

  while (Date.now() - startedAt < timeoutMs) {
    const response = await fetch(`https://api.firecrawl.dev/v2/agent/${jobId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || `Agent status failed: ${response.status}`);
    }

    if (data.status === 'completed') {
      return data.data;
    }

    if (data.status === 'failed') {
      throw new Error(data?.error || 'Firecrawl agent job failed');
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error('Firecrawl agent timed out');
}

async function runDebateResearch(apiKey: string, topic: string) {
  const prompt = `Given the topic: "${topic}", find credible web sources and extract 6 concise debate-suitable supporting points and 6 opposing points. Each point must be specific, non-duplicative, and include a citation URL. Prefer reputable sources such as news outlets, research organizations, and government sources. Include short evidence snippets where available. Return data in the provided JSON schema.`;

  const startResponse = await fetch('https://api.firecrawl.dev/v2/agent', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      schema: DEBATE_SCHEMA,
      model: 'spark-1-mini',
      maxCredits: 150,
    }),
  });

  const startData = await startResponse.json();

  if (!startResponse.ok) {
    throw new Error(startData?.error || `Debate agent request failed: ${startResponse.status}`);
  }

  const jobId = startData.id;
  if (!jobId) {
    throw new Error('Firecrawl agent did not return a job id');
  }

  return await pollAgentResult(apiKey, jobId);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, extractPoints: shouldExtract, mode, topic } = await req.json();

    if (!query && mode !== 'debate') {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'FIRECRAWL_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (mode === 'debate') {
      if (!topic) {
        return new Response(JSON.stringify({ error: 'Topic is required for debate mode' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Debate research:', topic);
      const debateData = await runDebateResearch(apiKey, topic);

      return new Response(JSON.stringify(debateData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Searching:', query);

    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit: 5,
        scrapeOptions: {
          formats: ['markdown'],
          onlyMainContent: true,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl error:', data);
      return new Response(JSON.stringify({ error: data.error || `Request failed: ${response.status}` }), {
        status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawResults = data.data || [];
    
    const results = rawResults.map((item: any) => {
      const result: any = {
        title: item.title || item.metadata?.title || 'Untitled',
        url: item.url || item.metadata?.sourceURL || '',
        description: item.description || item.metadata?.description || '',
        source: item.url ? new URL(item.url).hostname.replace('www.', '') : '',
        image: item.metadata?.ogImage || item.metadata?.image || null,
      };

      if (shouldExtract && item.markdown) {
        result.keyPoints = extractPoints(item.markdown);
        result.excerpt = item.markdown.substring(0, 300);
      }

      return result;
    });

    const textSummary = results
      .map((r: any) => `${r.title}: ${r.description}`)
      .join('\n');

    return new Response(JSON.stringify({ results, textSummary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
