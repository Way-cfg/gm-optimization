import { motion } from "framer-motion";
import { Zap } from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } as const },
} as const;
const child = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } as const },
} as const;

export default function TweaksHub() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-3xl mx-auto">
      <motion.div variants={child} className="mb-8">
        <h1 className="text-xl font-semibold text-white/90 tracking-tight">Tweaks Hub</h1>
        <p className="text-sm text-white/25 mt-1">No tweaks configured yet</p>
      </motion.div>
      <motion.div variants={child} className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mb-4">
          <Zap size={20} strokeWidth={1.5} className="text-white/20" />
        </div>
        <p className="text-sm text-white/20 font-mono max-w-md">
          Tweaks will be added one by one.
        </p>
      </motion.div>
    </motion.div>
  );
}
