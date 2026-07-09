/**
 * 全局船配置工作态（跨页面共享）—— 存档驱动
 *
 * store 形态：uid → ShipRecord（含 shipId + enhanceLevels + peakLevel + enabledSlots）。
 * 强化页加点 / 蓝图页巅峰+装配 都写这里；保存时 loadoutStore.saveActive() 取走快照。
 *
 * 与存档系统的协作（页面层编排）：
 *   - 启动/mount：用当前激活存档的 ships hydrate 进来
 *   - 切换存档：页面调 hydrateFromShips(newShips) 整体替换
 *   - 保存：页面调 snapshotAll() 取出全量写回当前激活存档
 *
 * 对外保留旧接口（getLevels/setLevels/setLevel/clearShip），blueprint-design/enhance 调用方式不变。
 *
 * 注：工作态里 key 即 uid（实例唯一 ID）。新建条目时若没指定 shipId，默认 uid 作 shipId（兼容老调用方）。
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { ShipRecord } from "./loadout/types";

/** enhanceId(9位) → level（旧别名，保持兼容） */
export type EnhanceLevels = Record<string, number>;

interface EnhanceStateContextValue {
  /** 取某船强化等级（兼容旧接口，返回普通对象便于 levelsToTechStr 消费） */
  getLevels: (uid: string) => EnhanceLevels;
  /** 整体替换某船强化等级 */
  setLevels: (uid: string, levels: EnhanceLevels) => void;
  /** 更新单项等级（level<=0 删除） */
  setLevel: (uid: string, enhanceId: string, level: number) => void;
  /** 清空某船强化等级（保留巅峰/装配） */
  clearShip: (uid: string) => void;
  /** 取某船完整配置 */
  getShipConfig: (uid: string) => ShipRecord;
  /** 设置巅峰等级 */
  setPeakLevel: (uid: string, level: number) => void;
  /** 设置装配清单 */
  setEnabledSlots: (uid: string, slots: string[]) => void;
  /** 切换存档时整体替换工作态 */
  hydrateFromShips: (ships: Record<string, ShipRecord>) => void;
  /** 保存时取全量快照 */
  snapshotAll: () => Record<string, ShipRecord>;
  /** 版本号（每次变更自增，便于 useMemo 依赖） */
  version: number;
}

const EnhanceStateContext = createContext<EnhanceStateContextValue | null>(null);

