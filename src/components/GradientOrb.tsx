import { motion } from 'framer-motion';

interface GradientOrbProps {
  isSpeaking: boolean;
  variant?: 'chat' | 'debate';
}

export function GradientOrb({ isSpeaking, variant = 'chat' }: GradientOrbProps) {
  const colors = variant === 'debate'
    ? 'from-destructive/60 via-destructive/30 to-destructive/10'
    : 'from-primary/60 via-accent/30 to-primary/10';

  return (
    <div className="relative flex items-center justify-center">
      <motion.div
        className={`w-48 h-48 rounded-full bg-gradient-to-br ${colors} blur-xl absolute`}
        animate={{
          scale: isSpeaking ? [1, 1.3, 1] : 1,
          opacity: isSpeaking ? [0.5, 0.8, 0.5] : 0.3,
        }}
        transition={{
          duration: 1.5,
          repeat: isSpeaking ? Infinity : 0,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className={`w-32 h-32 rounded-full bg-gradient-to-br ${colors} relative z-10`}
        animate={{
          scale: isSpeaking ? [1, 1.1, 1] : 1,
        }}
        transition={{
          duration: 1,
          repeat: isSpeaking ? Infinity : 0,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
}
