import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function SpinnerRing() {
  const size = 80;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,85,0,0.08)" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="#FF5500"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circumference * 0.3} ${circumference}`}
        animate={{ strokeDashoffset: [0, -circumference * 0.7] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        style={{ filter: "drop-shadow(0 0 8px rgba(255,85,0,0.5))" }}
      />
    </svg>
  );
}

export default function SplashScreen({ loading }: { loading: boolean }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setShow(false), 400);
      return () => clearTimeout(t);
    }
  }, [loading]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#020203]"
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
              <SpinnerRing />
            </div>

            <div className="text-center">
              <h1 className="text-xl font-semibold text-white/80 tracking-tight">Optimization Way</h1>
              <p className="text-[11px] text-white/20 mt-2 tracking-[0.15em] uppercase">
                {loading ? "Loading System Data" : "Ready"}
              </p>
            </div>

            <div className="flex gap-2">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: "#FF5500" }}
                  animate={{ opacity: loading ? [0.2, 0.8, 0.2] : 0.8 }}
                  transition={loading ? { duration: 1.2, repeat: Infinity, delay: i * 0.25, ease: "easeInOut" } : { duration: 0.3 }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
