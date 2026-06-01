import { motion } from "framer-motion";
import { Cpu, MemoryStick, HardDrive } from "lucide-react";

interface DriveSummary {
  letter: string;
  size: string;
}

interface InitResult {
  cpu_name: string;
  gpu_name: string;
  ram_total: string;
  drives: DriveSummary[];
}

function StatusArc({ value, max, size = 200 }: { value: number; max: number; size?: number }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const arcLength = circumference * 0.75;
  const offset = arcLength * (1 - pct) + circumference * 0.125;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${arcLength} ${circumference}`}
        initial={{ strokeDashoffset: circumference * 0.875 }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        transform={`rotate(-135 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

function SpecCard({ icon: Icon, label, value }: {
  icon: typeof Cpu; label: string; value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] border border-white/[0.05] rounded-xl">
      <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
        <Icon size={16} strokeWidth={1.5} className="text-white/35" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-white/25 uppercase tracking-widest">{label}</div>
        <div className="text-sm font-mono font-medium text-white/70 mt-0.5 truncate">{value}</div>
      </div>
    </div>
  );
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } as const },
} as const;
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } as const },
} as const;

export default function Dashboard({ initData }: { initData?: InitResult | null }) {
  const status: string = "OPTIMIZED";
  const drivesText = initData?.drives.map(d => `${d.letter} ${d.size}`).join(", ") || "—";

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-4xl mx-auto">
      <motion.div variants={item} className="flex justify-center mb-10 mt-4">
        <div className="relative">
          <StatusArc value={status === "EXTREME" ? 95 : 72} max={100} size={220} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="text-center"
            >
              <div className={`text-[11px] tracking-[0.2em] font-medium mb-1 ${status === "EXTREME" ? "text-white/60" : "text-white/40"}`}>
                PC STATUS
              </div>
              <div className={`text-lg font-mono font-bold tracking-tight ${status === "EXTREME" ? "text-white/80" : "text-white/60"}`}>
                {status === "EXTREME" ? "EXTREME MODE" : "OPTIMIZED"}
              </div>
              <div className="text-[10px] text-white/20 font-mono mt-2">
                {status === "EXTREME" ? "Ultimate Performance" : "Safe & Balanced"}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-8">
        <SpecCard icon={Cpu} label="CPU" value={initData?.cpu_name || "—"} />
        <SpecCard icon={Cpu} label="GPU" value={initData?.gpu_name || "—"} />
        <SpecCard icon={MemoryStick} label="RAM" value={initData?.ram_total || "—"} />
        <SpecCard icon={HardDrive} label="Drives" value={drivesText} />
      </motion.div>
    </motion.div>
  );
}
