import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useToast } from "../components/Toast";
import ProgressBar from "../components/ProgressBar";

interface DriveInfo {
  name: string;
  label: string;
  total_space: number;
  free_space: number;
  file_system: string;
}

interface TreemapNode {
  name: string;
  path: string;
  size: number;
  file_type: string;
  is_directory: boolean;
  children: TreemapNode[];
}

export default function DiskAnalyzer() {
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanPath, setScanPath] = useState<string | null>(null);
  const [tree, setTree] = useState<TreemapNode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; label: string } | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => { unlistenRef.current?.(); };
  }, []);

  const listenProgress = async () => {
    unlistenRef.current?.();
    const unlisten = await listen<{ current: number; total: number; label: string }>("scan-progress", (e) => {
      setProgress(e.payload);
    });
    unlistenRef.current = unlisten;
  };

  const loadDrives = async () => {
    setLoading(true);
    try {
      const res = await invoke<DriveInfo[]>("get_drives");
      setDrives(res);
    } catch (e) {
      toast("error", `Failed to load drives: ${e}`);
    }
    setLoading(false);
  };

  useEffect(() => { loadDrives(); }, []);

  const scanDrive = async (path: string) => {
    setScanning(true);
    setScanPath(path);
    setProgress(null);
    await listenProgress();
    try {
      const res = await invoke<TreemapNode>("scan_drive", { drivePath: path });
      setTree(res);
      const childCount = res.children.length;
      const totalSize = res.size;
      toast("success", `Scanned ${path}: ${childCount} items, ${formatSize(totalSize)}`);
    } catch (e) {
      toast("error", `Scan failed: ${e}`);
    }
    setProgress(null);
    setScanning(false);
  };

  const deleteItem = async (path: string) => {
    try {
      await invoke("delete_file", { path });
      toast("success", "Item deleted");
      if (scanPath) scanDrive(scanPath);
    } catch (e) {
      toast("error", `Delete failed: ${e}`);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
    if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const typeColor = (t: string) => {
    const colors: Record<string, string> = {
      video: "text-purple-400",
      image: "text-pink-400",
      executable: "text-blue-400",
      document: "text-yellow-400",
      archive: "text-orange-400",
    };
    return colors[t] || "text-gray-400";
  };

  const sortChildren = (node: TreemapNode): TreemapNode => ({
    ...node,
    children: node.children.sort((a, b) => b.size - a.size).slice(0, 200).map(sortChildren),
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Disk Analyzer</h2>

      {progress && (
        <div className="mb-4">
          <ProgressBar current={progress.current} total={progress.total} label={progress.label} />
        </div>
      )}

      {!tree && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Drives</h3>
          {loading ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {drives.map((d) => {
                const pct = d.total_space > 0 ? ((d.total_space - d.free_space) / d.total_space * 100).toFixed(0) : "0";
                return (
                  <button
                    key={d.name}
                    onClick={() => scanDrive(d.name)}
                    className="text-left p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-emerald-500/50 transition-colors"
                  >
                    <p className="font-semibold text-lg">{d.name} <span className="text-sm font-normal text-gray-400">{d.label || "Local Disk"}</span></p>
                    <p className="text-xs text-gray-500 mt-1">{formatSize(d.free_space)} free / {formatSize(d.total_space)}</p>
                    <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{pct}% used</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {scanning && !progress && <p className="text-gray-400">Scanning {scanPath}...</p>}

      {tree && !scanning && (
        <div>
          <button onClick={() => { setTree(null); setScanPath(null); }} className="mb-3 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs transition-colors">
            ← Back to drives
          </button>
          <p className="text-sm text-gray-400 mb-3">
            {tree.name} — {formatSize(tree.size)}
          </p>
          <div className="space-y-1 max-h-[65vh] overflow-y-auto">
            {sortChildren(tree).children.map((c, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-gray-900 border border-gray-800 rounded">
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{c.name}</p>
                  <p className={`text-xs ${typeColor(c.file_type)}`}>{c.file_type}</p>
                </div>
                <p className="text-xs text-gray-400 shrink-0">{formatSize(c.size)}</p>
                <button onClick={() => deleteItem(c.path)} className="text-xs text-red-400 hover:text-red-300 shrink-0">
                  Del
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
