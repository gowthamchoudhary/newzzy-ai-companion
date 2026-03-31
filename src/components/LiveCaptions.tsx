import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

interface LiveCaptionsProps {
  text: string;
  accent?: 'chat' | 'debate';
}

export function LiveCaptions({ text, accent = 'chat' }: LiveCaptionsProps) {
  const shouldReduceMotion = useReducedMotion();
  const words = text.split(/\s+/).filter(Boolean);
  const borderColor = accent === 'debate' ? '#E24B4A' : '#00A3FF';

  return (
    <AnimatePresence initial={false} mode="wait">
      {text ? (
        <motion.div
          key={text}
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-[420px] overflow-hidden"
        >
          <div
            className="glass flex min-h-[56px] items-center rounded-r-[var(--radius-md)] rounded-l-none px-4 py-3 text-left"
            style={{ borderLeft: `3px solid ${borderColor}` }}
          >
            <p className="text-[13px] leading-6 text-[#1C1C1E]">
              {words.map((word, index) => (
                <motion.span
                  key={`${word}-${index}`}
                  className="mr-[0.35em] inline-block last:mr-0"
                  initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 4 }}
                  animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: shouldReduceMotion ? 0 : index * 0.05 }}
                >
                  {word}
                </motion.span>
              ))}
            </p>
          </div>
        </motion.div>
      ) : (
        <motion.div key="empty" className="h-0 w-full" />
      )}
    </AnimatePresence>
  );
}
