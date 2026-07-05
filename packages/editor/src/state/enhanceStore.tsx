/**
 * 全局强化等级状态（跨页面共享）
 *
 * 强化页（enhance）点的等级存这里，蓝图页（blueprint-design）读取后
 * 转 techStr 传给 resolveBlueprint，使面板属性反映强化加成。
 *
 * 按 shipId 分组存储（切船不丢），value = Map<enhanceId, level>。
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

/** enhanceId(9位) → level */
export type EnhanceLevels = Record<string, number>;

interface EnhanceStateContextValue {
  /** 取某船的强化等级（返回普通对象，便于 levelsToTechStr 消费） */
  getLevels: (shipId: string) => EnhanceLevels;
  /** 整体替换某船的强化等级 */
  setLevels: (shipId: string, levels: EnhanceLevels) => void;
  /** 更新单项等级（level<=0 删除） */
  setLevel: (shipId: string, enhanceId: string, level: number) => void;
  /** 清空某船 */
  clearShip: (shipId: string) => void;
  /** 版本号（每次变更自增，便于 useMemo 依赖） */
  version: number;
}

const EnhanceStateContext = createContext<EnhanceStateContextValue | null>(null);

export function EnhanceStateProvider({ children }: { children: ReactNode }) {
  // shipId → EnhanceLevels
  const [store, setStore] = useState<Record<string, EnhanceLevels>>({});
  const [version, setVersion] = useState(0);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const getLevels = useCallback(
    (shipId: string): EnhanceLevels => store[shipId] ?? {},
    [store]
  );

  const setLevels = useCallback(
    (shipId: string, levels: EnhanceLevels) => {
      setStore((prev) => {
        const next = { ...prev };
        if (Object.keys(levels).length === 0) {
          delete next[shipId];
        } else {
          next[shipId] = { ...levels };
        }
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
        const cur = { ...(next[shipId] ?? {}) };
        if (level <= 0) {
          delete cur[enhanceId];
        } else {
          cur[enhanceId] = level;
        }
        if (Object.keys(cur).length === 0) {
          delete next[shipId];
        } else {
          next[shipId] = cur;
        }
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
        delete next[shipId];
        return next;
      });
      bump();
    },
    [bump]
  );

  return (
    <EnhanceStateContext.Provider value={{ getLevels, setLevels, setLevel, clearShip, version }}>
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
