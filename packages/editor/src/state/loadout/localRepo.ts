/**
 * 本地存档数据访问层
 *
 * 用 Taro.getStorageSync/setStorageSync —— 自动映射：
 *   H5    → localStorage
 *   weapp → wx.getStorageSync / wx.setStorageSync
 *
 * 单 key 存全部（lagrange_loadouts），value 为 LocalStoreShape
 * 阶段2 可新增 createCloudRepo() 实现同接口
 */
import Taro from "@tarojs/taro";
import type { Loadout, LoadoutRepository, LocalStoreShape } from "./types";

const STORAGE_KEY = "lagrange_loadouts";
const CURRENT_VERSION = 1;

const EMPTY_STORE: LocalStoreShape = {
  version: CURRENT_VERSION,
  activeId: null,
  loadouts: [],
};

/** 读整体结构（容错：损坏时回退空） */
export function readStore(): LocalStoreShape {
  try {
    const raw = Taro.getStorageSync(STORAGE_KEY);
    if (!raw) return { ...EMPTY_STORE };
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.loadouts)) {
      return { ...EMPTY_STORE };
    }
    return {
      version: parsed.version ?? CURRENT_VERSION,
      activeId: parsed.activeId ?? null,
      loadouts: parsed.loadouts,
    };
  } catch (e) {
    console.error("[localRepo] readStore 失败，回退空:", e);
    return { ...EMPTY_STORE };
  }
}

/** 写整体结构（容错：超限/失败仅告警，不抛） */
export function writeStore(shape: LocalStoreShape): void {
  try {
    Taro.setStorageSync(STORAGE_KEY, JSON.stringify(shape));
  } catch (e) {
    console.error("[localRepo] writeStore 失败:", e);
    Taro.showToast?.({ title: "存档保存失败（存储满？）", icon: "none" });
  }
}

export function getActiveId(): string | null {
  return readStore().activeId;
}

export function setActiveId(id: string | null): void {
  const s = readStore();
  s.activeId = id;
  writeStore(s);
}

/** 工厂：返回一个 LoadoutRepository（操作单个 Loadout） */
export function createLocalRepo(): LoadoutRepository {
  return {
    async list(): Promise<Loadout[]> {
      return readStore().loadouts;
    },
    async get(id: string): Promise<Loadout | null> {
      return readStore().loadouts.find((l) => l.id === id) ?? null;
    },
    async save(loadout: Loadout): Promise<void> {
      const s = readStore();
      const idx = s.loadouts.findIndex((l) => l.id === loadout.id);
      if (idx >= 0) {
        s.loadouts[idx] = loadout;
      } else {
        s.loadouts.push(loadout);
      }
      writeStore(s);
    },
    async remove(id: string): Promise<void> {
      const s = readStore();
      s.loadouts = s.loadouts.filter((l) => l.id !== id);
      if (s.activeId === id) s.activeId = null;
      writeStore(s);
    },
  };
}
