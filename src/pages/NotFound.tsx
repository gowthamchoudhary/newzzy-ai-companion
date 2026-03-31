import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="page-shell flex items-center justify-center">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass max-w-lg rounded-[var(--radius-2xl)] px-8 py-10 text-center">
        <p className="micro-label">Route not found</p>
        <h1 className="font-display mt-3 text-[36px] font-bold text-[#1C1C1E]">404</h1>
        <p className="mt-3 text-[13px] text-[#8E8E93]">This page drifted out of the live briefing. Let&apos;s get you back home.</p>
        <Link to="/" className="mt-5 inline-flex rounded-full bg-[linear-gradient(135deg,#00B4FF,#0099FF)] px-5 py-3 text-[15px] font-semibold text-white shadow-[0_10px_28px_-5px_rgba(0,163,255,0.40)]">
          Return home
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;
