const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `You are a world-class journalist writing for a premium digital newsroom. Your writing style combines the clarity of Reuters, the depth of The Economist, and the accessibility of BBC News. You write in inverted pyramid style. Every claim is grounded in the provided source material. You never fabricate quotes or facts.`;

function buildUserPrompt(sources: string): string {
  return `Write a complete, publication-ready news article based on these source materials:

${sources}

Requirements:
- Headline: punchy, informative, 8-12 words
- Subheadline: one-sentence context
- Lede: most important fact first, 2-3 sentences
- Body: 3-4 paragraphs, 80-100 words each
- Pull quote: most striking fact as blockquote
- Analysis: one paragraph on significance
- Conclusion: what happens next

Style rules:
- Write in third person
- Active voice preferred
- No fluff or filler
- Attribute claims to sources
- Never say 'In conclusion' or 'In summary'
- Sound like a journalist, not a chatbot

Return as JSON:
{
  "headline": "string",
  "subheadline": "string",
  "category": "string (one of: Politics, Tech, World, Business, Science, Health, Entertainment, Sports, Climate, Culture)",
  "lede": "string",
  "body": ["paragraph1", "paragraph2", "paragraph3"],
  "pullQuote": "string",
  "analysis": "string",
  "conclusion": "string",
  "sources": [{"name": "string", "url": "string"}],
  "readingTime": 3
}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic } = await req.json();
    if (!topic || typeof topic !== 'string') {
      return new Response(JSON.stringify({ error: 'topic is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: 'FIRECRAWL_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: 'GROQ_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 1 & 2: Parallel Firecrawl searches
    const [newsRes, contextRes] = await Promise.all([
      fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `${topic} latest news today`,
          limit: 5,
          scrapeOptions: { formats: ['markdown'], onlyMainContent: true },
        }),
      }),
      fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `${topic} analysis background context`,
          limit: 3,
          scrapeOptions: { formats: ['markdown'], onlyMainContent: true },
        }),
      }),
    ]);

    const newsData = await newsRes.json();
    const contextData = await contextRes.json();

    if (!newsRes.ok) {
      console.error('Firecrawl news search error:', newsData);
      return new Response(JSON.stringify({ error: newsData?.error || 'News search failed' }), {
        status: newsRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allResults = [...(newsData.data || []), ...(contextData.data || [])];

    // Build source material string
    const sourceMaterial = allResults
      .map((item: any, i: number) => {
        const title = item.title || item.metadata?.title || 'Untitled';
        const url = item.url || item.metadata?.sourceURL || '';
        const content = item.markdown?.substring(0, 1500) || item.description || '';
        return `--- Source ${i + 1} ---\nTitle: ${title}\nURL: ${url}\n${content}`;
      })
      .join('\n\n');

    // Pick best hero image from results
    let heroImage: string | null = null;
    for (const item of allResults) {
      const img = item.metadata?.ogImage || item.metadata?.image;
      if (img && typeof img === 'string' && img.startsWith('http')) {
        heroImage = img;
        break;
      }
    }

    // Step 3: Call Groq LLM
    const llmResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(sourceMaterial) },
        ],
        temperature: 0.6,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
      }),
    });

    if (!llmResponse.ok) {
      const errText = await llmResponse.text();
      console.error('Groq error:', llmResponse.status, errText);
      if (llmResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited by AI provider. Try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'AI generation failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const llmData = await llmResponse.json();
    const rawContent = llmData.choices?.[0]?.message?.content;

    if (!rawContent) {
      return new Response(JSON.stringify({ error: 'AI returned empty response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let article: Record<string, unknown>;
    try {
      article = JSON.parse(rawContent);
    } catch {
      console.error('Failed to parse AI JSON:', rawContent.substring(0, 500));
      return new Response(JSON.stringify({ error: 'AI returned invalid JSON' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Attach hero image and timestamp
    const result = {
      ...article,
      heroImage,
      id: crypto.randomUUID(),
      generatedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('generate-article error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
