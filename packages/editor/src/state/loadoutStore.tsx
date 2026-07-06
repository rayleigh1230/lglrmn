/**
 * 存档 Store（Context）—— 管理存档列表 + 当前激活存档
 *
 * 架构：一个存档 = 所有船配置的整体快照。
 * loadoutStore 只管「有哪些存档 / 哪个激活 + 持久化」，
 * 具体的船配置工作态在 enhanceStore 里，由页面层编排两者：
 *   - 切换存档：page 调 switchTo() 拿到 loadout，再调 enhanceState.hydrateFromShips()
 *   - 保存：page 调 enhanceState.snapshotAll() 拿快照，再调 saveActive(snapshot)
 *
 * Provider 必须在 EnhanceStateProvider 外层（enhanceStore mount 时读激活存档 hydrate）。
 */
import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import { createLocalRepo, readStore, writeStore } from "./loadout/localRepo";
import { createLoadout, type Loadout, type ShipConfig } from "./loadout/types";

const DEFAULT_LOADOUT_NAME = "默认存档";

interface LoadoutContextValue {
  loadouts: Loadout[];
  activeId: string | null;
  /** 当前激活存档对象（派生） */
  active: Loadout | null;
  /** 新建存档（空），设为激活，返回新 loadout 供页面 hydrate */
  createLoadout: (name?: string) => Loadout;
  /** 切换激活存档，返回该 loadout 供页面 hydrate */
  switchTo: (id: string) => Loadout | null;
  /** 重命名 */
  renameLoadout: (id: string, name: string) => void;
  /** 删除存档（若删的是激活项，自动切到第一个；全空则重建默认） */
  deleteLoadout: (id: string) => void;
  /** 保存快照到当前激活存档（更新 ships + updatedAt） */
  saveActive: (ships: Record<string, ShipConfig>) => void;
}

const LoadoutContext = createContext<LoadoutContextValue | null>(null);

const repo = createLocalRepo();

export function LoadoutProvider({ children }: { children: ReactNode }) {
  // mount 时同步初始化：确保至少有一个存档（默认存档）并激活
  const [loadouts, setLoadouts] = useState<Loadout[]>(() => {
    const s = readStore();
    if (s.loadouts.length > 0) return s.loadouts;
    // 首次启动：创建默认存档
    const def = createLoadout(DEFAULT_LOADOUT_NAME);
    writeStore({ version: s.version, activeId: def.id, loadouts: [def] });
    return [def];
  });
  const [activeId, setActiveId] = useState<string | null>(() => {
    const s = readStore();
    return s.activeId ?? s.loadouts[0]?.id ?? null;
  });

  const active = useMemo(
    () => loadouts.find((l) => l.id === activeId) ?? null,
    [loadouts, activeId]
  );

  const persist = useCallback((next: Loadout[], nextActiveId: string | null) => {
    writeStore({ version: 1, activeId: nextActiveId, loadouts: next });
  }, []);

  const create = useCallback(
    (name?: string): Loadout => {
      const lo = createLoadout(name?.trim() || `存档 ${loadouts.length + 1}`);
      const next = [...loadouts, lo];
      setLoadouts(next);
      setActiveId(lo.id);
      persist(next, lo.id);
      return lo;
    },
    [loadouts, persist]
  );

  const switchTo = useCallback(
    (id: string): Loadout | null => {
      const lo = loadouts.find((l) => l.id === id) ?? null;
      if (!lo) return null;
      setActiveId(id);
      persist(loadouts, id);
      return lo;
    },
    [loadouts, persist]
  );

  const renameLoadout = useCallback(
    (id: string, name: string) => {
      const next = loadouts.map((l) => (l.id === id ? { ...l, name, updatedAt: Date.now() } : l));
      setLoadouts(next);
      persist(next, activeId);
    },
    [loadouts, activeId, persist]
  );

  const deleteLoadout = useCallback(
    (id: string) => {
      let next = loadouts.filter((l) => l.id !== id);
      let nextActive = activeId;
      // 全删空 → 重建默认存档，避免无存档态
      if (next.length === 0) {
        const def = createLoadout(DEFAULT_LOADOUT_NAME);
        next = [def];
        nextActive = def.id;
      } else if (activeId === id) {
        nextActive = next[0].id;
      }
      setLoadouts(next);
      setActiveId(nextActive);
      persist(next, nextActive);
    },
    [loadouts, activeId, persist]
  );

  const saveActive = useCallback(
    (ships: Record<string, ShipConfig>) => {
      if (!activeId) return;
      const next = loadouts.map((l) =>
        l.id === activeId ? { ...l, ships, updatedAt: Date.now() } : l
      );
      setLoadouts(next);
      persist(next, activeId);
    },
    [loadouts, activeId, persist]
  );

  const value: LoadoutContextValue = {
    loadouts,
    activeId,
    active,
    createLoadout: create,
    switchTo,
    renameLoadout,
    deleteLoadout,
    saveActive,
  };

  return <LoadoutContext.Provider value={value}>{children}</LoadoutContext.Provider>;
}

export function useLoadoutStore(): LoadoutContextValue {
  const ctx = useContext(LoadoutContext);
  if (!ctx) throw new Error("useLoadoutStore 必须在 LoadoutProvider 内使用");
  return ctx;
}
