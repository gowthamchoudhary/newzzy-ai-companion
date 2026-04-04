const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DEEP_DIVE_PROMPT = `You are a world-class journalist writing for a premium digital newsroom. Your writing style combines the clarity of Reuters, the depth of The Economist, and the accessibility of BBC News. You write in inverted pyramid style. Every claim is grounded in the provided source material. You never fabricate quotes or facts.`;

function buildDeepDivePrompt(sources: string): string {
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

function buildBriefPrompt(sources: string, topics: string[]): string {
  return `Based on these source materials, generate a daily news brief with three sections.

Source materials:
${sources}

Topics of interest: ${topics.join(', ')}

Return ONLY valid JSON with this exact structure:
{
  "deepDive": {
    "headline": "string (8-12 words, punchy)",
    "subheadline": "string (one sentence)",
    "category": "string",
    "lede": "string (2-3 sentences, most important fact first)",
    "body": ["paragraph1", "paragraph2", "paragraph3"],
    "pullQuote": "string",
    "analysis": "string",
    "conclusion": "string",
    "sources": [{"name": "string", "url": "string"}],
    "readingTime": 3
  },
  "quickHits": [
    {"topic": "string (2-4 words)", "summary": "string (1-2 sentences)", "source": {"name": "string", "url": "string"}},
    {"topic": "string", "summary": "string", "source": {"name": "string", "url": "string"}},
    {"topic": "string", "summary": "string", "source": {"name": "string", "url": "string"}},
    {"topic": "string", "summary": "string", "source": {"name": "string", "url": "string"}}
  ],
  "byTheNumbers": [
    {"number": "string (e.g. '$1.5 trillion')", "context": "string (one sentence explaining)", "source": {"name": "string", "url": "string"}},
    {"number": "string", "context": "string", "source": {"name": "string", "url": "string"}}
  ]
}

Style: Write like a senior Reuters editor. Third person, active voice, no fluff. Every claim attributed.`;
}

async function firecrawlSearch(apiKey: string, query: string, limit: number) {
  const res = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      limit,
      scrapeOptions: { formats: ['markdown'], onlyMainContent: true },
    }),
  });
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { topic, mode, topics } = body;

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: 'FIRECRAWL_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mode: "brief" generates a full daily brief section (deepDive + quickHits + byTheNumbers)
    if (mode === 'brief') {
      const topicList: string[] = topics || ['world news', 'technology', 'business'];
      const searchQuery = topicList.map(t => `${t} latest news today`).join(' OR ');

      const [newsData, contextData] = await Promise.all([
        firecrawlSearch(FIRECRAWL_API_KEY, searchQuery, 8),
        firecrawlSearch(FIRECRAWL_API_KEY, `${topicList[0]} analysis context background`, 3),
      ]);

      const allResults = [...(newsData.data || []), ...(contextData.data || [])];
      const sourceMaterial = allResults
        .map((item: any, i: number) => {
          const title = item.title || item.metadata?.title || 'Untitled';
          const url = item.url || item.metadata?.sourceURL || '';
          const content = item.markdown?.substring(0, 1200) || item.description || '';
          return `--- Source ${i + 1} ---\nTitle: ${title}\nURL: ${url}\n${content}`;
        })
        .join('\n\n');

      let heroImage: string | null = null;
      for (const item of allResults) {
        const img = item.metadata?.ogImage || item.metadata?.image;
        if (img && typeof img === 'string' && img.startsWith('http')) {
          heroImage = img;
          break;
        }
      }

      const llmResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: DEEP_DIVE_PROMPT },
            { role: 'user', content: buildBriefPrompt(sourceMaterial, topicList) },
          ],
          temperature: 0.6,
          max_tokens: 3000,
          response_format: { type: 'json_object' },
        }),
      });

      if (!llmResponse.ok) {
        const errText = await llmResponse.text();
        console.error('AI Gateway error:', llmResponse.status, errText);
        const status = llmResponse.status === 429 ? 429 : llmResponse.status === 402 ? 402 : 500;
        return new Response(JSON.stringify({ error: status === 429 ? 'Rate limited. Try again in a moment.' : 'AI generation failed' }), {
          status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const llmData = await llmResponse.json();
      const rawContent = llmData.choices?.[0]?.message?.content;
      if (!rawContent) {
        return new Response(JSON.stringify({ error: 'AI returned empty response' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let parsed: any;
      try { parsed = JSON.parse(rawContent); } catch {
        return new Response(JSON.stringify({ error: 'AI returned invalid JSON' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Normalize the deep dive
      const deepDive = {
        ...parsed.deepDive,
        heroImage,
        id: crypto.randomUUID(),
        generatedAt: new Date().toISOString(),
      };

      const quickHits = (parsed.quickHits || []).map((qh: any) => ({
        ...qh,
        id: crypto.randomUUID(),
      }));

      const byTheNumbers = (parsed.byTheNumbers || []).map((btn: any) => ({
        ...btn,
        id: crypto.randomUUID(),
      }));

      return new Response(JSON.stringify({ deepDive, quickHits, byTheNumbers }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default mode: single article generation (existing behavior)
    if (!topic || typeof topic !== 'string') {
      return new Response(JSON.stringify({ error: 'topic is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [newsData, contextData] = await Promise.all([
      firecrawlSearch(FIRECRAWL_API_KEY, `${topic} latest news today`, 5),
      firecrawlSearch(FIRECRAWL_API_KEY, `${topic} analysis background context`, 3),
    ]);

    if (!newsData.data && !newsData.success) {
      return new Response(JSON.stringify({ error: newsData?.error || 'News search failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allResults = [...(newsData.data || []), ...(contextData.data || [])];
    const sourceMaterial = allResults
      .map((item: any, i: number) => {
        const title = item.title || item.metadata?.title || 'Untitled';
        const url = item.url || item.metadata?.sourceURL || '';
        const content = item.markdown?.substring(0, 1500) || item.description || '';
        return `--- Source ${i + 1} ---\nTitle: ${title}\nURL: ${url}\n${content}`;
      })
      .join('\n\n');

    let heroImage: string | null = null;
    for (const item of allResults) {
      const img = item.metadata?.ogImage || item.metadata?.image;
      if (img && typeof img === 'string' && img.startsWith('http')) {
        heroImage = img;
        break;
      }
    }

    const llmResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: DEEP_DIVE_PROMPT },
          { role: 'user', content: buildDeepDivePrompt(sourceMaterial) },
        ],
        temperature: 0.6,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
      }),
    });

    if (!llmResponse.ok) {
      const errText = await llmResponse.text();
      console.error('AI Gateway error:', llmResponse.status, errText);
      if (llmResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited. Try again in a moment.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'AI generation failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const llmData = await llmResponse.json();
    const rawContent = llmData.choices?.[0]?.message?.content;
    if (!rawContent) {
      return new Response(JSON.stringify({ error: 'AI returned empty response' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let article: Record<string, unknown>;
    try { article = JSON.parse(rawContent); } catch {
      return new Response(JSON.stringify({ error: 'AI returned invalid JSON' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      ...article,
      heroImage,
      id: crypto.randomUUID(),
      generatedAt: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('generate-article error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
