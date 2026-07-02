/**
 * 编辑器全局数据状态 hook
 * 加载 store + manifest, 提供给所有页面
 */
import { useState, useEffect, useCallback } from "react";
import type { ClientDataStore } from "@lagrange/engine";
import { loadAll } from "../data/loadStore";
import { setManifest, type IconManifest } from "../data/iconResolver";

export interface EditorData {
  store: ClientDataStore | null;
  manifest: IconManifest | null;
  loading: boolean;
  error: string | null;
}

export function useEditorData(): EditorData & { reload: () => void } {
  const [store, setStore] = useState<ClientDataStore | null>(null);
  const [manifest, setManifestState] = useState<IconManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { store, manifest } = await loadAll();
      setStore(store);
      setManifest(manifest);
      setManifestState(manifest);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { store, manifest, loading, error, reload: load };
}
