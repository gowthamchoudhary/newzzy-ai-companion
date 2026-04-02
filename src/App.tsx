import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConversationProvider } from "@elevenlabs/react";
import { AnimatePresence, motion } from "framer-motion";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Onboarding from "./pages/Onboarding";
import Chat from "./pages/Chat";
import Debate from "./pages/Debate";
import News from "./pages/News";
import NotFound from "./pages/NotFound";
import { GradientOrb } from "./components/GradientOrb";

const queryClient = new QueryClient();

function LoadingScreen() {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[linear-gradient(to_bottom,#F0F8FF_0%,#E8F4FD_40%,#E6F0FA_100%)] px-6"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
    >
      <div className="glass flex flex-col items-center gap-6 rounded-[28px] px-10 py-12 text-center">
        <motion.h1
          className="wordmark text-5xl font-bold tracking-[-0.04em] md:text-6xl"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Newzzy
        </motion.h1>
        <GradientOrb state="idle" accent="chat" size="lg" />
        <motion.p
          className="font-display text-sm text-[#8E8E93]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
        >
          Loading your companion...
        </motion.p>
      </div>
    </motion.div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="min-h-screen"
      >
        <Routes location={location}>
          <Route path="/" element={<Onboarding />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/debate" element={<Debate />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 800);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ConversationProvider>
          <AnimatePresence>{showSplash ? <LoadingScreen /> : null}</AnimatePresence>
          <Toaster />
          <Sonner position="bottom-right" richColors />
          <BrowserRouter>
            <AnimatedRoutes />
          </BrowserRouter>
        </ConversationProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
