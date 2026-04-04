import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getRating, saveRating } from '@/lib/store';

const LABELS = ['Not Useful', 'Meh', 'Okay', 'Great', 'Loved it'];

export function ArticleRating({ articleId }: { articleId: string }) {
  const existing = getRating(articleId);
  const [rating, setRating] = useState(existing?.rating || 0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState(existing?.feedback || '');

  const handleRate = (value: number) => {
    setRating(value);
    saveRating(articleId, value);
    setShowFeedback(true);
  };

  const handleFeedback = () => {
    saveRating(articleId, rating, feedback);
    setShowFeedback(false);
  };

  return (
    <div className="mt-3">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => handleRate(v)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold transition-all',
              rating === v
                ? 'bg-[linear-gradient(135deg,#00B4FF,#0099FF)] text-white shadow-[0_2px_8px_rgba(0,163,255,0.3)]'
                : 'border border-[rgba(209,213,219,0.4)] bg-[rgba(255,255,255,0.8)] text-[#8E8E93] hover:border-[#00A3FF]'
            )}
          >
            {v}
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-[11px] text-[#8E8E93]">{LABELS[rating - 1]}</span>
        )}
      </div>
      {showFeedback && (
        <div className="mt-2 flex gap-2">
          <input
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Tell us why? (optional)"
            className="editorial-input flex-1 !min-h-[36px] !py-2 !text-[12px]"
          />
          <button
            type="button"
            onClick={handleFeedback}
            className="rounded-full bg-[#00A3FF] px-3 py-1 text-[11px] font-medium text-white"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
