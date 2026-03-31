import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConversation } from '@elevenlabs/react';
import { motion } from 'framer-motion';
import { Mic, MicOff, ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GradientOrb } from '@/components/GradientOrb';
import { LiveCaptions } from '@/components/LiveCaptions';
import { getPreferences } from '@/lib/store';
import { getSignedUrl, searchWeb, type SearchResult } from '@/lib/api';

const CATEGORIES = ['Latest', 'Memes', 'Videos', 'Official', 'Social'] as const;

const CATEGORY_FILTERS: Record<string, string> = {
  Latest: '',
  Memes: 'memes reddit',
  Videos: 'youtube video',
  Official: 'site:reuters.com OR site:bbc.com OR site:apnews.com',
  Social: 'site:twitter.com OR site:reddit.com',
};

interface TranscriptEntry {
  role: 'user' | 'agent';
  text: string;
}

export default function Chat() {
  const navigate = useNavigate();
  const prefs = getPreferences();
  const [caption, setCaption] = useState('');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('Latest');
  const [news, setNews] = useState<SearchResult[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [started, setStarted] = useState(false);
  const captionTimer = useRef<ReturnType<typeof setTimeout>>();
  const transcriptRef = useRef<HTMLDivElement>(null);

  const conversation = useConversation({
    onMessage: (message: any) => {
      if (message.type === 'agent_response') {
        const text = message.agent_response_event?.agent_response || '';
        setCaption(text);
        setTranscript(prev => [...prev, { role: 'agent', text }]);
        clearTimeout(captionTimer.current);
        captionTimer.current = setTimeout(() => setCaption(''), 2000);
      }
      if (message.type === 'user_transcript') {
        const text = message.user_transcription_event?.user_transcript || '';
        if (text) setTranscript(prev => [...prev, { role: 'user', text }]);
      }
    },
    onError: (error) => console.error('Conversation error:', error),
  });

  const startConversation = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const signedUrl = await getSignedUrl();
      const interests = prefs?.interests?.join(', ') || 'general news';
      
      await conversation.startSession({
        signedUrl,
        overrides: {
          agent: {
            firstMessage: `Hey ${prefs?.name || 'there'}! I'm Newzzy, your AI news companion. I see you're interested in ${interests}. What would you like to hear about today?`,
          },
          tts: {
            voiceId: prefs?.voiceId,
          },
        },
      });
      setStarted(true);
    } catch (err) {
      console.error('Failed to start:', err);
    }
  }, [conversation, prefs]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
    setStarted(false);
  }, [conversation]);

  // Auto-start on mount
  useEffect(() => {
    startConversation();
    return () => {
      conversation.endSession();
    };
  }, []);

  // Fetch news
  useEffect(() => {
    const fetchNews = async () => {
      setLoadingNews(true);
      try {
        const interests = prefs?.interests?.join(' OR ') || 'technology';
        const filter = CATEGORY_FILTERS[activeCategory];
        const query = `${interests} news ${filter}`.trim();
        const data = await searchWeb(query);
        setNews(data.results);
      } catch (err) {
        console.error('News fetch error:', err);
      }
      setLoadingNews(false);
    };
    fetchNews();
  }, [activeCategory]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
  }, [transcript]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-bold text-lg">Newzzy</h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Voice UI */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
          <GradientOrb isSpeaking={conversation.isSpeaking} />
          <LiveCaptions text={caption} />

          <Button
            size="lg"
            variant={started ? 'destructive' : 'default'}
            className="rounded-full w-16 h-16"
            onClick={started ? stopConversation : startConversation}
          >
            {started ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>

          <p className="text-xs text-muted-foreground">
            {conversation.status === 'connected' ? (conversation.isSpeaking ? 'AI is speaking...' : 'Listening...') : 'Disconnected'}
          </p>

          {/* Transcript */}
          <div
            ref={transcriptRef}
            className="w-full max-w-md h-40 overflow-y-auto space-y-2 p-3 rounded-lg bg-card/50 backdrop-blur-sm border border-border"
          >
            {transcript.map((entry, i) => (
              <div key={i} className={`text-sm ${entry.role === 'user' ? 'text-muted-foreground' : 'text-foreground'}`}>
                <span className="font-medium">{entry.role === 'user' ? 'You' : 'Newzzy'}:</span>{' '}
                {entry.text}
              </div>
            ))}
          </div>
        </div>

        {/* Right: News Feed */}
        <div className="lg:w-96 border-l border-border flex flex-col overflow-hidden">
          <div className="flex gap-1 p-3 overflow-x-auto border-b border-border">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
                  activeCategory === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {loadingNews && <p className="text-sm text-muted-foreground text-center py-4">Loading news...</p>}
            {news.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-lg border border-border bg-card/50 backdrop-blur-sm overflow-hidden"
              >
                {item.image && (
                  <img src={item.image} alt={item.title} className="w-full h-32 object-cover" />
                )}
                <div className="p-3 space-y-2">
                  <h3 className="text-sm font-medium line-clamp-2">{item.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{item.source}</span>
                    <div className="flex gap-1">
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          <ExternalLink className="h-3 w-3 mr-1" /> Open
                        </Button>
                      </a>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => navigate(`/debate?topic=${encodeURIComponent(item.title)}`)}
                      >
                        Debate this
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
