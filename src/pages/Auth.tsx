import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import newzzyLogo from '@/assets/newzzy-logo.png';

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        navigate('/onboarding');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/onboarding');
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass w-full max-w-[420px] rounded-[var(--radius-2xl)] px-8 py-10"
      >
        <div className="flex flex-col items-center gap-4 mb-8">
          <img src={newzzyLogo} alt="Newzzy" className="h-20 w-20 rounded-2xl" />
          <div className="text-center">
            <h1 className="wordmark text-4xl">Newzzy</h1>
            <p className="mt-2 text-[14px] text-[#8E8E93]">Your world. Your voice. Right now.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#1C1C1E]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="editorial-input"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#1C1C1E]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="editorial-input"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="h-[52px] w-full rounded-full border-0 bg-[linear-gradient(135deg,#00B4FF_0%,#0099FF_100%)] text-[15px] font-semibold text-white shadow-[0_10px_28px_-5px_rgba(0,163,255,0.40)] hover:shadow-[0_12px_32px_-4px_rgba(0,163,255,0.50)]"
          >
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-[13px] text-[#8E8E93]">
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="font-medium text-[#00A3FF] hover:underline"
          >
            {mode === 'signin' ? 'Get started' : 'Sign in'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
