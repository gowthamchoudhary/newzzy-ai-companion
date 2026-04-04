import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, ExternalLink, Globe, MessageCircle, RefreshCcw } from 'lucide-react';
import { getPreferences } from '@/lib/store';
import { generateArticle, generateDailyBrief, type DailyBriefResponse } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { ArticleRating } from '@/components/ArticleRating';
import type { GeneratedArticle, QuickHit, ByTheNumber } from '@/lib/types';
import newzzyLogo from '@/assets/newzzy-logo.png';

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-[#00A3FF]">
      {children}
    </h2>
  );
}

function SkeletonCard() {
  return (
    <div className="glass rounded-[var(--radius-xl)] p-6">
      <div className="skeleton-shimmer h-3 w-16 rounded-full mb-3" />
      <div className="skeleton-shimmer h-6 w-full rounded-md mb-2" />
      <div className="skeleton-shimmer h-6 w-4/5 rounded-md mb-4" />
      <div className="skeleton-shimmer h-4 w-full rounded-md mb-2" />
      <div className="skeleton-shimmer h-4 w-full rounded-md mb-2" />
      <div className="skeleton-shimmer h-4 w-3/4 rounded-md" />
    </div>
  );
}

function AskAIButton({ article }: { article: GeneratedArticle }) {
  const navigate = useNavigate();
  const handleClick = () => {
    sessionStorage.setItem(
      'newzzy_article_context',
      JSON.stringify({
        headline: article.headline,
        lede: article.lede,
        body: article.body.join(' ').substring(0, 500),
      })
    );
    navigate('/chat');
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(0,163,255,0.25)] bg-[rgba(0,163,255,0.06)] px-3 py-1.5 text-[12px] font-medium text-[#00A3FF] hover:bg-[rgba(0,163,255,0.12)]"
    >
      <MessageCircle className="h-3.5 w-3.5" />
      Ask AI about this topic
    </button>
  );
}

function SourcesPills({ sources }: { sources: { name: string; url: string }[] }) {
  if (!sources.length) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap mt-3">
      <span className="flex items-center gap-1 text-[11px] text-[#8E8E93]">
        <Globe className="h-3 w-3" />
        Sources
      </span>
      {sources.map((s, i) => (
        <a
          key={i}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-[rgba(129,207,255,0.25)] bg-[rgba(255,255,255,0.8)] px-2.5 py-1 text-[11px] text-[#8E8E93] hover:text-[#1C1C1E] hover:border-[#00A3FF]"
        >
          <ExternalLink className="h-2.5 w-2.5" />
          {s.name}
        </a>
      ))}
    </div>
  );
}

function DeepDiveCard({ article, index }: { article: GeneratedArticle; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15 }}
      className="glass rounded-[var(--radius-xl)] p-6"
    >
      <span className="rounded-full bg-[linear-gradient(135deg,#00B4FF,#0099FF)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
        {article.category}
      </span>

      <h3 className="mt-3 font-display text-[20px] font-bold leading-tight text-[#1C1C1E]">
        {article.headline}
      </h3>

      <p className="mt-2 text-[14px] leading-relaxed text-[#8E8E93]">
        {article.lede}
      </p>

      <SourcesPills sources={article.sources} />

      <div className="mt-3 flex items-center gap-3 text-[11px] text-[#8E8E93]">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Generated {formatTimestamp(article.generatedAt)}
        </span>
        <span>·</span>
        <span>{article.readingTime} min read</span>
      </div>

      <div className="mt-4">
        <AskAIButton article={article} />
      </div>

      <ArticleRating articleId={article.id} />
    </motion.div>
  );
}

function QuickHitItem({ item, index }: { item: QuickHit; index: number }) {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.08 }}
      className="glass rounded-[var(--radius-lg)] px-5 py-4"
    >
      <p className="text-[14px] text-[#1C1C1E]">
        <span className="font-bold">{item.topic}</span> — {item.summary}
      </p>
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1 text-[11px] text-[#8E8E93]">
          <Globe className="h-2.5 w-2.5" />
          <a href={item.source.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#1C1C1E]">
            {item.source.name}
          </a>
        </span>
        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem(
              'newzzy_article_context',
              JSON.stringify({ headline: item.topic, lede: item.summary, body: '' })
            );
            navigate('/chat');
          }}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#00A3FF]"
        >
          <MessageCircle className="h-3 w-3" />
          Ask AI
        </button>
      </div>
      <ArticleRating articleId={item.id} />
    </motion.div>
  );
}

function ByTheNumberItem({ item, index }: { item: ByTheNumber; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 + index * 0.1 }}
      className="glass rounded-[var(--radius-lg)] px-5 py-4"
    >
      <p className="font-display text-[28px] font-bold text-[#00A3FF]">{item.number}</p>
      <p className="mt-1 text-[13px] text-[#2C2C2E]">{item.context}</p>
      <span className="mt-2 flex items-center gap-1 text-[11px] text-[#8E8E93]">
        <Globe className="h-2.5 w-2.5" />
        <a href={item.source.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#1C1C1E]">
          {item.source.name}
        </a>
      </span>
      <ArticleRating articleId={item.id} />
    </motion.div>
  );
}

