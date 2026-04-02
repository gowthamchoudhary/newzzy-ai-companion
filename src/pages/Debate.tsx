import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useConversation } from '@elevenlabs/react';
import {
  ArrowLeft,
  BookOpen,
  Brain,
  ChevronDown,
  ChevronUp,
  Flame,
  Heart,
  Laugh,
  MicOff,
  Search,
  Sparkles,
  Swords,
  Sword,
  XCircle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GradientOrb } from '@/components/GradientOrb';
import { LiveCaptions } from '@/components/LiveCaptions';
import { getPreferences } from '@/lib/store';
import { SearchWebError, getConversationAuth, searchWeb } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';

const TONES = [
  { name: 'Calm', icon: Brain, description: 'Measured and strategic.' },
  { name: 'Soft', icon: Heart, description: 'Gentle but persuasive.' },
  { name: 'Aggressive', icon: Flame, description: 'Fast, sharp, relentless.' },
  { name: 'Funny', icon: Laugh, description: 'Playful with smart jabs.' },
  { name: 'Roasting', icon: Sparkles, description: 'Confident and biting.' },
  { name: 'Professor', icon: BookOpen, description: 'Analytical and evidence-first.' },
] as const;
const POINTS_BATCH_SIZE = 5;

interface ResearchPoint {
  text: string;
  source: string;
}

function buildDebateKickoff(topic?: string, tone?: string) {
  if (topic?.trim()) {
    return `Let's begin the debate on ${topic}. Use a ${tone?.toLowerCase() || 'calm'} tone, take the opposing side, and ask for my opening argument.`;
  }

  return `Welcome me to Debate Arena, mention that we can start with any topic, and ask me what I want to debate first.`;
}

