import { motion, AnimatePresence } from 'framer-motion';

interface LiveCaptionsProps {
  text: string;
}

export function LiveCaptions({ text }: LiveCaptionsProps) {
  return (
    <div className="h-16 flex items-center justify-center">
      <AnimatePresence mode="wait">
        {text && (
          <motion.div
            key={text.slice(-50)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="px-4 py-2 rounded-full bg-muted/50 backdrop-blur-sm max-w-md text-center"
          >
            <p className="text-[15px] text-foreground/80 line-clamp-2 font-sans">
              {text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