/** 从激活存档同步 hydrate（由 app.ts 调用，mount 后灌入） */
export function EnhanceStateProvider({ children }: { children: ReactNode }) {
  // uid → ShipRecord
  const [store, setStore] = useState<Record<string, ShipRecord>>({});
  const [version, setVersion] = useState(0);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  /** 用 uid 构造空 ShipRecord（默认 uid 作 shipId，调用方可显式传 shipId） */
  const makeEmpty = (uid: string, shipId?: string): ShipRecord => ({
    uid,
    shipId: shipId ?? uid,
    peakLevel: 0,
    enhanceLevels: {},
    enabledSlots: [],
  });

  const getLevels = useCallback(
    (uid: string): EnhanceLevels => store[uid]?.enhanceLevels ?? {},
    [store]
  );

  const setLevels = useCallback(
    (uid: string, levels: EnhanceLevels) => {
      setStore((prev) => {
        const next = { ...prev };
        const cur = next[uid] ? { ...next[uid] } : makeEmpty(uid);
        cur.enhanceLevels = { ...levels };
        next[uid] = cur;
        return next;
      });
      bump();
    },
    [bump]
  );

  const setLevel = useCallback(
    (uid: string, enhanceId: string, level: number) => {
      setStore((prev) => {
        const next = { ...prev };
        const cur = next[uid] ? { ...next[uid] } : makeEmpty(uid);
        cur.enhanceLevels = { ...cur.enhanceLevels };
        if (level <= 0) {
          delete cur.enhanceLevels[enhanceId];
        } else {
          cur.enhanceLevels[enhanceId] = level;
        }
        next[uid] = cur;
        return next;
      });
      bump();
    },
    [bump]
  );

  const clearShip = useCallback(
    (uid: string) => {
      setStore((prev) => {
        const next = { ...prev };
        if (next[uid]) {
          // 仅清强化等级，保留巅峰/装配
          next[uid] = { ...next[uid], enhanceLevels: {} };
        }
        return next;
      });
      bump();
    },
    [bump]
  );

  const getShipConfig = useCallback(
    (uid: string): ShipRecord => {
      const cur = store[uid] ?? makeEmpty(uid);
      // ★巅峰等级按舰型共享：若当前 record 未显式设过(=0)，从同舰型其他子型号取
      if (!cur.peakLevel) {
        const typePrefix = (cur.shipId ?? uid).slice(0, 3);
        for (const k in store) {
          if (k === uid) continue;
          const sid = store[k].shipId ?? k;
          if (sid.slice(0, 3) === typePrefix && store[k].peakLevel) {
            return { ...cur, peakLevel: store[k].peakLevel };
          }
        }
      }
      return cur;
    },
    [store]
  );

  const setPeakLevel = useCallback(
    (uid: string, level: number) => {
      setStore((prev) => {
        const next = { ...prev };
        // ★巅峰等级按舰型共享：同 shipId 前3位（舰型）的所有子型号一起更新
        //   调用方传入的 uid 即 shipId（5位），取前3位作舰型 key
        const target = next[uid] ? { ...next[uid] } : makeEmpty(uid);
        const typePrefix = (target.shipId ?? uid).slice(0, 3);
        target.peakLevel = level;
        next[uid] = target;
        // 同步更新同舰型的其他子型号
        for (const k in next) {
          if (k === uid) continue;
          const sid = next[k].shipId ?? k;
          if (sid.slice(0, 3) === typePrefix) {
            next[k] = { ...next[k], peakLevel: level };
          }
        }
        return next;
      });
      bump();
    },
    [bump]
  );

  const setEnabledSlots = useCallback(
    (uid: string, slots: string[]) => {
      setStore((prev) => {
        const next = { ...prev };
        const cur = next[uid] ? { ...next[uid] } : makeEmpty(uid);
        cur.enabledSlots = [...slots];
        next[uid] = cur;
        return next;
      });
      bump();
    },
    [bump]
  );

  const hydrateFromShips = useCallback(
    (ships: Record<string, ShipRecord>) => {
      // 深拷贝，避免与存档对象共享引用
      const next: Record<string, ShipRecord> = {};
      for (const k in ships) {
        const s = ships[k];
        next[k] = {
          uid: s.uid ?? k,
          shipId: s.shipId ?? k,
          enhanceLevels: { ...s.enhanceLevels },
          peakLevel: s.peakLevel ?? 0,
          enabledSlots: [...(s.enabledSlots ?? [])],
          ...(s.bpId != null ? { bpId: s.bpId } : {}),
          ...(s.bpSystemSchemeUniqueId != null
            ? { bpSystemSchemeUniqueId: s.bpSystemSchemeUniqueId }
            : {}),
          ...(s.aircrafts != null ? { aircrafts: s.aircrafts } : {}),
          ...(s.note != null ? { note: s.note } : {}),
        };
      }
      setStore(next);
      bump();
    },
    [bump]
  );

  const snapshotAll = useCallback((): Record<string, ShipRecord> => {
    const snap: Record<string, ShipRecord> = {};
    for (const k in store) {
      const s = store[k];
      snap[k] = {
        uid: s.uid ?? k,
        shipId: s.shipId ?? k,
        enhanceLevels: { ...s.enhanceLevels },
        peakLevel: s.peakLevel,
        enabledSlots: [...s.enabledSlots],
        ...(s.bpId != null ? { bpId: s.bpId } : {}),
        ...(s.bpSystemSchemeUniqueId != null
          ? { bpSystemSchemeUniqueId: s.bpSystemSchemeUniqueId }
          : {}),
        ...(s.aircrafts != null ? { aircrafts: s.aircrafts } : {}),
        ...(s.note != null ? { note: s.note } : {}),
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
