interface RingSpinnerProps {
  size?: number;
  strokeWidth?: number;
}

export function RingSpinner({ size = 32, strokeWidth = 3 }: RingSpinnerProps) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="tech-ring-spinner inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,85,0,0.5)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.75}
          className="origin-center"
        />
      </svg>
    </div>
  );
}

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  compact?: boolean;
}

export default function ProgressBar({ current, total, label, compact }: ProgressBarProps) {
  const pct = total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <RingSpinner size={16} strokeWidth={2} />
        {label && <span className="text-xs text-white/40">{label}</span>}
        <span className="text-xs text-white/30 font-mono">{pct}%</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        {label && <span className="text-xs text-white/50 truncate mr-2">{label}</span>}
        <span className="text-xs text-white/30 font-mono">{pct}%</span>
      </div>
      <div className="w-full h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full bg-neon/60 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
