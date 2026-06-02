import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import appLogo from "../../branding_assets/applogo.png";
import Particles from "./Particles";

function SpinnerRing() {
  const size = 180;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,85,0,0.08)" strokeWidth={stroke} />
        <motion.g
          style={{ originX: `${size / 2}px`, originY: `${size / 2}px` }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
        >
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke="#FF5500"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference * 0.25} ${circumference}`}
            style={{ filter: "drop-shadow(0 0 8px rgba(255,85,0,0.5))" }}
          />
        </motion.g>
      </svg>
      <motion.img
        src={appLogo}
        alt="Optimization Way"
        className="h-24 w-auto"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
    </div>
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
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-obsidian"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <div className="absolute inset-0">
            <Particles
              particleCount={250}
              particleSpread={15}
              speed={0.12}
              particleColors={['#FF5500', '#FF7733', '#FF5500']}
              alphaParticles
              particleBaseSize={80}
              sizeRandomness={0.8}
              cameraDistance={25}
              pixelRatio={1}
            />
          </div>
          <div className="relative z-10 flex flex-col items-center gap-10">
            <SpinnerRing />

            <div className="flex flex-col items-center gap-5">
              <motion.p
                className="text-sm font-sans font-medium text-white/50 tracking-tight"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
              >
                Optimization Way
              </motion.p>
              <motion.p
                className="text-[11px] text-white/20 tracking-[0.15em] uppercase"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.5, ease: "easeOut" }}
              >
                {loading ? "Loading System Data" : "Ready"}
              </motion.p>

              <motion.div
                className="flex gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55, duration: 0.5 }}
              >
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: "#FF5500" }}
                    animate={{ opacity: loading ? [0.2, 0.8, 0.2] : 0.8 }}
                    transition={loading ? { duration: 1.2, repeat: Infinity, delay: i * 0.25, ease: "easeInOut" } : { duration: 0.3 }}
                  />
                ))}
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
