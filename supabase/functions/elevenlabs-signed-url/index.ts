const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const participantName =
      typeof body?.participantName === 'string' && body.participantName.trim().length > 0
        ? body.participantName.trim()
        : undefined;
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    const ELEVENLABS_AGENT_ID = Deno.env.get('ELEVENLABS_AGENT_ID');

    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: 'ELEVENLABS_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!ELEVENLABS_AGENT_ID) {
      return new Response(JSON.stringify({ error: 'ELEVENLABS_AGENT_ID not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokenUrl = new URL('https://api.elevenlabs.io/v1/convai/conversation/token');
    tokenUrl.searchParams.set('agent_id', ELEVENLABS_AGENT_ID);
    if (participantName) {
      tokenUrl.searchParams.set('participant_name', participantName);
    }

    const tokenResponse = await fetch(tokenUrl, {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY },
    });

    if (tokenResponse.ok) {
      const tokenData = await tokenResponse.json();
      return new Response(JSON.stringify({ conversation_token: tokenData.token, connection_type: 'webrtc' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokenError = await tokenResponse.text();
    console.error('ElevenLabs token API error:', tokenError);

    const signedUrlResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${ELEVENLABS_AGENT_ID}`,
      {
        headers: { 'xi-api-key': ELEVENLABS_API_KEY },
      }
    );

    if (!signedUrlResponse.ok) {
      const signedUrlError = await signedUrlResponse.text();
      console.error('ElevenLabs signed URL API error:', signedUrlError);
      return new Response(
        JSON.stringify({
          error: 'Could not create ElevenLabs conversation credentials',
          token_error: tokenError,
          signed_url_error: signedUrlError,
        }),
        {
          status: signedUrlResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const signedUrlData = await signedUrlResponse.json();

    return new Response(JSON.stringify({ signed_url: signedUrlData.signed_url, connection_type: 'websocket' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
