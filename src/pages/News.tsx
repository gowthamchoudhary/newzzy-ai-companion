import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Clock, ExternalLink, Mic, RefreshCcw, Swords, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getPreferences } from '@/lib/store';
import { generateArticle } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import type { GeneratedArticle } from '@/lib/types';

const DEFAULT_TOPICS = [
  'world news today',
  'technology news today',
  'business markets today',
  'science latest',
  'politics today',
];

function ArticleSkeleton({ hero }: { hero?: boolean }) {
  return (
    <div className={cn('glass rounded-[var(--radius-lg)] overflow-hidden', hero && 'col-span-full lg:col-span-1')}>
      <div className={cn('skeleton-shimmer w-full', hero ? 'aspect-[16/9]' : 'aspect-[16/10]')} />
      <div className="p-5 space-y-3">
        <div className="skeleton-shimmer h-4 w-20 rounded-full" />
        <div className="skeleton-shimmer h-6 w-full rounded-md" />
        <div className="skeleton-shimmer h-6 w-4/5 rounded-md" />
        <div className="skeleton-shimmer h-4 w-full rounded-md" />
        <div className="skeleton-shimmer h-4 w-3/4 rounded-md" />
      </div>
    </div>
  );
}

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ArticleCard({
  article,
  hero,
  index,
  onClick,
}: {
  article: GeneratedArticle;
  hero?: boolean;
  index: number;
  onClick: () => void;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={onClick}
      className={cn(
        'glass-card glass-card-hover cursor-pointer overflow-hidden rounded-[var(--radius-lg)]',
        hero && 'col-span-full lg:col-span-1 lg:row-span-2'
      )}
    >
      {article.heroImage ? (
        <img
          src={article.heroImage}
          alt={article.headline}
          className={cn('w-full object-cover', hero ? 'aspect-[16/9]' : 'aspect-[16/10]')}
          loading="lazy"
        />
      ) : (
        <div
          className={cn(
            'flex items-center justify-center bg-[linear-gradient(135deg,rgba(129,207,255,0.35),rgba(255,255,255,0.75))]',
            hero ? 'aspect-[16/9]' : 'aspect-[16/10]'
          )}
        >
          <span className="font-display text-4xl text-[#1C1C1E]">{article.category[0]}</span>
        </div>
      )}
      <div className="p-5 space-y-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[linear-gradient(135deg,#00B4FF,#0099FF)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
            {article.category}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-[#8E8E93]">
            <Clock className="h-3 w-3" />
            {article.readingTime} min read
          </span>
        </div>
        <h3 className={cn('font-display font-bold leading-tight text-[#1C1C1E]', hero ? 'text-[22px]' : 'text-[15px]')}>
          {article.headline}
        </h3>
        <p className={cn('text-[#8E8E93] leading-relaxed', hero ? 'text-[14px]' : 'text-[12px] line-clamp-2')}>
          {article.subheadline}
        </p>
        {hero && <p className="text-[13px] leading-relaxed text-[#2C2C2E] line-clamp-3">{article.lede}</p>}
        <p className="text-[11px] text-[#8E8E93]">By Newzzy AI · {formatTimestamp(article.generatedAt)}</p>
      </div>
    </motion.article>
  );
}

function ArticleDetail({
  article,
  onBack,
  onListen,
  onDebate,
}: {
  article: GeneratedArticle;
  onBack: () => void;
  onListen: () => void;
  onDebate: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="mx-auto max-w-[680px] px-4 py-6"
    >
      <button
        type="button"
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-[13px] text-[#8E8E93] hover:text-[#1C1C1E]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to feed
      </button>

      <span className="rounded-full bg-[linear-gradient(135deg,#00B4FF,#0099FF)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
        {article.category}
      </span>

      <h1 className="mt-4 font-display text-[clamp(24px,4vw,36px)] font-bold leading-[1.2] text-[#1C1C1E]">
        {article.headline}
      </h1>

      <p className="mt-3 text-[18px] text-[#8E8E93]">{article.subheadline}</p>

      <div className="mt-4 flex items-center gap-2 text-[12px] text-[#8E8E93]">
        <span>By Newzzy AI</span>
        <span>·</span>
        <span>{formatTimestamp(article.generatedAt)}</span>
        <span>·</span>
        <span>{article.readingTime} min read</span>
      </div>

      {article.heroImage && (
        <img
          src={article.heroImage}
          alt={article.headline}
          className="mt-6 w-full rounded-[var(--radius-md)] object-cover aspect-[16/9]"
        />
      )}

      <p className="mt-6 text-[18px] font-medium leading-[1.7] text-[#1C1C1E]">{article.lede}</p>

      {article.body.map((paragraph, i) => (
        <p key={i} className="mt-4 text-[17px] leading-[1.8] text-[#2C2C2E]">
          {paragraph}
        </p>
      ))}

      <blockquote className="my-6 border-l-[3px] border-[#00A3FF] pl-5 text-[20px] italic leading-[1.5] text-[#1C1C1E]">
        {article.pullQuote}
      </blockquote>

      <div className="my-5 rounded-[var(--radius-md)] bg-[rgba(0,163,255,0.05)] px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#00A3FF] mb-2">Analysis</p>
        <p className="text-[15px] leading-[1.7] text-[#1C1C1E]">{article.analysis}</p>
      </div>

      <p className="mt-4 text-[17px] leading-[1.8] text-[#2C2C2E]">{article.conclusion}</p>

      {article.sources.length > 0 && (
        <div className="mt-8 border-t border-[rgba(129,207,255,0.2)] pt-4">
          <p className="text-[12px] font-semibold text-[#8E8E93] mb-2">Sources</p>
          <div className="flex flex-wrap gap-2">
            {article.sources.map((source, i) => (
              <a
                key={i}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(129,207,255,0.25)] bg-[rgba(255,255,255,0.8)] px-3 py-1.5 text-[12px] text-[#8E8E93] hover:text-[#1C1C1E] hover:border-[#00A3FF]"
              >
                <ExternalLink className="h-3 w-3" />
                {source.name}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Button
          onClick={onListen}
          className="h-[48px] rounded-full bg-[linear-gradient(135deg,#00B4FF,#0099FF)] px-6 text-[14px] font-semibold text-white shadow-[0_8px_20px_rgba(0,163,255,0.3)]"
        >
          <Volume2 className="mr-2 h-4 w-4" />
          Listen to this article
        </Button>
        <Button
          onClick={onDebate}
          className="h-[48px] rounded-full border border-[rgba(255,255,255,0.08)] bg-[#1C2526] px-6 text-[14px] font-semibold text-white shadow-[var(--shadow-bar)] hover:bg-[#2d3436]"
        >
          <Swords className="mr-2 h-4 w-4" />
          Debate this topic
        </Button>
      </div>
    </motion.div>
  );
}

export default function News() {
  const navigate = useNavigate();
  const prefs = getPreferences();
  const [articles, setArticles] = useState<GeneratedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<GeneratedArticle | null>(null);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    setSelectedArticle(null);
    try {
      // Stagger requests to avoid rate limits (1.5s between each)
      const successful: GeneratedArticle[] = [];
      for (const topic of DEFAULT_TOPICS) {
        try {
          const article = await generateArticle(topic);
          successful.push(article);
          setArticles((prev) => [...prev, article]);
        } catch (err) {
          console.warn(`Failed to generate article for "${topic}":`, err);
        }
        // Small delay between requests
        if (topic !== DEFAULT_TOPICS[DEFAULT_TOPICS.length - 1]) {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }

      if (successful.length === 0) {
        toast.error('Could not generate articles right now. Try again.');
      }

      setArticles(successful);
    } catch (err) {
      console.error('Article generation error:', err);
      toast.error('Failed to load articles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadArticles();
  }, [loadArticles]);

  const handleListen = (article: GeneratedArticle) => {
    // Store article context for voice companion
    sessionStorage.setItem(
      'newzzy_article_context',
      JSON.stringify({
        headline: article.headline,
        lede: article.lede,
        body: article.body.join(' ').substring(0, 500),
      })
    );
    sessionStorage.setItem('newzzy_auto_start_target', '/chat');
    navigate('/chat');
  };

  const handleDebate = (article: GeneratedArticle) => {
    navigate(`/debate?topic=${encodeURIComponent(article.headline)}`);
  };

  return (
    <div className="page-shell">
      <AnimatePresence mode="wait">
        {selectedArticle ? (
          <ArticleDetail
            key="detail"
            article={selectedArticle}
            onBack={() => setSelectedArticle(null)}
            onListen={() => handleListen(selectedArticle)}
            onDebate={() => handleDebate(selectedArticle)}
          />
        ) : (
          <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <header className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="flex h-8 w-8 items-center justify-center rounded-[12px] border border-[rgba(129,207,255,0.30)] bg-[rgba(255,255,255,0.90)] text-[#1C2526]"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <h1 className="wordmark text-[28px]">Newzzy</h1>
                  <p className="text-[12px] text-[#8E8E93]">AI-generated editorial briefings</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/chat')}
                  className="glass flex h-9 items-center gap-2 rounded-full px-4 text-[12px] font-medium text-[#00A3FF]"
                >
                  <Mic className="h-3.5 w-3.5" />
                  Voice Chat
                </button>
                <button
                  type="button"
                  onClick={() => void loadArticles()}
                  disabled={loading}
                  className="glass flex h-9 w-9 items-center justify-center rounded-full text-[#00A3FF] disabled:opacity-50"
                  aria-label="Refresh stories"
                >
                  <RefreshCcw className={cn('h-4 w-4', loading && 'animate-spin')} />
                </button>
              </div>
            </header>

            {loading ? (
              <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr] lg:gap-6">
                <ArticleSkeleton hero />
                <div className="grid gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <ArticleSkeleton key={i} />
                  ))}
                </div>
              </div>
            ) : articles.length === 0 ? (
              <div className="glass flex min-h-[400px] flex-col items-center justify-center rounded-[var(--radius-xl)] px-6 text-center">
                <p className="font-display text-[18px] font-semibold text-[#1C1C1E]">No articles yet</p>
                <p className="mt-2 text-[13px] text-[#8E8E93]">Tap refresh to generate fresh stories.</p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr] lg:gap-6">
                  {articles[0] && (
                    <ArticleCard
                      article={articles[0]}
                      hero
                      index={0}
                      onClick={() => setSelectedArticle(articles[0])}
                    />
                  )}
                  <div className="grid gap-4">
                    {articles.slice(1, 4).map((article, i) => (
                      <ArticleCard
                        key={article.id}
                        article={article}
                        index={i + 1}
                        onClick={() => setSelectedArticle(article)}
                      />
                    ))}
                  </div>
                </div>
                {articles.length > 4 && (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {articles.slice(4).map((article, i) => (
                      <ArticleCard
                        key={article.id}
                        article={article}
                        index={i + 4}
                        onClick={() => setSelectedArticle(article)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
