import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useConversation } from '@elevenlabs/react';
import { ArrowLeft, ExternalLink, Mic, MicOff, Newspaper, Radio, RefreshCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GradientOrb } from '@/components/GradientOrb';
import { LiveCaptions } from '@/components/LiveCaptions';
import { getPreferences } from '@/lib/store';
import { SearchWebError, getConversationAuth, searchWeb, type SearchResult } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';

const CATEGORIES = ['Latest', 'Social', 'Videos', 'Official', 'Memes'] as const;
const NEWS_CACHE_TTL_MS = 60_000;

const CATEGORY_FILTERS: Record<(typeof CATEGORIES)[number], string> = {
  Latest: '',
  Social: 'site:reddit.com OR site:x.com OR site:twitter.com',
  Videos: 'youtube video OR interview',
  Official: 'site:reuters.com OR site:bbc.com OR site:apnews.com',
  Memes: 'memes reddit viral',
};

interface TranscriptEntry {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: string;
}

interface CachedNewsEntry {
  fetchedAt: number;
  results: SearchResult[];
}

interface VoiceNewsIntent {
  category: (typeof CATEGORIES)[number];
  topic: string;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function buildPlaceholder(title: string) {
  return title.charAt(0).toUpperCase() || 'N';
}

function getPrimaryTopic(interests: string[] | undefined) {
  return interests?.find((interest) => interest.trim().length > 0) || 'technology';
}

function buildDailyContext(name: string | undefined, topic: string, stories: SearchResult[]) {
  const today = new Date().toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const greetingName = name || 'there';

  // Check if there's article context from the News page
  const articleContextRaw = sessionStorage.getItem('newzzy_article_context');
  if (articleContextRaw) {
    sessionStorage.removeItem('newzzy_article_context');
    try {
      const ac = JSON.parse(articleContextRaw);
      return `The user is ${greetingName}. Today is ${today}. The user just read this article: "${ac.headline}". Summary: ${ac.lede} ${ac.body}. Start by greeting them, then discuss this article naturally. Answer questions about it. If they ask about something else, search the web.`;
    } catch { /* fall through */ }
  }

  const summaryLines = stories
    .slice(0, 3)
    .map((story) => story.title)
    .join('; ');

  if (summaryLines) {
    return `The user is ${greetingName}. Start the conversation first without waiting for them. Greet them by name, then give a natural two or three sentence spoken summary about today's ${topic} news using these headlines for context: ${summaryLines}. After that, ask one simple follow-up question about what they want next. Keep it conversational, clean, and human.`;
  }

  return `The user is ${greetingName}. Start the conversation first without waiting for them. Greet them by name, then give a natural two or three sentence spoken summary about today's ${topic} news. After that, ask one simple follow-up question about what they want next. Keep it conversational, clean, and human.`;
}

function inferCategoryFromTranscript(text: string): (typeof CATEGORIES)[number] {
  const lower = text.toLowerCase();
  if (/(video|videos|youtube|interview|watch)/.test(lower)) return 'Videos';
  if (/(meme|memes|funny|viral)/.test(lower)) return 'Memes';
  if (/(social|reddit|twitter|x\.com|tweets)/.test(lower)) return 'Social';
  if (/(official|reuters|bbc|apnews|ap )/.test(lower)) return 'Official';
  return 'Latest';
}

function extractVoiceNewsIntent(text: string, interests: string[] | undefined): VoiceNewsIntent | null {
  const trimmed = text.trim();
  if (trimmed.length < 4) return null;

  const lower = trimmed.toLowerCase();
  const mentionsNewsIntent =
    /(news|update|updates|headline|headlines|story|stories|about|show|tell|brief|briefing|happening|latest)/.test(lower);

  const matchedInterest = interests?.find((interest) => lower.includes(interest.toLowerCase()));

  let topic = trimmed
    .replace(/^(hey|hi|hello)\s+/i, '')
    .replace(/^(can you|could you|would you|please|show me|tell me|give me|i want|let me hear|what's|whats|what is)\s+/i, '')
    .replace(/\b(latest|news|updates|headlines|stories|briefing|brief|about|on|for me)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!mentionsNewsIntent && !matchedInterest) return null;

  if (!topic || topic.length < 2) {
    topic = matchedInterest || getPrimaryTopic(interests);
  }

  return {
    category: inferCategoryFromTranscript(lower),
    topic,
  };
}

function buildRefreshNotice(topic: string, category: (typeof CATEGORIES)[number]) {
  return `Updated cards for "${topic}" in ${category.toLowerCase()}.`;
}

function buildSearchQuery(topic: string, category: (typeof CATEGORIES)[number]) {
  return `${topic} news ${CATEGORY_FILTERS[category]}`.trim();
}

function buildDailyBriefing(name: string | undefined, interests: string[] | undefined, stories: SearchResult[]) {
  const topLines = stories
    .slice(0, 3)
    .map((story) => story.title)
    .join(' ');
  const topic = getPrimaryTopic(interests);
  const today = new Date().toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const greetingName = name || 'there';

  if (topLines) {
    return `Hi ${greetingName}. It's ${today}. Start with a quick, natural two or three sentence summary about today's ${topic} news. Use these headlines as background: ${topLines}. Then ask what they want to explore next.`;
  }

  return `Hi ${greetingName}. It's ${today}. Start with a quick, natural two or three sentence summary about today's ${topic} news, then ask what they want to hear about first.`;
}

function formatVoiceError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const maybeMessage = Reflect.get(error, 'message');
    if (typeof maybeMessage === 'string' && maybeMessage) return maybeMessage;
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown voice error';
    }
  }
  return 'Unknown voice error';
}

