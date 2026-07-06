/**
 * 全局船配置工作态（跨页面共享）—— 存档驱动
 *
 * store 形态：shipId → ShipConfig（含 enhanceLevels + peakLevel + enabledSlots）。
 * 强化页加点 / 蓝图页巅峰+装配 都写这里；保存时 loadoutStore.saveActive() 取走快照。
 *
 * 与存档系统的协作（页面层编排）：
 *   - 启动/mount：用当前激活存档的 ships hydrate 进来
 *   - 切换存档：页面调 hydrateFromShips(newShips) 整体替换
 *   - 保存：页面调 snapshotAll() 取出全量写回当前激活存档
 *
 * 对外保留旧接口（getLevels/setLevels/setLevel/clearShip），blueprint-design/enhance 调用方式不变。
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { ShipConfig } from "./loadout/types";

/** enhanceId(9位) → level（旧别名，保持兼容） */
export type EnhanceLevels = Record<string, number>;

const EMPTY_CONFIG: ShipConfig = { enhanceLevels: {}, peakLevel: 0, enabledSlots: [] };

interface EnhanceStateContextValue {
  /** 取某船强化等级（兼容旧接口，返回普通对象便于 levelsToTechStr 消费） */
  getLevels: (shipId: string) => EnhanceLevels;
  /** 整体替换某船强化等级 */
  setLevels: (shipId: string, levels: EnhanceLevels) => void;
  /** 更新单项等级（level<=0 删除） */
  setLevel: (shipId: string, enhanceId: string, level: number) => void;
  /** 清空某船强化等级（保留巅峰/装配） */
  clearShip: (shipId: string) => void;
  /** 取某船完整配置 */
  getShipConfig: (shipId: string) => ShipConfig;
  /** 设置巅峰等级 */
  setPeakLevel: (shipId: string, level: number) => void;
  /** 设置装配清单 */
  setEnabledSlots: (shipId: string, slots: string[]) => void;
  /** 切换存档时整体替换工作态 */
  hydrateFromShips: (ships: Record<string, ShipConfig>) => void;
  /** 保存时取全量快照 */
  snapshotAll: () => Record<string, ShipConfig>;
  /** 版本号（每次变更自增，便于 useMemo 依赖） */
  version: number;
}

const EnhanceStateContext = createContext<EnhanceStateContextValue | null>(null);

/** 从激活存档同步 hydrate（由 app.ts 调用，mount 后灌入） */
export function EnhanceStateProvider({ children }: { children: ReactNode }) {
  // shipId → ShipConfig
  const [store, setStore] = useState<Record<string, ShipConfig>>({});
  const [version, setVersion] = useState(0);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const getLevels = useCallback(
    (shipId: string): EnhanceLevels => store[shipId]?.enhanceLevels ?? {},
    [store]
  );

  const setLevels = useCallback(
    (shipId: string, levels: EnhanceLevels) => {
      setStore((prev) => {
        const next = { ...prev };
        const cur = next[shipId] ? { ...next[shipId] } : { ...EMPTY_CONFIG };
        cur.enhanceLevels = { ...levels };
        next[shipId] = cur;
        return next;
      });
      bump();
    },
    [bump]
  );

  const setLevel = useCallback(
    (shipId: string, enhanceId: string, level: number) => {
      setStore((prev) => {
        const next = { ...prev };
        const cur = next[shipId] ? { ...next[shipId] } : { ...EMPTY_CONFIG };
        cur.enhanceLevels = { ...cur.enhanceLevels };
        if (level <= 0) {
          delete cur.enhanceLevels[enhanceId];
        } else {
          cur.enhanceLevels[enhanceId] = level;
        }
        next[shipId] = cur;
        return next;
      });
      bump();
    },
    [bump]
  );

  const clearShip = useCallback(
    (shipId: string) => {
      setStore((prev) => {
        const next = { ...prev };
        if (next[shipId]) {
          // 仅清强化等级，保留巅峰/装配
          next[shipId] = { ...next[shipId], enhanceLevels: {} };
        }
        return next;
      });
      bump();
    },
    [bump]
  );

  const getShipConfig = useCallback(
    (shipId: string): ShipConfig => store[shipId] ?? { ...EMPTY_CONFIG },
    [store]
  );

  const setPeakLevel = useCallback(
    (shipId: string, level: number) => {
      setStore((prev) => {
        const next = { ...prev };
        const cur = next[shipId] ? { ...next[shipId] } : { ...EMPTY_CONFIG };
        cur.peakLevel = level;
        next[shipId] = cur;
        return next;
      });
      bump();
    },
    [bump]
  );

  const setEnabledSlots = useCallback(
    (shipId: string, slots: string[]) => {
      setStore((prev) => {
        const next = { ...prev };
        const cur = next[shipId] ? { ...next[shipId] } : { ...EMPTY_CONFIG };
        cur.enabledSlots = [...slots];
        next[shipId] = cur;
        return next;
      });
      bump();
    },
    [bump]
  );

  const hydrateFromShips = useCallback(
    (ships: Record<string, ShipConfig>) => {
      // 深拷贝，避免与存档对象共享引用
      const next: Record<string, ShipConfig> = {};
      for (const k in ships) {
        const s = ships[k];
        next[k] = {
          enhanceLevels: { ...s.enhanceLevels },
          peakLevel: s.peakLevel ?? 0,
          enabledSlots: [...(s.enabledSlots ?? [])],
        };
      }
      setStore(next);
      bump();
    },
    [bump]
  );

  const snapshotAll = useCallback((): Record<string, ShipConfig> => {
    const snap: Record<string, ShipConfig> = {};
    for (const k in store) {
      const s = store[k];
      snap[k] = {
        enhanceLevels: { ...s.enhanceLevels },
        peakLevel: s.peakLevel,
        enabledSlots: [...s.enabledSlots],
      };
    }
    return snap;
  }, [store]);

  return (
    <EnhanceStateContext.Provider
      value={{
        getLevels,
        setLevels,
        setLevel,
        clearShip,
        getShipConfig,
        setPeakLevel,
        setEnabledSlots,
        hydrateFromShips,
        snapshotAll,
        version,
      }}
    >
      {children}
    </EnhanceStateContext.Provider>
  );
}

export function useEnhanceState(): EnhanceStateContextValue {
  const ctx = useContext(EnhanceStateContext);
  if (!ctx) {
    throw new Error("useEnhanceState 必须在 EnhanceStateProvider 内使用");
  }
  return ctx;
}