function isValidResearchPoint(text: string) {
  const trimmed = text.trim();
  if (trimmed.length < 40 || trimmed.length > 400) return false;
  if ((trimmed.match(/[{}:;<>_=#]/g) || []).length / trimmed.length > 0.08) return false;
  const junkPatterns = /(@media|module__|__[A-Za-z0-9]+|rgb\(|display:\s|margin[-:]\s|padding[-:]\s|border[-:]\s|background:\s|color:\s|max-width|min-width|justify-content|align-items|flex-direction|odds|betmgm|advertisement|promo|cookie policy)/i;
  if (junkPatterns.test(trimmed)) return false;
  return true;
}

function sanitizeResearchPoints(points: ResearchPoint[]) {
  const seen = new Set<string>();
  return points.filter((point) => {
    if (!isValidResearchPoint(point.text)) return false;
    const key = point.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildDebateWelcome(name?: string) {
  const today = new Date().toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return `Hi ${name || 'there'}. Welcome to Debate Arena. It's ${today}. Open with a friendly greeting, mention that today's big stories are shaping the conversation, and invite them to pick any topic they want to debate.`;
}

function buildDebatePrompt(name: string | undefined, topic: string, tone: string) {
  const today = new Date().toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return `Hi ${name || 'there'}. It's ${today}. We are starting a debate on "${topic}" in a ${tone.toLowerCase()} style. Greet them naturally, give a quick framing line for the topic, then take the opposing side and invite their opening argument.`;
}

function buildDebateContext(name: string | undefined, topic?: string, tone?: string) {
  const today = new Date().toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  if (topic?.trim()) {
    return `The user is ${name || 'there'}. It is ${today}. Start the debate naturally on "${topic}" in a ${tone?.toLowerCase() || 'calm'} style, take the opposing side, and invite their opening argument.`;
  }

  return `The user is ${name || 'there'}. It is ${today}. Open with a friendly greeting, mention that today's major stories are shaping the conversation, and invite them to choose any topic for a debate.`;
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

function ResearchSkeleton({ accent }: { accent: 'green' | 'red' }) {
  return (
    <div className={cn('rounded-[var(--radius-md)] border border-white/10 bg-white/6 p-3 backdrop-blur-[10px]', accent === 'green' ? 'border-l-[3px] border-l-[rgba(39,167,69,0.60)]' : 'border-l-[3px] border-l-[rgba(226,75,74,0.60)]')}>
      <div className="skeleton-shimmer h-4 w-24 rounded-full" />
      <div className="mt-3 space-y-2">
        <div className="skeleton-shimmer h-3.5 w-full rounded" />
        <div className="skeleton-shimmer h-3.5 w-5/6 rounded" />
        <div className="skeleton-shimmer h-3.5 w-4/6 rounded" />
      </div>
    </div>
  );
}

function PointCard({ id, point, accent, expanded, onToggle }: { id: string; point: ResearchPoint; accent: 'supporting' | 'opposing'; expanded: boolean; onToggle: (id: string) => void }) {
  const borderAccent = accent === 'supporting' ? 'border-l-[3px] border-l-[rgba(39,167,69,0.60)]' : 'border-l-[3px] border-l-[rgba(226,75,74,0.60)]';

  return (
    <button type="button" onClick={() => onToggle(id)} className={cn('w-full rounded-[var(--radius-md)] border border-white/10 bg-white/6 p-3 text-left text-white backdrop-blur-[10px] transition hover:translate-y-[-1px] hover:bg-white/9', borderAccent)}>
      <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(129,207,255,0.12)] px-2 py-1 text-[10px] text-[rgba(255,255,255,0.6)]">
        <span className="h-4 w-4 rounded-full bg-white/12 text-center text-[8px] leading-4 uppercase text-white">{(point.source || 'web').charAt(0)}</span>
        {point.source || 'web'}
      </div>
      <p className={cn('mt-3 text-[12px] leading-6 text-white', !expanded && 'line-clamp-3')}>{point.text}</p>
      <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-[rgba(255,255,255,0.55)]">
        {expanded ? 'Show less' : 'Show more'}
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </div>
    </button>
  );
}

export default function Debate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefs = getPreferences();
  const initialTopic = searchParams.get('topic') || prefs?.interests?.[0] || '';

  const [topic, setTopic] = useState(initialTopic);
  const [tone, setTone] = useState<(typeof TONES)[number]['name']>('Calm');
  const [caption, setCaption] = useState('');
  const [started, setStarted] = useState(false);
  const [debateReady, setDebateReady] = useState(Boolean(searchParams.get('topic') || initialTopic));
  const [supportingPoints, setSupportingPoints] = useState<ResearchPoint[]>([]);
  const [visibleSupportingCount, setVisibleSupportingCount] = useState(POINTS_BATCH_SIZE);
  const [loadingResearch, setLoadingResearch] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [voiceNote, setVoiceNote] = useState('Idle');
  const [voiceIssue, setVoiceIssue] = useState<string | null>(null);
  const [entryNotice, setEntryNotice] = useState<string | null>(null);
  const captionTimer = useRef<ReturnType<typeof setTimeout>>();
  const autoStartedRef = useRef(false);
  const heardAudioRef = useRef(false);
  const pendingDebateRef = useRef<{ context: string; kickoff: string } | null>(null);

  const conversation = useConversation({
    onConnect: ({ conversationId }: any) => {
      console.info('[Newzzy debate voice] connected', conversationId);
      setStarted(true);
      setVoiceIssue(null);
      setVoiceNote(`Connected · ${conversationId}`);
      if (pendingDebateRef.current) {
        const { context, kickoff } = pendingDebateRef.current;
        window.setTimeout(() => {
          try {
            conversation.sendContextualUpdate(context);
            conversation.sendUserMessage(kickoff);
            conversation.sendUserActivity();
          } catch (error) {
            console.error('Debate greeting handoff failed:', error);
          }
        }, 150);
        pendingDebateRef.current = null;
      }
    },
    onDisconnect: (details: any) => {
      console.info('[Newzzy debate voice] disconnected', serializeVoiceDetails(details));
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
      console.info('[Newzzy debate voice] status', status);
      setVoiceNote(status === 'connecting' ? 'Connecting voice...' : status === 'connected' ? 'Connected' : status === 'error' ? 'Voice session error' : 'Idle');
    },
    onDebug: (info: any) => {
      console.debug('[Newzzy debate voice] debug', info);
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
        setCaption(text);
        if (captionTimer.current) window.clearTimeout(captionTimer.current);
        captionTimer.current = window.setTimeout(() => setCaption(''), 2000) as unknown as ReturnType<typeof setTimeout>;
      }
    },
    onError: (error) => {
      console.error('Debate error:', error);
      const formatted = formatVoiceError(error);
      setVoiceIssue(formatted);
      setVoiceNote('Voice session error');
      toast.error('Debate session hit an error.');
      setStarted(false);
      setDebateReady(false);
    },
  });

  const fetchResearch = useCallback(async () => {
    if (!topic.trim()) return;
    setLoadingResearch(true);
    try {
      const supportingRes = await searchWeb(`supporting arguments for debate topic ${topic}`, true);
      const supporting = sanitizeResearchPoints(
        supportingRes.results.flatMap((result) => (result.keyPoints || []).map((point) => ({ text: point, source: result.source })))
      ).slice(0, 10);

      setSupportingPoints(supporting);
      setVisibleSupportingCount(POINTS_BATCH_SIZE);

      if (supporting.length === 0) {
        throw new Error('Supporting research returned no usable points');
      }
    } catch (error) {
      console.error('Research error:', error);
      if (error instanceof SearchWebError && error.status === 429) {
        const waitSeconds = error.retryAfterSeconds ?? 15;
        toast.warning(`Research cooling down for about ${waitSeconds}s because Firecrawl rate limited us.`);
      } else {
        toast.error('Could not load supporting debate points.');
      }
      setSupportingPoints([]);
    } finally {
      setLoadingResearch(false);
    }
  }, [topic]);

  const startDebateSession = useCallback(
    async (contextPrompt: string) => {
      setVoiceIssue(null);
      setVoiceNote('Preparing microphone...');
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setVoiceNote('Requesting ElevenLabs session...');
      const auth = await getConversationAuth(prefs?.name);
      pendingDebateRef.current = {
        context: contextPrompt,
        kickoff: buildDebateKickoff(topic, tone),
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
    },
    [conversation, prefs?.name, tone, topic]
  );

  const startDebate = useCallback(async () => {
    if (!topic.trim()) {
      toast.info('Add a debate topic first.');
      return;
    }

    try {
      if (!started) {
        await startDebateSession(buildDebateContext(prefs?.name, topic, tone));
      } else {
        conversation.sendContextualUpdate(`The user chose the debate topic "${topic}" and wants a ${tone.toLowerCase()} style debate. Take the opposing side and invite their opening argument.`);
        conversation.sendUserMessage(buildDebateKickoff(topic, tone));
        conversation.sendUserActivity();
      }

      setDebateReady(true);
      toast.success('Debate arena is live.');
      void fetchResearch();
    } catch (error) {
      console.error('Failed to start debate:', error);
      const formatted = formatVoiceError(error);
      setVoiceIssue(formatted);
      setVoiceNote('Voice connection failed');
      toast.error('Could not start the debate session.');
      setStarted(false);
      setDebateReady(false);
    }
  }, [conversation, fetchResearch, prefs?.name, startDebateSession, started, tone, topic]);

  const stopDebate = useCallback(async () => {
    try {
      await conversation.endSession();
    } finally {
      setStarted(false);
      setDebateReady(false);
    }
  }, [conversation]);

  useEffect(() => {
    const shouldAutoStart = sessionStorage.getItem('newzzy_auto_start_target') === '/debate';
    if (!shouldAutoStart || autoStartedRef.current) return;

    autoStartedRef.current = true;
    sessionStorage.removeItem('newzzy_auto_start_target');
    setEntryNotice('Pick a topic and tap Start Debate to enable the mic. Browsers often block auto-start voice here.');
  }, []);

  useEffect(() => {
    return () => {
      if (captionTimer.current) window.clearTimeout(captionTimer.current);
      void conversation.endSession();
    };
  }, []);

  const orbState = useMemo(() => {
    if (loadingResearch) return 'searching' as const;
    if (conversation.isSpeaking) return 'speaking' as const;
    if (started && conversation.status === 'connected') return 'listening' as const;
    return 'idle' as const;
  }, [conversation.isSpeaking, conversation.status, loadingResearch, started]);

  const statusText =
    orbState === 'searching'
      ? 'Searching the web for arguments...'
      : conversation.status === 'connecting'
        ? 'Connecting voice...'
      : orbState === 'speaking'
        ? 'Speaking'
        : orbState === 'listening'
          ? 'Listening...'
          : 'Ready to spar';

  const toggleCard = (id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const visibleSupportingPoints = supportingPoints.slice(0, visibleSupportingCount);

  return (
    <div className="page-shell">
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <section className="panel-shell flex min-h-[calc(100vh-4rem)] flex-col overflow-hidden bg-[rgba(255,255,255,0.72)] backdrop-blur-[24px]">
          <header className="nav-glass sticky top-0 z-20 flex items-center justify-between px-5">
            <button type="button" onClick={() => navigate('/chat')} className="flex h-8 w-8 items-center justify-center rounded-[12px] border border-[rgba(129,207,255,0.30)] bg-[rgba(255,255,255,0.90)] text-[#1C2526]">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 font-display text-[15px] font-semibold text-[#E24B4A]">
              <Sword className="h-4 w-4" />
              Debate Arena
            </div>
            <div className="rounded-full border border-[rgba(226,75,74,0.22)] bg-[rgba(226,75,74,0.10)] px-3 py-1 text-[12px] text-[#E24B4A]">{tone}</div>
          </header>

          <div className="flex flex-1 flex-col px-5 py-6 lg:px-8">
            {!debateReady ? (
              <div className="glass mx-auto flex w-full max-w-[560px] flex-1 flex-col justify-center rounded-[var(--radius-2xl)] px-6 py-8 text-center sm:px-8">
                <div className="space-y-3">
                  <h1 className="font-display text-[24px] font-bold text-[#1C1C1E]">Pick your battle</h1>
                  <p className="text-[13px] text-[#8E8E93]">Choose a topic. Pick your tone.</p>
                  {started ? <p className="text-[12px] text-[#00A3FF]">Your debate companion is already connected and listening.</p> : null}
                  {entryNotice ? <p className="text-[12px] text-[#8E8E93]">{entryNotice}</p> : null}
                </div>
                <div className="mt-6 space-y-4">
                  <Input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Enter debate topic..." className="editorial-input editorial-input-red h-[52px] text-center" />
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {TONES.map((toneOption) => {
                      const Icon = toneOption.icon;
                      const selected = tone === toneOption.name;
                      return (
                        <button
                          key={toneOption.name}
                          type="button"
                          onClick={() => setTone(toneOption.name)}
                          className={cn(
                            'glass-card glass-card-hover flex h-20 flex-col items-center justify-center gap-1.5 rounded-[var(--radius-lg)] p-3 text-center',
                            selected ? 'border-2 border-[#E24B4A] bg-[rgba(226,75,74,0.06)] opacity-100 shadow-[0_0_0_4px_rgba(226,75,74,0.08)]' : 'opacity-70'
                          )}
                        >
                          <Icon className={cn('h-5 w-5 text-[#8E8E93]', selected && 'text-[#E24B4A]')} />
                          <p className="text-[13px] font-medium text-[#1C1C1E]">{toneOption.name}</p>
                          <p className="text-[11px] text-[#8E8E93]">{toneOption.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Button onClick={() => void startDebate()} className="mt-6 h-[54px] w-full rounded-full border border-[rgba(255,255,255,0.08)] bg-[#1C2526] text-[16px] font-semibold text-white shadow-[var(--shadow-bar)] hover:bg-[#2d3436]">
                  <Swords className="mr-2 h-[18px] w-[18px]" />
                  Start Debate
                </Button>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                <GradientOrb state={orbState} accent="debate" size="lg" />
                <AnimatePresence mode="wait">
                  <motion.p key={statusText} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="text-[13px] text-[#8E8E93]">
                    {statusText}
                  </motion.p>
                </AnimatePresence>
                <LiveCaptions text={caption} accent="debate" />
                <p className="rounded-full border border-[rgba(226,75,74,0.22)] bg-[rgba(226,75,74,0.08)] px-4 py-1.5 text-[13px] text-[#E24B4A]">{topic || 'Open topic'}</p>
                <div className="space-y-2">
                  <button type="button" onClick={() => void stopDebate()} className="relative flex h-[58px] w-[58px] items-center justify-center rounded-full bg-[linear-gradient(135deg,#ff6b6b,#E24B4A)] text-white shadow-[0_8px_24px_rgba(226,75,74,0.40)]">
                    <MicOff className="h-[22px] w-[22px]" />
                  </button>
                  <p className="text-[11px] text-[#8E8E93]">Tap to end debate</p>
                  <p className="text-[11px] text-[#8E8E93]">{voiceNote}</p>
                  {voiceIssue ? <p className="max-w-[320px] text-[11px] text-[#E24B4A]">{voiceIssue}</p> : null}
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="panel-shell flex min-h-[calc(100vh-4rem)] flex-col overflow-hidden border-[rgba(28,37,38,0.10)] bg-[rgba(28,37,38,0.82)] text-white shadow-[0_24px_50px_-12px_rgba(28,37,38,0.28)] backdrop-blur-[28px]">
          <div className="sticky top-0 z-20 border-b border-white/10 bg-[rgba(24,31,36,0.76)] px-5 py-3 backdrop-blur-[22px]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-[16px] font-semibold text-white">Debate Assistant</h2>
                <p className="mt-1 text-[12px] text-[rgba(255,255,255,0.65)]">Real-time research from the web</p>
              </div>
              <div className="rounded-full border border-[rgba(129,207,255,0.20)] bg-[rgba(255,255,255,0.08)] px-3 py-1 text-[11px] text-[#cfe9ff]">Powered by Firecrawl</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {!topic.trim() && !loadingResearch ? (
              <div className="flex min-h-[340px] flex-col items-center justify-center text-center">
                <Search className="mb-4 h-8 w-8 text-[rgba(255,255,255,0.45)]" />
                <p className="text-[13px] text-[rgba(255,255,255,0.65)]">Enter a topic to load research</p>
              </div>
            ) : (
              <div className="space-y-3">
                <section className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-[rgba(39,167,69,0.20)] pb-3 text-[12px] font-semibold text-[#27A745]">
                    <CheckCircle2 className="h-4 w-4" />
                    Supporting
                  </div>
                  {loadingResearch ? (
                    <div className="space-y-3">{Array.from({ length: 3 }).map((_, index) => <ResearchSkeleton key={index} accent="green" />)}</div>
                  ) : supportingPoints.length === 0 ? (
                    <div className="rounded-[var(--radius-md)] border border-white/10 bg-white/5 p-5 text-center text-[12px] text-[rgba(255,255,255,0.65)]">No supporting arguments yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {visibleSupportingPoints.map((point, index) => {
                        const id = `supporting-${index}`;
                        return (
                          <motion.div key={id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
                            <PointCard id={id} point={point} accent="supporting" expanded={expandedCards.has(id)} onToggle={toggleCard} />
                          </motion.div>
                        );
                      })}
                      {visibleSupportingCount < supportingPoints.length ? (
                        <button
                          type="button"
                          onClick={() => setVisibleSupportingCount((count) => Math.min(count + POINTS_BATCH_SIZE, supportingPoints.length))}
                          className="w-full rounded-full border border-[rgba(39,167,69,0.22)] bg-[rgba(39,167,69,0.10)] px-4 py-2 text-[12px] font-medium text-[#7be495] transition hover:bg-[rgba(39,167,69,0.16)]"
                        >
                          Add 5 more supporting points
                        </button>
                      ) : null}
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