export default function Brief() {
  const prefs = getPreferences();
  const [loading, setLoading] = useState(true);
  const [deepDives, setDeepDives] = useState<GeneratedArticle[]>([]);
  const [quickHits, setQuickHits] = useState<QuickHit[]>([]);
  const [byTheNumbers, setByTheNumbers] = useState<ByTheNumber[]>([]);
  const [overallRating, setOverallRating] = useState(0);

  const userTopics = prefs?.interests?.length ? prefs.interests.slice(0, 3) : ['World News', 'Tech', 'Business'];

  const loadBrief = useCallback(async () => {
    setLoading(true);
    setDeepDives([]);
    setQuickHits([]);
    setByTheNumbers([]);

    try {
      // Generate 2–3 deep dives sequentially + 1 brief section for quick hits / numbers
      const results: GeneratedArticle[] = [];

      // First: generate the brief section (quick hits + by the numbers + 1 deep dive)
      try {
        const briefData = await generateDailyBrief(userTopics);
        if (briefData.deepDive) {
          results.push(briefData.deepDive);
          setDeepDives([briefData.deepDive]);
        }
        if (briefData.quickHits) setQuickHits(briefData.quickHits);
        if (briefData.byTheNumbers) setByTheNumbers(briefData.byTheNumbers);
      } catch (err) {
        console.warn('Brief generation failed:', err);
      }

      // Second: generate 1-2 more deep dives from specific topics
      for (let i = 0; i < Math.min(2, userTopics.length); i++) {
        await new Promise(r => setTimeout(r, 1500));
        try {
          const article = await generateArticle(userTopics[i]);
          results.push(article);
          setDeepDives(prev => [...prev, article]);
        } catch (err) {
          console.warn(`Article for ${userTopics[i]} failed:`, err);
        }
      }

      if (results.length === 0) {
        toast.error('Could not generate your brief. Please try again.');
      }
    } catch (err) {
      console.error('Brief load error:', err);
      toast.error('Failed to load your daily brief.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBrief();
  }, [loadBrief]);

  return (
    <div className="page-shell pb-24">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-[28px] font-bold text-[#1C1C1E]">Your Daily Brief</h1>
          <p className="text-[13px] text-[#8E8E93]">{formatDate()}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void loadBrief()}
            disabled={loading}
            className="glass flex h-9 w-9 items-center justify-center rounded-full text-[#00A3FF] disabled:opacity-50"
            aria-label="Refresh brief"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <img src={newzzyLogo} alt="Newzzy" className="h-9 w-9 rounded-xl" />
        </div>
      </header>

      <AnimatePresence mode="wait">
        {loading && deepDives.length === 0 ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
            <div>
              <SectionLabel>Deep Dives</SectionLabel>
              <div className="space-y-4">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            </div>
            <div>
              <SectionLabel>Quick Hits</SectionLabel>
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="glass rounded-[var(--radius-lg)] p-4">
                    <div className="skeleton-shimmer h-4 w-full rounded-md mb-2" />
                    <div className="skeleton-shimmer h-4 w-3/4 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
            {/* DEEP DIVES */}
            {deepDives.length > 0 && (
              <section>
                <SectionLabel>Deep Dives</SectionLabel>
                <div className="space-y-4">
                  {deepDives.map((article, i) => (
                    <DeepDiveCard key={article.id} article={article} index={i} />
                  ))}
                </div>
              </section>
            )}

            {/* QUICK HITS */}
            {quickHits.length > 0 && (
              <section>
                <SectionLabel>Quick Hits</SectionLabel>
                <div className="space-y-3">
                  {quickHits.map((item, i) => (
                    <QuickHitItem key={item.id} item={item} index={i} />
                  ))}
                </div>
              </section>
            )}

            {/* BY THE NUMBERS */}
            {byTheNumbers.length > 0 && (
              <section>
                <SectionLabel>By the Numbers</SectionLabel>
                <div className="grid gap-3 sm:grid-cols-2">
                  {byTheNumbers.map((item, i) => (
                    <ByTheNumberItem key={item.id} item={item} index={i} />
                  ))}
                </div>
              </section>
            )}

            {/* OVERALL FEEDBACK */}
            <section className="glass rounded-[var(--radius-xl)] px-6 py-5 text-center">
              <p className="text-[14px] font-medium text-[#1C1C1E] mb-3">
                How was today's issue? Tap to rate — that's all it takes.
              </p>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setOverallRating(v)}
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-semibold transition-all ${
                      overallRating === v
                        ? 'bg-[linear-gradient(135deg,#00B4FF,#0099FF)] text-white shadow-[0_2px_8px_rgba(0,163,255,0.3)]'
                        : 'border border-[rgba(209,213,219,0.4)] bg-[rgba(255,255,255,0.8)] text-[#8E8E93]'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              {overallRating > 0 && (
                <p className="mt-2 text-[12px] text-[#00A3FF]">Thanks for your feedback!</p>
              )}
            </section>

            {/* DISCLAIMER */}
            <footer className="text-center text-[11px] text-[#8E8E93] leading-relaxed pb-4">
              <p className="font-semibold mb-1">AI-Generated Content</p>
              <p>This newsletter is written by artificial intelligence and may contain errors. Always verify important claims independently. For informational purposes only.</p>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
