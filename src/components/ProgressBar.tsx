interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
}

export default function ProgressBar({ current, total, label }: ProgressBarProps) {
  const pct = total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        {label && <span className="text-xs text-gray-400 truncate mr-2">{label}</span>}
        <span className="text-xs text-gray-500 shrink-0">{pct}%</span>
      </div>
      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
