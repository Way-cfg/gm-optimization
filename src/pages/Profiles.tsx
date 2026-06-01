import { useState, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "../components/Toast";

export default function Profiles() {
  const [profileName, setProfileName] = useState("");
  const [profileDesc, setProfileDesc] = useState("");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const json = await invoke<string>("export_profile");
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `optimization-profile-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast("success", "Profile exported successfully");
    } catch (e) {
      toast("error", `Export failed: ${e}`);
    }
    setExporting(false);
  }, [toast]);

  const handleImportFile = useCallback(async () => {
    fileRef.current?.click();
  }, []);

  const onFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const name = profileName.trim() || file.name.replace(/\.json$/i, "");
      const desc = profileDesc.trim() || `Imported from ${file.name}`;
      const msg = await invoke<string>("import_profile", { json: text, name, description: desc });
      toast("success", msg);
      setProfileName("");
      setProfileDesc("");
    } catch (e) {
      toast("error", `Import failed: ${e}`);
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
  }, [profileName, profileDesc, toast]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Profiles</h2>
      <p className="text-sm text-gray-400 mb-6">
        Export your current tweak configuration or import a saved profile.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept=".json"
        onChange={onFileSelected}
        className="hidden"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export */}
        <div className="p-5 bg-gray-900 border border-gray-800 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Export Profile</h3>
          <p className="text-sm text-gray-500 mb-4">
            Save all current tweaks, network settings, and exclusions to a JSON file.
          </p>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm font-medium transition-colors"
          >
            {exporting ? "Exporting..." : "Export Profile"}
          </button>
        </div>

        {/* Import */}
        <div className="p-5 bg-gray-900 border border-gray-800 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Import Profile</h3>
          <p className="text-sm text-gray-500 mb-4">
            Load a previously exported profile and apply its configuration.
          </p>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Profile name (optional)"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:outline-none focus:border-emerald-500"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={profileDesc}
              onChange={(e) => setProfileDesc(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleImportFile}
              disabled={importing}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm font-medium transition-colors"
            >
              {importing ? "Importing..." : "Select & Import Profile"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