function serializeVoiceDetails(details: unknown) {
  if (!details) return 'No disconnect details provided';
  if (typeof details === 'string') return details;
  if (details instanceof Error) return details.message;
  try {
    return JSON.stringify(
      details,
      (_, value) => {
        if (value instanceof CloseEvent) {
          return {
            type: value.type,
            code: value.code,
            reason: value.reason,
            wasClean: value.wasClean,
          };
        }
        return value;
      },
      2
    );
  } catch {
    return String(details);
  }
}

function NewsSkeleton() {
  return (
    <div className="glass rounded-[var(--radius-lg)] p-4">
      <div className="skeleton-shimmer aspect-video rounded-[var(--radius-md)]" />
      <div className="mt-4 space-y-3">
        <div className="skeleton-shimmer h-4 w-24 rounded-full" />
        <div className="skeleton-shimmer h-5 w-full rounded-md" />
        <div className="skeleton-shimmer h-5 w-4/5 rounded-md" />
        <div className="skeleton-shimmer h-4 w-full rounded-md" />
      </div>
    </div>
  );
}

export default function Chat() {
  const navigate = useNavigate();
  const prefs = getPreferences();
  const [caption, setCaption] = useState('');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState<(typeof CATEGORIES)[number]>('Latest');
  const [news, setNews] = useState<SearchResult[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [started, setStarted] = useState(false);
  const [searchingVoice, setSearchingVoice] = useState(false);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);
  const [voiceNote, setVoiceNote] = useState('Idle');
  const [voiceIssue, setVoiceIssue] = useState<string | null>(null);
  const [newsFocus, setNewsFocus] = useState(getPrimaryTopic(prefs?.interests));
  const captionTimer = useRef<ReturnType<typeof setTimeout>>();
  const transcriptRef = useRef<HTMLDivElement>(null);
  const newsCacheRef = useRef<Record<string, CachedNewsEntry>>({});
  const autoStartedRef = useRef(false);
  const heardAudioRef = useRef(false);
  const lastVoiceIntentRef = useRef<{ key: string; at: number } | null>(null);
  const pendingGreetingRef = useRef<{ context: string; briefing: string } | null>(null);

  const conversation = useConversation({
    onConnect: ({ conversationId }: any) => {
      console.info('[Newzzy voice] connected', conversationId);
      setStarted(true);
      setVoiceIssue(null);
      setVoiceNote(`Connected · ${conversationId}`);
      if (pendingGreetingRef.current) {
        const { context, briefing } = pendingGreetingRef.current;
        window.setTimeout(() => {
          try {
            conversation.sendContextualUpdate(context);
            conversation.sendUserMessage(briefing);
            conversation.sendUserActivity();
          } catch (error) {
            console.error('Greeting handoff failed:', error);
          }
        }, 150);
        pendingGreetingRef.current = null;
      }
    },
    onDisconnect: (details: any) => {
      console.info('[Newzzy voice] disconnected', serializeVoiceDetails(details));
      heardAudioRef.current = false;
      setStarted(false);
      setVoiceNote('Disconnected');
      const detailText =
        typeof details?.message === 'string'
          ? details.message
          : typeof details?.reason === 'string'
            ? details.reason
            : serializeVoiceDetails(details);
      if (detailText) setVoiceIssue(detailText);
    },
    onStatusChange: ({ status }: any) => {
      console.info('[Newzzy voice] status', status);
      setVoiceNote(status === 'connecting' ? 'Connecting voice...' : status === 'connected' ? 'Connected' : status === 'error' ? 'Voice session error' : 'Idle');
    },
    onDebug: (info: any) => {
      console.debug('[Newzzy voice] debug', info);
    },
    onAudio: () => {
      if (!heardAudioRef.current) {
        heardAudioRef.current = true;
        setVoiceNote('Connected · audio live');
      }
    },
    onMessage: (message: any) => {
      if (message.type === 'agent_response') {
        const text = message.agent_response_event?.agent_response || '';
        if (!text) return;
        setCaption(text);
        setTranscript((prev) => [...prev, { id: `${Date.now()}-agent`, role: 'agent', text, timestamp: formatTime(new Date()) }]);
        if (captionTimer.current) window.clearTimeout(captionTimer.current);
        captionTimer.current = window.setTimeout(() => setCaption(''), 2000) as unknown as ReturnType<typeof setTimeout>;
      }

      if (message.type === 'user_transcript') {
        const text = message.user_transcription_event?.user_transcript || '';
        if (!text) return;
        setTranscript((prev) => [...prev, { id: `${Date.now()}-user`, role: 'user', text, timestamp: formatTime(new Date()) }]);

        const intent = extractVoiceNewsIntent(text, prefs?.interests);
        if (!intent) return;

        const dedupeKey = `${intent.category}:${intent.topic.toLowerCase()}`;
        const now = Date.now();
        if (lastVoiceIntentRef.current && lastVoiceIntentRef.current.key === dedupeKey && now - lastVoiceIntentRef.current.at < 8000) {
          return;
        }

        lastVoiceIntentRef.current = { key: dedupeKey, at: now };
        setActiveCategory(intent.category);
        setNewsFocus(intent.topic);
        setSearchNotice(`Listening for ${intent.topic}...`);
        void fetchNews(intent.category, { force: true, topicOverride: intent.topic, source: 'voice' });
      }
    },
    onError: (error) => {
      console.error('Conversation error:', error);
      const formatted = formatVoiceError(error);
      setVoiceIssue(formatted);
      setVoiceNote('Voice session error');
      toast.error('Voice session hit an error. Please try again.');
      setStarted(false);
    },
  });

  const fetchNews = useCallback(
    async (
      category: (typeof CATEGORIES)[number],
      options?: { force?: boolean; topicOverride?: string; source?: 'voice' | 'ui' | 'auto' }
    ): Promise<SearchResult[]> => {
      const topic = options?.topicOverride || newsFocus || getPrimaryTopic(prefs?.interests);
      const query = buildSearchQuery(topic, category);
      const cacheKey = `${category}:${topic.toLowerCase()}:${query}`;
      const cached = newsCacheRef.current[cacheKey];
      const now = Date.now();

      if (!options?.force && cached && now - cached.fetchedAt < NEWS_CACHE_TTL_MS) {
        setNews(cached.results);
        setSearchNotice(`Showing a recent ${topic} briefing.`);
        return cached.results;
      }

      if (!options?.force && rateLimitedUntil && now < rateLimitedUntil) {
        const seconds = Math.max(1, Math.ceil((rateLimitedUntil - now) / 1000));
        setSearchNotice(`Firecrawl asked us to wait ${seconds}s before the next refresh.`);
        if (cached) {
          setNews(cached.results);
          return cached.results;
        }
        return [];
      }

      setLoadingNews(true);
      setSearchingVoice(true);
      setSearchNotice(null);

      try {
        const data = await searchWeb(query);
        newsCacheRef.current[cacheKey] = { fetchedAt: Date.now(), results: data.results };
        setNews(data.results);
        setRateLimitedUntil(null);
        setNewsFocus(topic);
        setSearchNotice(
          options?.source === 'voice'
            ? buildRefreshNotice(topic, category)
            : `Showing ${topic} in ${category.toLowerCase()}.`
        );
        return data.results;
      } catch (error) {
        console.error('News fetch error:', error);
        if (error instanceof SearchWebError && error.status === 429) {
          const waitSeconds = error.retryAfterSeconds ?? 15;
          setRateLimitedUntil(Date.now() + waitSeconds * 1000);
          setSearchNotice(`Firecrawl rate limit hit. Try again in about ${waitSeconds}s.`);
          toast.warning(`Search is cooling down for ${waitSeconds}s to respect Firecrawl limits.`);
        } else {
          setSearchNotice('Search is unavailable right now.');
          toast.error('Could not load fresh stories right now.');
        }

        const fallback = cached?.results ?? [];
        setNews(fallback);
        return fallback;
      } finally {
        setLoadingNews(false);
        window.setTimeout(() => setSearchingVoice(false), 250);
      }
    },
    [newsFocus, prefs?.interests, rateLimitedUntil]
  );

  const startConversation = useCallback(
    async (briefingStories?: SearchResult[]) => {
      try {
        setVoiceIssue(null);
        setVoiceNote('Preparing microphone...');
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setVoiceNote('Requesting ElevenLabs session...');
        const auth = await getConversationAuth(prefs?.name);
        console.info('[Newzzy voice] auth mode', auth.connectionType);
        const focusTopic = getPrimaryTopic(prefs?.interests);
        pendingGreetingRef.current = {
          context: buildDailyContext(prefs?.name, focusTopic, briefingStories ?? []),
          briefing: buildDailyBriefing(prefs?.name, prefs?.interests, briefingStories ?? []),
        };
        const sessionConfig = auth.conversationToken
          ? { conversationToken: auth.conversationToken, connectionType: 'webrtc' as const }
          : { signedUrl: auth.signedUrl!, connectionType: 'websocket' as const };

        const conversationId = await conversation.startSession({
          ...sessionConfig,
          useWakeLock: true,
        } as any);
        setStarted(true);
        setVoiceNote(`Connected · ${auth.connectionType} · ${conversationId}`);
        toast.success('Companion connected.');
      } catch (error) {
        console.error('Failed to start:', error);
        pendingGreetingRef.current = null;
        const formatted = formatVoiceError(error);
        setVoiceIssue(formatted);
        setVoiceNote('Voice connection failed');
        toast.error('Could not start the voice session. Check your mic and ElevenLabs setup.');
        setStarted(false);
      }
    },
    [conversation, prefs?.interests, prefs?.name]
  );

  const stopConversation = useCallback(async () => {
    try {
      await conversation.endSession();
    } finally {
      setStarted(false);
    }
  }, [conversation]);

  useEffect(() => {
    void fetchNews(activeCategory);
  }, [activeCategory, fetchNews]);

  useEffect(() => {
    const shouldAutoStart = sessionStorage.getItem('newzzy_auto_start_target') === '/chat';
    if (!shouldAutoStart || autoStartedRef.current) return;

    autoStartedRef.current = true;
    sessionStorage.removeItem('newzzy_auto_start_target');

    void (async () => {
      const stories = await fetchNews('Latest', { topicOverride: getPrimaryTopic(prefs?.interests), source: 'auto' });
      await startConversation(stories);
    })();
  }, [fetchNews, startConversation]);

  useEffect(() => {
    return () => {
      if (captionTimer.current) window.clearTimeout(captionTimer.current);
      void conversation.endSession();
    };
  }, []);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
  }, [transcript]);

  const orbState = useMemo(() => {
    if (searchingVoice) return 'searching' as const;
    if (conversation.isSpeaking) return 'speaking' as const;
    if (started && conversation.status === 'connected') return 'listening' as const;
    return 'idle' as const;
  }, [conversation.isSpeaking, conversation.status, searchingVoice, started]);

  const statusLabel =
    orbState === 'searching'
      ? 'Searching the web...'
      : conversation.status === 'connecting'
        ? 'Connecting voice...'
      : orbState === 'speaking'
        ? 'Speaking'
        : orbState === 'listening'
          ? 'Listening...'
          : 'Ready to listen';

  return (
    <div className="page-shell">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] lg:gap-6">
        <section className="panel-shell flex min-h-[calc(100vh-4rem)] flex-col overflow-hidden bg-[rgba(255,255,255,0.72)] backdrop-blur-[24px]">
          <header className="nav-glass sticky top-0 z-20 flex items-center justify-between px-5">
            <button type="button" onClick={() => navigate('/')} className="flex h-8 w-8 items-center justify-center rounded-[12px] border border-[rgba(129,207,255,0.30)] bg-[rgba(255,255,255,0.90)] text-[#1C2526]">
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#34C759]" />
              <span className="font-display text-[15px] font-semibold text-[#1C1C1E]">{prefs?.name ? `${prefs.name}'s Newzzy` : 'Newzzy'}</span>
            </div>

            <div className="status-chip hidden sm:inline-flex">Connected</div>
          </header>

          <div className="flex flex-1 flex-col gap-6 px-5 py-6 lg:px-8">
            <div className="flex min-h-[42vh] flex-col items-center justify-center gap-4 text-center">
              <GradientOrb state={orbState} accent="chat" size="lg" />
              <AnimatePresence mode="wait">
                <motion.p
                  key={statusLabel}
                  className="text-[13px] text-[#8E8E93]"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  {statusLabel}
                </motion.p>
              </AnimatePresence>
              <LiveCaptions text={caption} accent="chat" />
              <div className="space-y-2">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={started ? () => void stopConversation() : () => void startConversation(news)}
                  className={cn(
                    'relative flex h-[58px] w-[58px] items-center justify-center rounded-full text-white shadow-[0_8px_24px_rgba(0,163,255,0.40),inset_0_2px_4px_rgba(255,255,255,0.30)]',
                    started
                      ? 'bg-[linear-gradient(135deg,#ff6b6b,#E24B4A)] shadow-[0_8px_24px_rgba(226,75,74,0.40)]'
                      : 'bg-[linear-gradient(135deg,#00B4FF,#0099FF)]'
                  )}
                >
                  {started ? <MicOff className="h-[22px] w-[22px]" /> : <Mic className="h-[22px] w-[22px]" />}
                </motion.button>
                <p className="text-[11px] text-[#8E8E93]">{started ? 'Tap to end session' : 'Tap to start live chat'}</p>
                <p className="text-[11px] text-[#8E8E93]">{voiceNote}</p>
                {voiceIssue ? <p className="max-w-[320px] text-[11px] text-[#E24B4A]">{voiceIssue}</p> : null}
              </div>
            </div>

            <div className="glass rounded-[var(--radius-lg)] px-4 py-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-display text-[15px] font-semibold text-[#1C1C1E]">Live transcript</p>
                  <p className="text-[11px] text-[#8E8E93]">A rolling thread of your conversation.</p>
                </div>
                <span className="text-[11px] text-[#8E8E93]">{transcript.length} messages</span>
              </div>
              <div ref={transcriptRef} className="max-h-[220px] space-y-3 overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                  {transcript.length === 0 ? (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-[140px] flex-col items-center justify-center rounded-[var(--radius-lg)] border border-[rgba(129,207,255,0.18)] bg-[rgba(255,255,255,0.55)] text-center">
                      <Radio className="mb-3 h-5 w-5 text-[#8E8E93]" />
                      <p className="text-[13px] text-[#8E8E93]">Your conversation will appear here once the mic is active.</p>
                    </motion.div>
                  ) : (
                    transcript.map((entry) => (
                      <motion.div key={entry.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={cn('flex', entry.role === 'user' ? 'justify-end' : 'justify-start')}>
                        <div className="max-w-[82%] space-y-1">
                          <div className={cn('flex items-center gap-2 text-[11px] text-[#8E8E93]', entry.role === 'user' && 'justify-end')}>
                            <span>{entry.role === 'user' ? 'You' : 'Newzzy'}</span>
                            <span>{entry.timestamp}</span>
                          </div>
                          <div
                            className={cn(
                              'rounded-[16px] border px-3 py-2 text-[13px] leading-6',
                              entry.role === 'user'
                                ? 'rounded-br-[6px] border-[rgba(0,163,255,0.18)] bg-[linear-gradient(135deg,rgba(0,180,255,0.12),rgba(0,153,255,0.08))] text-[#0066AA]'
                                : 'rounded-bl-[6px] border-[rgba(129,207,255,0.25)] bg-[rgba(255,255,255,0.90)] text-[#1C1C1E]'
                            )}
                          >
                            {entry.text}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        <aside className="panel-shell flex min-h-[calc(100vh-4rem)] flex-col overflow-hidden bg-[rgba(255,255,255,0.72)] backdrop-blur-[24px]">
          <div className="nav-glass sticky top-0 z-20 px-5 py-3">
            <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-[17px] font-semibold text-[#1C1C1E]">What's happening</h2>
                  <div className="mt-1 flex items-center gap-2 text-[12px] text-[#8E8E93]">
                  <span>Live from the web · {newsFocus}</span>
                  <span className="h-2 w-2 rounded-full bg-[#E24B4A]" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="status-chip">
                  <Newspaper className="h-3.5 w-3.5 text-[#00A3FF]" />
                  <span>{news.length || 0}</span>
                </div>
                <button type="button" onClick={() => void fetchNews(activeCategory, { force: true })} className="glass flex h-9 w-9 items-center justify-center rounded-full text-[#00A3FF]" aria-label="Refresh stories">
                  <RefreshCcw className="h-4 w-4" />
                </button>
              </div>
            </div>
            {searchNotice ? <p className="mt-2 text-[12px] text-[#8E8E93]">{searchNotice}</p> : null}
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={cn(
                    'rounded-full border px-3 py-2 text-[12px] font-medium whitespace-nowrap',
                    activeCategory === category
                      ? 'border-transparent bg-[linear-gradient(135deg,#00B4FF,#0099FF)] text-white shadow-[0_4px_12px_rgba(0,163,255,0.30)]'
                      : 'border-[rgba(129,207,255,0.25)] bg-[rgba(255,255,255,0.80)] text-[#8E8E93]'
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <AnimatePresence mode="wait">
              {loadingNews ? (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  {Array.from({ length: 3 }).map((_, index) => <NewsSkeleton key={index} />)}
                </motion.div>
              ) : news.length === 0 ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass flex min-h-[300px] flex-col items-center justify-center rounded-[var(--radius-xl)] px-6 text-center">
                  <Sparkles className="mb-4 h-5 w-5 text-[#8E8E93]" />
                  <p className="font-display text-[15px] font-semibold text-[#1C1C1E]">No fresh results right now</p>
                  <p className="mt-2 text-[13px] text-[#8E8E93]">Try another category after the cooldown, or refresh once the backend is ready.</p>
                </motion.div>
              ) : (
                <motion.div key={activeCategory} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  {news.map((item, index) => (
                    <motion.article key={`${item.url}-${index}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} className="glass-card glass-card-hover rounded-[var(--radius-lg)] p-4">
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="aspect-video w-full rounded-[var(--radius-md)] object-cover" />
                      ) : (
                        <div className="flex aspect-video items-center justify-center rounded-[var(--radius-md)] bg-[linear-gradient(135deg,rgba(129,207,255,0.35),rgba(255,255,255,0.75))] text-4xl font-display text-[#1C1C1E]">
                          {buildPlaceholder(item.source || item.title)}
                        </div>
                      )}
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between gap-3 text-[11px] text-[#8E8E93]">
                          <div className="flex items-center gap-2">
                            <span className="glass flex h-4 w-4 items-center justify-center rounded-full text-[9px] uppercase text-[#8E8E93]">{buildPlaceholder(item.source)}</span>
                            <span>{item.source || 'Web source'}</span>
                          </div>
                          <span className="inline-flex items-center gap-1 text-[#E24B4A]"><span className="h-1.5 w-1.5 rounded-full bg-[#E24B4A]" />Live</span>
                        </div>
                        <div className="space-y-2">
                          <h3 className="font-display text-[13px] font-semibold leading-5 text-[#1C1C1E] line-clamp-2">{item.title}</h3>
                          <p className="text-[12px] leading-5 text-[#8E8E93] line-clamp-2">{item.description || 'Open the source for the full article and context.'}</p>
                        </div>
                        <div className="flex items-center justify-between gap-3 pt-1">
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[12px] text-[#8E8E93] hover:text-[#1C1C1E]">
                            <ExternalLink className="h-3.5 w-3.5" />
                            Read more
                          </a>
                          {!['Videos', 'Social'].includes(activeCategory) ? (
                            <button type="button" onClick={() => navigate(`/debate?topic=${encodeURIComponent(item.title)}`)} className="rounded-full border border-[rgba(226,75,74,0.22)] bg-[rgba(226,75,74,0.08)] px-3 py-1.5 text-[11px] font-medium text-[#E24B4A]">
                              Debate this
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>
      </div>
    </div>
  );
}
