import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VOICES, INTERESTS, savePreferences } from '@/lib/store';

export default function Onboarding() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleGo = (path: string) => {
    const interests = [...selectedInterests];
    if (customInterest.trim()) interests.push(customInterest.trim());

    savePreferences({
      name: name.trim() || 'User',
      voiceId: selectedVoice.id,
      voiceName: selectedVoice.name,
      interests,
    });
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg space-y-8"
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Newzzy</h1>
          <p className="text-muted-foreground mt-2">Your Personal AI News Companion</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">What's your name?</label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter your name"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Pick your interests</label>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map(interest => (
              <button
                key={interest}
                onClick={() => toggleInterest(interest)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  selectedInterests.includes(interest)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-accent'
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
          <Input
            value={customInterest}
            onChange={e => setCustomInterest(e.target.value)}
            placeholder="Add custom interest..."
            className="mt-2"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Choose a voice</label>
          <div className="flex gap-2 flex-wrap">
            {VOICES.map(voice => (
              <button
                key={voice.name}
                onClick={() => setSelectedVoice(voice)}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  selectedVoice.name === voice.name
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-accent'
                }`}
              >
                {voice.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={() => handleGo('/chat')} className="flex-1" size="lg">
            Start News Chat
          </Button>
          <Button onClick={() => handleGo('/debate')} variant="destructive" className="flex-1" size="lg">
            Debate Arena
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
