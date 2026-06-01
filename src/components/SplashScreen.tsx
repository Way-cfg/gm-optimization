import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function SpinnerRing({ pct }: { pct: number }) {
  const size = 80;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
    </svg>
  );
}

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [pct, setPct] = useState(0);
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (pct < 100) {
      const t = setTimeout(() => setPct(p => Math.min(p + 2, 100)), 30);
      return () => clearTimeout(t);
    }
  }, [pct]);

  useEffect(() => {
    if (pct >= 100) {
      const t = setTimeout(() => {
        setShow(false);
        setTimeout(onFinish, 500);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [pct, onFinish]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#030508]"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col items-center gap-8"
          >
            <div className="relative flex items-center justify-center">
              <SpinnerRing pct={pct} />
              <div className="absolute text-lg font-mono font-medium text-white/60">
                {pct}%
              </div>
            </div>

            <div className="text-center">
              <h1 className="text-xl font-semibold text-white/80 tracking-tight">Optimization Way</h1>
              <p className="text-[11px] text-white/20 mt-2 tracking-[0.15em] uppercase">Initializing System Engine</p>
            </div>

            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-white/30"
                  animate={{ opacity: [0.2, 0.7, 0.2] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.25, ease: "easeInOut" }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
