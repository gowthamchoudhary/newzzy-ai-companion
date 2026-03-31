import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Mic, Play, Radio, Swords, AudioLines } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { INTERESTS, VOICES, savePreferences, type VoiceOption } from '@/lib/store';
import { toast } from '@/components/ui/sonner';

const FEATURE_CARDS = [
  {
    source: 'Reuters',
    headline: 'AI chip rivalry intensifies as fresh models redraw the edge race.',
    description: 'Markets are repricing the next wave of voice-first assistants.',
  },
  {
    source: 'CNN',
    headline: 'Creators are turning live briefs into the next premium listening ritual.',
    description: 'Audio summaries are becoming the new ambient news habit.',
  },
  {
    source: 'Bloomberg',
    headline: 'Policy, sport, and culture collide in a feed built for signal over noise.',
    description: 'A cleaner briefing layer is becoming a product category of its own.',
  },
] as const;

const VOICE_GRADIENTS: Record<string, string> = {
  Rachel: 'from-[#81CFFF] to-[#00A3FF]',
  Adam: 'from-[#636e72] to-[#2d3436]',
  Bella: 'from-[#fd79a8] to-[#e84393]',
  Antoni: 'from-[#00b894] to-[#00cec9]',
  Elli: 'from-[#a29bfe] to-[#6c5ce7]',
};

