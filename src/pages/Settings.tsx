import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { INTERESTS, getPreferences, savePreferences } from '@/lib/store';
import { toast } from '@/components/ui/sonner';

const TONES = [
  { value: 'professional' as const, label: 'Professional', desc: 'Formal, Reuters-style reporting' },
  { value: 'casual' as const, label: 'Casual', desc: 'Relaxed, easy to read' },
  { value: 'conversational' as const, label: 'Conversational', desc: 'Friendly, like a colleague' },
];

const LENGTHS = [
  { value: 'brief' as const, label: 'Brief', desc: '~3 min read' },
  { value: 'standard' as const, label: 'Standard', desc: '~5 min read' },
  { value: 'deep' as const, label: 'Deep', desc: '~10 min read' },
];

export default function Settings() {
  const prefs = getPreferences();
  const [name, setName] = useState(prefs?.name || '');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(prefs?.interests || []);
  const [tone, setTone] = useState<'professional' | 'casual' | 'conversational'>(prefs?.tone || 'professional');
  const [briefLength, setBriefLength] = useState<'brief' | 'standard' | 'deep'>(prefs?.briefLength || 'standard');

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleSave = () => {
    savePreferences({
      name: name.trim() || 'Reader',
      voiceId: prefs?.voiceId || 'pNInz6obpgDQGcFmaJgB',
      voiceName: prefs?.voiceName || 'Adam',
      interests: selectedInterests.length > 0 ? selectedInterests : ['World News', 'Tech'],
      tone,
      briefLength,
    });
    toast.success('Preferences saved!');
  };

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-[600px]">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-[28px] font-bold text-[#1C1C1E] mb-1">Settings</h1>
          <p className="text-[14px] text-[#8E8E93] mb-8">Customize your daily brief.</p>

          <div className="space-y-8">
            {/* Name */}
            <section className="glass rounded-[var(--radius-xl)] p-6">
              <label className="mb-2 block text-[13px] font-semibold text-[#1C1C1E]">Display name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="editorial-input" />
            </section>

            {/* Topics */}
            <section className="glass rounded-[var(--radius-xl)] p-6">
              <label className="mb-3 block text-[13px] font-semibold text-[#1C1C1E]">Core Topics</label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((interest) => {
                  const selected = selectedInterests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      className={cn(
                        'rounded-full px-4 py-2 text-[13px] font-medium',
                        selected
                          ? 'bg-[linear-gradient(135deg,#00B4FF,#0099FF)] text-white'
                          : 'border border-[rgba(209,213,219,0.45)] bg-[rgba(255,255,255,0.85)] text-[#1C1C1E]'
                      )}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Tone */}
            <section className="glass rounded-[var(--radius-xl)] p-6">
              <label className="mb-3 block text-[13px] font-semibold text-[#1C1C1E]">Tone</label>
              <div className="space-y-2">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTone(t.value)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-[var(--radius-lg)] border px-4 py-3 text-left',
                      tone === t.value
                        ? 'border-[#00A3FF] bg-[rgba(0,163,255,0.06)]'
                        : 'border-[rgba(209,213,219,0.3)] bg-[rgba(255,255,255,0.8)]'
                    )}
                  >
                    <div>
                      <p className="text-[14px] font-medium text-[#1C1C1E]">{t.label}</p>
                      <p className="text-[12px] text-[#8E8E93]">{t.desc}</p>
                    </div>
                    {tone === t.value && <Check className="h-4 w-4 text-[#00A3FF]" />}
                  </button>
                ))}
              </div>
            </section>

            {/* Length */}
            <section className="glass rounded-[var(--radius-xl)] p-6">
              <label className="mb-3 block text-[13px] font-semibold text-[#1C1C1E]">Newsletter Length</label>
              <div className="grid grid-cols-3 gap-2">
                {LENGTHS.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => setBriefLength(l.value)}
                    className={cn(
                      'rounded-[var(--radius-lg)] border px-3 py-3 text-center',
                      briefLength === l.value
                        ? 'border-[#00A3FF] bg-[rgba(0,163,255,0.06)]'
                        : 'border-[rgba(209,213,219,0.3)] bg-[rgba(255,255,255,0.8)]'
                    )}
                  >
                    <p className="text-[14px] font-medium text-[#1C1C1E]">{l.label}</p>
                    <p className="text-[11px] text-[#8E8E93]">{l.desc}</p>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <Button
            onClick={handleSave}
            className="mt-8 h-[52px] w-full rounded-full border-0 bg-[linear-gradient(135deg,#00B4FF_0%,#0099FF_100%)] text-[15px] font-semibold text-white shadow-[0_10px_28px_-5px_rgba(0,163,255,0.40)]"
          >
            Save preferences
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
