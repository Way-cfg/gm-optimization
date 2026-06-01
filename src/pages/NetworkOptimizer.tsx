import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "../components/Toast";

interface NetworkTweakInfo {
  key: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  requires_reboot: boolean;
}

interface NetworkAdapterInfo {
  name: string;
  guid: string;
  description: string;
  speed: string;
  is_active: boolean;
}

interface DnsInfo {
  adapter: string;
  servers: string[];
  is_dhcp: boolean;
}

export default function NetworkOptimizer() {
  const [tweaks, setTweaks] = useState<NetworkTweakInfo[]>([]);
  const [_adapters, setAdapters] = useState<NetworkAdapterInfo[]>([]);
  const [dnsList, setDnsList] = useState<DnsInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, a, d] = await Promise.all([
        invoke<NetworkTweakInfo[]>("get_network_tweaks"),
        invoke<NetworkAdapterInfo[]>("get_network_adapters"),
        invoke<DnsInfo[]>("get_dns_servers"),
      ]);
      setTweaks(t);
      setAdapters(a);
      setDnsList(d);
    } catch (e) {
      toast("error", `Failed to load network data: ${e}`);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const applyTweak = async (key: string, enabled: boolean) => {
    try {
      await invoke("apply_network_tweak", { tweakKey: key, enabled });
      toast(enabled ? "success" : "info", `${enabled ? "Applied" : "Disabled"}: ${key.replace(/_/g, " ")}`);
      load();
    } catch (e) {
      toast("error", `Error: ${e}`);
    }
  };

  const setDnsProvider = async (adapter: string, provider: string) => {
    try {
      await invoke("set_dns", { adapter, provider });
      toast("success", `DNS set to ${provider} on ${adapter}`);
      load();
    } catch (e) {
      toast("error", `Failed to set DNS: ${e}`);
    }
  };

  const restoreDns = async (adapter: string) => {
    try {
      await invoke("restore_dns", { adapter });
      toast("info", `DNS restored to DHCP on ${adapter}`);
      load();
    } catch (e) {
      toast("error", `Failed to restore DNS: ${e}`);
    }
  };

  const flushDns = async () => {
    try {
      await invoke("flush_dns");
      toast("success", "DNS cache flushed");
    } catch (e) {
      toast("error", `Failed to flush DNS: ${e}`);
    }
  };

  const categories = [...new Set(tweaks.map((t) => t.category))];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Network Optimizer</h2>
        <button onClick={load} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs transition-colors">
          Refresh
        </button>
      </div>

      {/* DNS tools */}
      <div className="mb-6 p-4 bg-gray-900 border border-gray-800 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-300">DNS Configuration</h3>
          <button onClick={flushDns} className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 rounded text-xs transition-colors">
            Flush DNS
          </button>
        </div>
        {dnsList.length === 0 ? (
          <p className="text-xs text-gray-600">No DNS info available.</p>
        ) : (
          <div className="space-y-3">
            {dnsList.map((d) => (
              <div key={d.adapter} className="text-sm">
                <p className="text-gray-300 font-medium mb-1">{d.adapter}</p>
                <p className="text-xs text-gray-500 mb-1">
                  {d.is_dhcp ? "DHCP (automatic)" : `Static: ${d.servers.join(", ")}`}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setDnsProvider(d.adapter, "cloudflare")} className="px-2.5 py-1 bg-orange-700 hover:bg-orange-600 rounded text-xs transition-colors">
                    Cloudflare
                  </button>
                  <button onClick={() => setDnsProvider(d.adapter, "google")} className="px-2.5 py-1 bg-blue-700 hover:bg-blue-600 rounded text-xs transition-colors">
                    Google DNS
                  </button>
                  {!d.is_dhcp && (
                    <button onClick={() => restoreDns(d.adapter)} className="px-2.5 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors">
                      Restore DHCP
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Network Tweaks */}
      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        categories.map((cat) => (
          <div key={cat} className="mb-5">
            <h3 className="text-sm font-medium text-gray-400 mb-2">{cat}</h3>
            <div className="space-y-1">
              {tweaks.filter((t) => t.category === cat).map((t) => (
                <label key={t.key} className="flex items-center gap-3 p-3 bg-gray-900 border border-gray-800 rounded cursor-pointer hover:border-gray-700">
                  <input
                    type="checkbox"
                    checked={t.enabled}
                    onChange={() => applyTweak(t.key, !t.enabled)}
                    className="accent-emerald-500 shrink-0"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.description}</p>
                    {t.requires_reboot && <p className="text-xs text-yellow-500 mt-0.5">Requires reboot</p>}
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