function VoicePreview({ voice, active, onClick }: { voice: VoiceOption; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(0,163,255,0.25)] bg-[rgba(0,163,255,0.10)] text-[#00A3FF] hover:bg-[rgba(0,163,255,0.18)]',
        active && 'bg-[rgba(0,163,255,0.18)]'
      )}
      aria-label={`Preview ${voice.name}`}
    >
      {active ? (
        <div className="flex h-3 items-end gap-[2px]">
          {[0, 1, 2].map((bar) => (
            <motion.span
              key={bar}
              className="block w-[3px] rounded-full bg-current"
              animate={{ height: ['5px', '11px', '6px'] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: bar * 0.12 }}
            />
          ))}
        </div>
      ) : (
        <Play className="h-3.5 w-3.5 fill-current" />
      )}
    </button>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const [name, setName] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0]);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!previewingVoice) return;

    const voice = VOICES.find((item) => item.name === previewingVoice);
    if (!voice) return;

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(voice.previewLine);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onend = () => setPreviewingVoice(null);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } else {
      toast.info('Voice preview is not supported in this browser.');
      const timeout = window.setTimeout(() => setPreviewingVoice(null), 1800);
      return () => window.clearTimeout(timeout);
    }

    const timer = window.setTimeout(() => setPreviewingVoice(null), 2600);
    return () => {
      window.clearTimeout(timer);
      window.speechSynthesis?.cancel();
    };
  }, [previewingVoice]);

  const interestSummary = useMemo(() => {
    const combined = [...selectedInterests];
    if (customInterest.trim()) combined.push(customInterest.trim());
    return combined;
  }, [customInterest, selectedInterests]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((item) => item !== interest) : [...prev, interest]
    );
  };

  const handleContinue = (path: string) => {
    savePreferences({
      name: name.trim() || 'Editor',
      voiceId: selectedVoice.id,
      voiceName: selectedVoice.name,
      interests: interestSummary,
    });
    sessionStorage.setItem('newzzy_auto_start_target', path);
    navigate(path);
  };

  const activeStep = selectedVoice ? (interestSummary.length > 0 ? 3 : name ? 2 : 1) : 1;

  return (
    <div className="page-shell flex items-center">
      <div className="grid w-full items-start gap-8 lg:grid-cols-[0.45fr_0.55fr] lg:gap-10">
        <section
          className="relative flex min-h-[calc(100vh-2rem)] flex-col justify-between px-2 py-4 sm:px-4 lg:px-6"
          onMouseMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width - 0.5;
            const y = (event.clientY - rect.top) / rect.height - 0.5;
            setPointer({ x, y });
          }}
          onMouseLeave={() => setPointer({ x: 0, y: 0 })}
        >
          <div className="space-y-4 pt-8 lg:pt-12">
            <span className="inline-flex rounded-full border border-[rgba(129,207,255,0.30)] bg-[rgba(129,207,255,0.15)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#0077AA]">
              Premium AI News Companion
            </span>
            <div>
              <h1 className="wordmark text-[48px] leading-none">Newzzy</h1>
              <p className="mt-2 text-[18px] text-[#8E8E93]">Your world. Your voice. Right now.</p>
            </div>
          </div>

          <div className="relative mx-auto flex min-h-[340px] w-full max-w-[360px] items-center justify-center">
            {FEATURE_CARDS.map((card, index) => {
              const offsetX = shouldReduceMotion ? 0 : pointer.x * (20 + index * 6);
              const offsetY = shouldReduceMotion ? 0 : pointer.y * (18 + index * 8);
              return (
                <motion.div
                  key={card.headline}
                  className="glass absolute w-full max-w-[300px] p-5"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{
                    opacity: 1,
                    y: index * 18 + offsetY,
                    x: offsetX,
                    rotate: index === 0 ? -2 : index === 1 ? 2 : -4,
                  }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  style={{
                    zIndex: FEATURE_CARDS.length - index,
                    animation: shouldReduceMotion ? undefined : 'float-card 4s ease-in-out infinite',
                    animationDelay: `${index * 0.6}s`,
                  }}
                >
                  <div className="flex items-center justify-between text-[12px] text-[#8E8E93]">
                    <span className="font-display text-[13px] font-semibold">{card.source}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(226,75,74,0.08)] px-2 py-1 text-[11px] font-medium text-[#E24B4A]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#E24B4A]" />
                      LIVE
                    </span>
                  </div>
                  <div className="mt-4 space-y-2">
                    <h3 className="font-display text-[15px] font-semibold leading-6 text-[#1C1C1E]">{card.headline}</h3>
                    <p className="text-[13px] leading-6 text-[#8E8E93]">{card.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 pb-4 text-[12px] text-[#8E8E93] lg:pb-8">
            <span>Powered by ElevenLabs Agents · Firecrawl Search</span>
            <div className="flex items-center gap-2">
              <span className="glass flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-[#0077AA]">11</span>
              <span className="glass flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-[#0077AA]">FC</span>
            </div>
          </div>
        </section>

        <section className="flex min-h-[calc(100vh-2rem)] items-center justify-center py-4 lg:py-8">
          <div className="glass w-full max-w-[480px] rounded-[var(--radius-2xl)] px-6 py-8 sm:px-8 sm:py-9">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full', step <= activeStep ? 'bg-[#00A3FF]' : 'bg-[rgba(209,213,219,0.6)]')} />
                      {step < 3 ? <span className="h-px w-5 bg-[rgba(129,207,255,0.35)]" /> : null}
                    </div>
                  ))}
                </div>
                <span className="text-[12px] text-[#8E8E93]">Step {activeStep} of 3</span>
              </div>

              <div>
                <h2 className="font-display text-[22px] font-bold text-[#1C1C1E]">Shape your companion</h2>
                <p className="mt-2 text-[13px] text-[#8E8E93]">Build a briefing voice that feels personal.</p>
              </div>
            </div>

            <div className="mt-8 space-y-6">
              <section>
                <label className="mb-2 block text-[13px] font-medium text-[#1C1C1E]">What should I call you?</label>
                <input value={name} onChange={(event) => setName(event.target.value)} className="editorial-input" placeholder="Enter your name..." />
                <AnimatePresence mode="wait">
                  <motion.p
                    key={name || 'empty'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={cn('mt-2 text-[13px] font-medium', name.trim() ? 'text-[#00A3FF]' : 'text-[#8E8E93]')}
                  >
                    Hi {name.trim() || 'there'}
                  </motion.p>
                </AnimatePresence>
              </section>

              <section>
                <label className="mb-2 block text-[13px] font-medium text-[#1C1C1E]">What do you care about?</label>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((interest) => {
                    const selected = selectedInterests.includes(interest);
                    return (
                      <motion.button
                        key={interest}
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        onClick={() => toggleInterest(interest)}
                        className={cn(
                          'rounded-full px-4 py-2 text-[13px] font-medium shadow-[0_2px_8px_rgba(0,0,0,0.04)]',
                          selected
                            ? 'border border-transparent bg-[linear-gradient(135deg,#00B4FF,#0099FF)] text-white shadow-[0_4px_14px_rgba(0,163,255,0.35),inset_0_1px_0_rgba(255,255,255,0.25)]'
                            : 'border border-[rgba(209,213,219,0.45)] bg-[rgba(255,255,255,0.85)] text-[#1C1C1E] hover:border-[rgba(0,163,255,0.25)] hover:bg-[rgba(0,163,255,0.06)]'
                        )}
                      >
                        {interest}
                      </motion.button>
                    );
                  })}
                </div>
                <textarea
                  value={customInterest}
                  onChange={(event) => setCustomInterest(event.target.value)}
                  className="editorial-input mt-3 min-h-[80px] resize-none py-[14px]"
                  placeholder="Anything specific?"
                />
              </section>

              <section>
                <label className="mb-2 block text-[13px] font-medium text-[#1C1C1E]">Choose your companion&apos;s voice</label>
                <div className="space-y-2">
                  {VOICES.map((voice) => {
                    const selected = selectedVoice.name === voice.name;
                    const previewing = previewingVoice === voice.name;
                    return (
                      <div
                        key={voice.name}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedVoice(voice)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedVoice(voice);
                          }
                        }}
                        className={cn(
                          'flex items-center gap-3 rounded-[var(--radius-lg)] border px-4 py-3 outline-none transition-all duration-200',
                          selected
                            ? 'border-2 border-[#00A3FF] bg-[rgba(0,163,255,0.06)] opacity-100 shadow-[0_0_0_4px_rgba(0,163,255,0.10),var(--shadow-card)]'
                            : 'border border-[rgba(255,255,255,0.65)] bg-[rgba(255,255,255,0.82)] opacity-70 shadow-[var(--shadow-card)]'
                        )}
                      >
                        <div className={cn('flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br text-[16px] font-semibold text-white shadow-[0_0_14px_rgba(129,207,255,0.40)]', VOICE_GRADIENTS[voice.name] || 'from-[#81CFFF] to-[#00A3FF]')}>
                          {voice.name[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-display text-[14px] font-semibold text-[#1C1C1E]">{voice.name}</p>
                          <p className="truncate text-[12px] text-[#8E8E93]">{voice.description}</p>
                        </div>
                        <VoicePreview voice={voice} active={previewing} onClick={() => setPreviewingVoice(voice.name)} />
                        <span
                          className={cn(
                            'flex h-[22px] w-[22px] items-center justify-center rounded-full border-[1.5px]',
                            selected ? 'border-[#00A3FF] bg-[#00A3FF] text-white' : 'border-[rgba(209,213,219,0.8)] bg-transparent text-transparent'
                          )}
                        >
                          <Check className="h-3 w-3" />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="mt-8">
              <Button
                onClick={() => handleContinue('/chat')}
                className="h-[54px] w-full rounded-full border-0 bg-[linear-gradient(135deg,#00B4FF_0%,#0099FF_100%)] text-[16px] font-semibold text-white shadow-[0_10px_28px_-5px_rgba(0,163,255,0.40),inset_0_1px_0_rgba(255,255,255,0.25)] hover:translate-y-[-1px] hover:bg-[linear-gradient(135deg,#00C4FF,#00AAFF)] hover:shadow-[0_12px_32px_-4px_rgba(0,163,255,0.50)]"
              >
                <Mic className="mr-2 h-[18px] w-[18px]" />
                Start News Chat
              </Button>
              <Button
                onClick={() => handleContinue('/debate')}
                className="mt-[10px] h-[54px] w-full rounded-full border border-[rgba(255,255,255,0.08)] bg-[#1C2526] text-[16px] font-semibold text-white shadow-[var(--shadow-bar)] hover:bg-[#2d3436]"
              >
                <Swords className="mr-2 h-[18px] w-[18px]" />
                Enter Debate Arena
              </Button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-[rgba(129,207,255,0.20)] bg-[rgba(255,255,255,0.60)] px-[10px] py-1 text-[11px] text-[#8E8E93]">Built for live voice sessions</span>
              <span className="rounded-full border border-[rgba(129,207,255,0.20)] bg-[rgba(255,255,255,0.60)] px-[10px] py-1 text-[11px] text-[#8E8E93]">Search-backed briefs</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

