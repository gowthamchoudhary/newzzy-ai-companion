import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

type OrbState = 'idle' | 'listening' | 'speaking' | 'searching';
type OrbAccent = 'chat' | 'debate';
type OrbSize = 'sm' | 'md' | 'lg';

interface GradientOrbProps {
  state?: OrbState;
  accent?: OrbAccent;
  size?: OrbSize;
  className?: string;
}

const ORB_SIZES: Record<OrbSize, number> = {
  sm: 160,
  md: 180,
  lg: 200,
};

function getRingColor(accent: OrbAccent, index: number) {
  if (accent === 'debate') {
    return ['rgba(226,75,74,0.25)', 'rgba(226,75,74,0.12)', 'rgba(226,75,74,0.06)'][index];
  }

  return ['rgba(0,163,255,0.25)', 'rgba(0,163,255,0.12)', 'rgba(0,163,255,0.06)'][index];
}

export function GradientOrb({ state = 'idle', accent = 'chat', size = 'lg', className }: GradientOrbProps) {
  const shouldReduceMotion = useReducedMotion();
  const baseSize = ORB_SIZES[size];
  const outerSize = baseSize + 40;
  const ringSizes = [baseSize + 36, baseSize + 72, baseSize + 108];

  const background =
    state === 'searching'
      ? 'radial-gradient(circle, #f0a500 0%, #d98d00 52%, #a96b00 100%)'
      : state === 'listening'
        ? 'radial-gradient(circle, #4ecdc4 0%, #00b894 52%, #007a6a 100%)'
        : accent === 'debate'
          ? 'radial-gradient(circle, #ff8080 0%, #e24b4a 50%, #8b1a1a 100%)'
          : 'radial-gradient(circle, #60c8ff 0%, #0090e0 50%, #005fa8 100%)';

  const glow =
    state === 'searching'
      ? 'rgba(240,165,0,0.35)'
      : state === 'listening'
        ? 'rgba(78,205,196,0.34)'
        : accent === 'debate'
          ? 'rgba(226,75,74,0.28)'
          : 'rgba(0,163,255,0.28)';

  const baseAnimation = shouldReduceMotion
    ? {}
    : state === 'listening'
      ? { scale: [1, 1.05, 1] }
      : { scale: [1, 1.04, 1] };

  const baseTransition = shouldReduceMotion
    ? { duration: 0 }
    : {
        duration: state === 'listening' ? 1 : 3,
        repeat: Infinity,
        ease: 'easeInOut' as const,
      };

  return (
    <div className={cn('relative flex items-center justify-center', className)} style={{ width: ringSizes[2], height: ringSizes[2] }}>
      {state === 'speaking' &&
        ringSizes.map((ringSize, index) => (
          <motion.div
            key={ringSize}
            className="absolute rounded-full border"
            style={{ width: ringSize, height: ringSize, borderColor: getRingColor(accent, index) }}
            animate={shouldReduceMotion ? { opacity: 0.5 } : { scale: [1, 1.3], opacity: [1, 0] }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 2, repeat: Infinity, delay: index * 0.4, ease: 'easeOut' }
            }
          />
        ))}

      {state === 'listening' && (
        <motion.div
          className="absolute rounded-full border"
          style={{ width: outerSize, height: outerSize, borderColor: 'rgba(78,205,196,0.40)' }}
          animate={shouldReduceMotion ? { opacity: 0.75 } : { scale: [1, 1.14], opacity: [0.75, 0] }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 1, repeat: Infinity, ease: 'easeOut' }}
        />
      )}

      <motion.div
        className="absolute rounded-full"
        style={{ width: baseSize + 44, height: baseSize + 44, filter: 'blur(20px)', background: glow, opacity: 0.8 }}
        animate={baseAnimation}
        transition={baseTransition}
      />

      <motion.div
        className="relative rounded-full"
        style={{
          width: baseSize,
          height: baseSize,
          background,
          boxShadow:
            accent === 'debate'
              ? '0 0 50px rgba(226,75,74,0.30), 0 0 20px rgba(226,75,74,0.20), inset 0 6px 12px rgba(255,255,255,0.20)'
              : '0 0 50px rgba(0,163,255,0.30), 0 0 20px rgba(0,163,255,0.20), inset 0 6px 12px rgba(255,255,255,0.30)',
        }}
        animate={baseAnimation}
        transition={baseTransition}
      >
        <div className="absolute inset-[12%] rounded-full bg-[rgba(255,255,255,0.22)] blur-2xl" />

        {state === 'searching' && (
          <motion.svg
            className="absolute inset-[-8px] h-[calc(100%+16px)] w-[calc(100%+16px)] -rotate-90"
            viewBox="0 0 216 216"
            animate={shouldReduceMotion ? undefined : { rotate: 360 }}
            transition={shouldReduceMotion ? undefined : { duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <circle
              cx="108"
              cy="108"
              r="100"
              fill="none"
              stroke="rgba(240,165,0,0.7)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="104 524"
            />
          </motion.svg>
        )}
      </motion.div>
    </div>
  );
}
