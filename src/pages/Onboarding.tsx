import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { INTERESTS, DEFAULT_VOICE, savePreferences } from '@/lib/store';
import newzzyLogo from '@/assets/newzzy-logo.png';

export default function Onboarding() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');

  const allInterests = useMemo(() => {
    const combined = [...selectedInterests];
    if (customInterest.trim()) combined.push(customInterest.trim());
    return combined;
  }, [customInterest, selectedInterests]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleContinue = () => {
    savePreferences({
      name: name.trim() || 'Reader',
      voiceId: DEFAULT_VOICE.id,
      voiceName: DEFAULT_VOICE.name,
      interests: allInterests.length > 0 ? allInterests : ['World News', 'Tech'],
    });
    navigate('/brief');
  };

  return (
    <div className="page-shell flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass w-full max-w-[520px] rounded-[var(--radius-2xl)] px-6 py-8 sm:px-8 sm:py-10"
      >
        <div className="flex items-center gap-3 mb-6">
          <img src={newzzyLogo} alt="Newzzy" className="h-10 w-10 rounded-xl" />
          <div>
            <h1 className="font-display text-[22px] font-bold text-[#1C1C1E]">Welcome to Newzzy</h1>
            <p className="text-[13px] text-[#8E8E93]">Let's personalize your daily brief.</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Step 1: Name */}
          <section>
            <label className="mb-2 block text-[13px] font-medium text-[#1C1C1E]">What should I call you?</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="editorial-input"
              placeholder="Enter your name..."
            />
          </section>

          {/* Step 2: Interests */}
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
                        ? 'border border-transparent bg-[linear-gradient(135deg,#00B4FF,#0099FF)] text-white shadow-[0_4px_14px_rgba(0,163,255,0.35)]'
                        : 'border border-[rgba(209,213,219,0.45)] bg-[rgba(255,255,255,0.85)] text-[#1C1C1E] hover:border-[rgba(0,163,255,0.25)]'
                    )}
                  >
                    {interest}
                  </motion.button>
                );
              })}
            </div>
            <textarea
              value={customInterest}
              onChange={(e) => setCustomInterest(e.target.value)}
              className="editorial-input mt-3 min-h-[72px] resize-none py-3"
              placeholder="Anything specific?"
            />
          </section>
        </div>

        <Button
          onClick={handleContinue}
          className="mt-8 h-[52px] w-full rounded-full border-0 bg-[linear-gradient(135deg,#00B4FF_0%,#0099FF_100%)] text-[15px] font-semibold text-white shadow-[0_10px_28px_-5px_rgba(0,163,255,0.40)]"
        >
          Start reading →
        </Button>
      </motion.div>
    </div>
  );
}
