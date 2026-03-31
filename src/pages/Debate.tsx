import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useConversation } from '@elevenlabs/react';
import { motion } from 'framer-motion';
import { Mic, MicOff, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GradientOrb } from '@/components/GradientOrb';
import { LiveCaptions } from '@/components/LiveCaptions';
import { getPreferences } from '@/lib/store';
import { getSignedUrl, searchWeb } from '@/lib/api';

const TONES = ['Calm', 'Soft', 'Aggressive', 'Funny', 'Roasting', 'Professor'] as const;

interface ResearchPoint {
  text: string;
  source: string;
}

export default function Debate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefs = getPreferences();
  
  const [topic, setTopic] = useState(searchParams.get('topic') || '');
  const [tone, setTone] = useState<string>('Calm');
  const [caption, setCaption] = useState('');
  const [started, setStarted] = useState(false);
  const [supportingPoints, setSupportingPoints] = useState<ResearchPoint[]>([]);
  const [opposingPoints, setOpposingPoints] = useState<ResearchPoint[]>([]);
  const [loadingResearch, setLoadingResearch] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const captionTimer = useRef<ReturnType<typeof setTimeout>>();

  const conversation = useConversation({
    onMessage: (message: any) => {
      if (message.type === 'agent_response') {
        const text = message.agent_response_event?.agent_response || '';
        setCaption(text);
        clearTimeout(captionTimer.current);
        captionTimer.current = setTimeout(() => setCaption(''), 2000);
      }
    },
    onError: (error) => console.error('Debate error:', error),
  });

  const startDebate = useCallback(async () => {
    if (!topic.trim()) return;
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const signedUrl = await getSignedUrl();

      await conversation.startSession({
        signedUrl,
        overrides: {
          agent: {
            firstMessage: `Alright ${prefs?.name || 'friend'}, let's debate "${topic}" in a ${tone.toLowerCase()} style. I'll take the opposing side. Make your opening argument!`,
          },
          tts: {
            voiceId: prefs?.voiceId,
          },
        },
      });
      setStarted(true);

      // Fetch research
      fetchResearch();
    } catch (err) {
      console.error('Failed to start debate:', err);
    }
  }, [conversation, prefs, topic, tone]);

  const stopDebate = useCallback(async () => {
    await conversation.endSession();
    setStarted(false);
  }, [conversation]);

  const fetchResearch = async () => {
    setLoadingResearch(true);
    try {
      const [forRes, againstRes] = await Promise.all([
        searchWeb(`arguments for ${topic}`, true),
        searchWeb(`arguments against ${topic}`, true),
      ]);

      setSupportingPoints(
        forRes.results.flatMap(r =>
          (r.keyPoints || []).map(kp => ({ text: kp, source: r.source }))
        ).slice(0, 8)
      );
      setOpposingPoints(
        againstRes.results.flatMap(r =>
          (r.keyPoints || []).map(kp => ({ text: kp, source: r.source }))
        ).slice(0, 8)
      );
    } catch (err) {
      console.error('Research error:', err);
    }
    setLoadingResearch(false);
  };

  const toggleCard = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Auto-start if topic from URL
  useEffect(() => {
    if (searchParams.get('topic')) {
      // Don't auto-start voice, but fetch research
      fetchResearch();
    }
  }, []);

  useEffect(() => {
    return () => { conversation.endSession(); };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-bold text-lg text-destructive">Newzzy Debate</h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Debate Voice UI */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
          {!started ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full max-w-md space-y-4"
            >
              <Input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="Enter debate topic..."
                className="text-center"
              />
              <div className="flex flex-wrap gap-2 justify-center">
                {TONES.map(t => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                      tone === t
                        ? 'bg-destructive text-destructive-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <Button
                variant="destructive"
                size="lg"
                className="w-full"
                onClick={startDebate}
                disabled={!topic.trim()}
              >
                Start Debate
              </Button>
            </motion.div>
          ) : (
            <>
              <GradientOrb isSpeaking={conversation.isSpeaking} variant="debate" />
              <LiveCaptions text={caption} />
              <p className="text-sm font-medium text-destructive">"{topic}"</p>
              <Button
                size="lg"
                variant="destructive"
                className="rounded-full w-16 h-16"
                onClick={stopDebate}
              >
                <MicOff className="h-6 w-6" />
              </Button>
              <p className="text-xs text-muted-foreground">
                {conversation.isSpeaking ? 'AI is arguing...' : 'Your turn...'}
              </p>
            </>
          )}
        </div>

        {/* Right: Research Panel */}
        <div className="lg:w-[480px] border-l border-border flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border">
            <h2 className="text-sm font-semibold text-center">Debate Research Assistant</h2>
          </div>

          {loadingResearch && (
            <p className="text-sm text-muted-foreground text-center py-8">Researching arguments...</p>
          )}

          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-border">
              {/* Supporting */}
              <div className="flex-1 p-3 space-y-2">
                <h3 className="text-xs font-semibold text-green-500 uppercase tracking-wider">Supporting</h3>
                {supportingPoints.map((pt, i) => {
                  const id = `for-${i}`;
                  return (
                    <motion.div
                      key={id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-lg border border-green-500/20 bg-card p-2 cursor-pointer"
                      onClick={() => toggleCard(id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs ${expandedCards.has(id) ? '' : 'line-clamp-2'}`}>
                          {pt.text}
                        </p>
                        {expandedCards.has(id) ? (
                          <ChevronUp className="h-3 w-3 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">{pt.source}</p>
                    </motion.div>
                  );
                })}
                {!loadingResearch && supportingPoints.length === 0 && (
                  <p className="text-xs text-muted-foreground">No points yet</p>
                )}
              </div>

              {/* Opposing */}
              <div className="flex-1 p-3 space-y-2">
                <h3 className="text-xs font-semibold text-destructive uppercase tracking-wider">Opposing</h3>
                {opposingPoints.map((pt, i) => {
                  const id = `against-${i}`;
                  return (
                    <motion.div
                      key={id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-lg border border-destructive/20 bg-card p-2 cursor-pointer"
                      onClick={() => toggleCard(id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs ${expandedCards.has(id) ? '' : 'line-clamp-2'}`}>
                          {pt.text}
                        </p>
                        {expandedCards.has(id) ? (
                          <ChevronUp className="h-3 w-3 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">{pt.source}</p>
                    </motion.div>
                  );
                })}
                {!loadingResearch && opposingPoints.length === 0 && (
                  <p className="text-xs text-muted-foreground">No points yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
