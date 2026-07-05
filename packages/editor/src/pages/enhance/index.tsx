import { useMemo, useState, useEffect, useRef } from "react";
import { View, Text } from "@tarojs/components";
import Taro, { useRouter } from "@tarojs/taro";
import { useEditorData } from "../../state/useEditorData";
import { useEnhanceState } from "../../state/enhanceStore";
import {
  resolveEnhanceSystem,
  isEnhanceAvailable,
  type EnhanceSlot,
} from "@lagrange/engine";
import {
  resolveEnhanceTreeVM,
  resolveSystemNav,
  resolveTuneRowVM,
  renderEnhanceDesc,
  singleCost,
  fullCost,
  type EnhanceSheetVM,
  type TuneSlotVM,
} from "../../data/enhanceView";
import { enhanceIcon } from "../../data/iconResolver";
import EnhanceTree from "../../components/EnhanceTree";
import EnhanceSheet from "../../components/EnhanceSheet";
import TuneRow from "../../components/TuneRow";
import TuneSheet from "../../components/TuneSheet";
import SystemNav from "../../components/SystemNav";
import "./index.css";

export default function EnhancePage() {
  const router = useRouter();
  const shipId = (router.params.shipId || "") as string;
  const peakLevel = Number(router.params.peakLevel || 0);
  // ★从蓝图页传来的装配选择（超主力舰切换组成员 systemId，逗号分隔）
  //   强化页系统排与蓝图页强关联：只显示并强化已装配的系统
  const enabledSlots = (() => {
    const raw = (router.params.slots || "") as string;
    return raw ? raw.split(",").filter(Boolean) : undefined;
  })();
  const { store, loading, error } = useEditorData();

  const [currentSlotId, setCurrentSlotId] = useState("");
  const enhanceState = useEnhanceState();
  // acquired: 本地 state 驱动 UI，初始化从全局 store 取，变更时同步回全局
  const [acquired, setAcquired] = useState<Map<string, number>>(() => {
    const globalLevels = enhanceState.getLevels(shipId);
    return new Map(Object.entries(globalLevels));
  });
  // ★防循环标记：本页发起的 updateAcquired 会 bump version，用 ref 标记跳过自己触发的同步
  const selfUpdated = useRef(false);
  // 全局 store 变化时（如从其他页回来）同步到本地；跳过本页自己发起的更新
  useEffect(() => {
    if (selfUpdated.current) {
      selfUpdated.current = false; // 自己触发的 version 变化，不同步回本地
      return;
    }
    const globalLevels = enhanceState.getLevels(shipId);
    setAcquired(new Map(Object.entries(globalLevels)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipId, enhanceState.version]);
  // 本地变更同步回全局 store
  const updateAcquired = (updater: (prev: Map<string, number>) => Map<string, number>) => {
    selfUpdated.current = true; // 标记本次 version 变化是本页发起的
    setAcquired((prev) => {
      const next = updater(prev);
      // 同步到全局 store（转普通对象）
      const obj: Record<string, number> = {};
      next.forEach((v, k) => { if (v > 0) obj[k] = v; });
      enhanceState.setLevels(shipId, obj);
      return next;
    });
  };
  const [sheet, setSheet] = useState<
    | { type: "node"; enhanceId: string }
    | { type: "choice"; choiceKey: string }
    | null
  >(null);
  const [preview, setPreview] = useState(false); // 全部加强预览开关
  const [tuneSlot, setTuneSlot] = useState<TuneSlotVM | null>(null); // 调校浮窗

  const sys = useMemo(() => {
    if (!store || !shipId) return null;
    // ★传 enabledSlots：切换组的 isActive/hasModule 与蓝图页装配选择一致
    return resolveEnhanceSystem(store, shipId, enabledSlots);
  }, [store, shipId, enabledSlots]);

  const navResult = useMemo(() => {
    if (!store || !shipId) return { items: [], defaultSlotId: "" };
    return resolveSystemNav(store, shipId, currentSlotId, acquired, enabledSlots);
  }, [store, shipId, currentSlotId, acquired, enabledSlots]);

  // 默认槽初始化（进页面后取 slotId 最小）
  if (!currentSlotId && navResult.defaultSlotId) {
    setCurrentSlotId(navResult.defaultSlotId);
  }

  const treeVM = useMemo(() => {
    if (!store || !currentSlotId) return null;
    const selId = sheet?.type === "node" ? sheet.enhanceId : undefined;
    return resolveEnhanceTreeVM(store, shipId, currentSlotId, acquired, selId, peakLevel, enabledSlots);
  }, [store, shipId, currentSlotId, acquired, sheet, peakLevel, enabledSlots]);

  const tuneRowVM = useMemo(() => {
    if (!store || !currentSlotId) return [];
    // choiceGroups 参数保留向后兼容（调校区不再隐藏，改为图标联动）
    return resolveTuneRowVM(store, shipId, currentSlotId, acquired, treeVM?.choiceGroups);
  }, [store, shipId, currentSlotId, acquired, treeVM]);

  // ★被调校项关联的强化项 ID 集合（改进4：强化节点加 icon_link 标记）
  const linkedEnhanceIds = useMemo(() => {
    const s = new Set<string>();
    for (const t of tuneRowVM) {
      if (t.targetEnhanceId) s.add(t.targetEnhanceId);
    }
    return s;
  }, [tuneRowVM]);

  // 浮窗 VM
  const sheetVM: EnhanceSheetVM | null = useMemo(() => {
    if (!store || !sheet || !sys || !currentSlotId) return null;
    const slotInfo = sys.slotInfos[currentSlotId];
    if (!slotInfo) return null;

    if (sheet.type === "choice") {
      const grp = treeVM?.choiceGroups[sheet.choiceKey];
      if (!grp) return null;
      return {
        mode: "choice",
        slot: grp.options[0],
        slotInfo,
        currentLevel: 0,
        maxLevel: 1,
        name: "二选一（策略）",
        icon: "",
        descHtml: "请选择一个强化策略",
        levelDots: [],
        singleCost: 0,
        fullCost: 0,
        prereqMissing: [],
        isMaxed: false,
        slotsFull: false,
        choiceGroup: grp,
      };
    }

    // node 模式
    // 先从 treeVM 找（含状态）；找不到（被二选一 hiddenByChoice 隐藏的 flag2 选项）则回退到 sys 原始 slot
    const allSlots = treeVM ? Object.values(treeVM.columns).flat() : [];
    const nodeVM = allSlots.find((n) => n.slot.enhanceId === sheet.enhanceId);
    let slot: EnhanceSlot;
    let cur: number;
    let isChoice: boolean;
    if (nodeVM) {
      slot = nodeVM.slot;
      cur = nodeVM.currentLevel;
      isChoice = nodeVM.isChoice;
    } else {
      // 回退：从 sys.bySlot 直接查原始 EnhanceSlot（绕过 hiddenByChoice，用于二选一 flag2）
      const rawSlot = Object.values(sys.bySlot).flat().find((s) => s.enhanceId === sheet.enhanceId);
      if (!rawSlot) return null;
      slot = rawSlot;
      cur = acquired.get(sheet.enhanceId) ?? 0;
      const choiceKey = `${rawSlot.slotId}_${rawSlot.treeColumn}`;
      isChoice = !!treeVM?.choiceGroups[choiceKey] && rawSlot.nodeFlag !== 0;
    }
    // ★maxLevel 含巅峰扩展等级（从 treeVM 节点取 extraMaxLevel）
    const nodeExtra = allSlots.find((n) => n.slot.enhanceId === sheet.enhanceId)?.extraMaxLevel ?? 0;
    const maxLevel = isChoice ? 1 : (slot.maxLevel + nodeExtra);
    const isMaxed = cur >= maxLevel;
    const avail = isEnhanceAvailable(slot, slotInfo, new Set(acquired.keys()));
    // ★孔位上限：该槽 ENHANCEMENTS_LIMIT（与导航条/蓝图页孔位计数一致）
    //   已投入强化项数(level>0，不含调校/解锁) >= limit 且当前项未加点 → 孔位满，不能再强化新项
    const shipSystem = store.shipSystem as Record<string, { ENHANCEMENTS_LIMIT?: number }> | undefined;
    const enhanceLimit = Number(shipSystem?.[currentSlotId]?.ENHANCEMENTS_LIMIT ?? 0);
    let usedSlots = 0;
    const slotsInSlot = sys.bySlot[currentSlotId] ?? [];
    for (const s of slotsInSlot) {
      if ((acquired.get(s.enhanceId) ?? 0) > 0) usedSlots++;
    }
    const slotsFull = cur === 0 && enhanceLimit > 0 && usedSlots >= enhanceLimit;
    return {
      mode: maxLevel > 1 ? "multi" : "single",
      slot,
      slotInfo,
      currentLevel: cur,
      maxLevel,
      name: slot.effect?.name || slot.enhanceId,
      icon: enhanceIcon(slot.enhanceId),
      descHtml: renderEnhanceDesc(store, slot, cur, preview),
      levelDots: Array.from({ length: maxLevel }, (_, i) => i < cur),
      singleCost: singleCost(store, slot, cur),
      fullCost: fullCost(store, slot, cur),
      prereqMissing: avail.available ? [] : avail.reasons,
      isMaxed,
      slotsFull,
    };
  }, [store, sheet, sys, currentSlotId, treeVM, acquired, preview]);

  const onAddOne = () => {
    if (!sheetVM || sheetVM.mode === "choice") return;
    const newLv = Math.min(sheetVM.maxLevel, sheetVM.currentLevel + 1);
    updateAcquired((prev) => {
      const m = new Map(prev);
      if (newLv > 0) m.set(sheetVM.slot.enhanceId, newLv);
      return m;
    });
    if (newLv >= sheetVM.maxLevel) setSheet(null);
  };
  const onAddFull = () => {
    if (!sheetVM) return;
    updateAcquired((prev) => {
      const m = new Map(prev);
      m.set(sheetVM.slot.enhanceId, sheetVM.maxLevel);
      return m;
    });
    setSheet(null);
  };
  const onSelectChoice = (enhanceId: string) => {
    // 选中后切换到该选项的单级强化浮窗
    setSheet({ type: "node", enhanceId });
  };

  const onBack = () => {
    Taro.navigateBack({
      fail: () => Taro.reLaunch({ url: "/pages/ship-list/index" }),
    });
  };

  // currentSlotName 提前算（onReset/渲染都用）
  const currentSlotName = sys?.slotInfos[currentSlotId]?.systemName || currentSlotId;

  // ★重置当前系统槽：清空该槽所有强化加点 + 调校加点 + 解锁（整个 slotId 的 acquired 全删）
  const onReset = () => {
    Taro.showModal({
      title: "重置确认",
      content: `将清空「${currentSlotName}」的所有强化、调校和解锁加点，确定？`,
      confirmColor: "#ff7a7a",
      success: (res) => {
        if (!res.confirm) return;
        updateAcquired((prev) => {
          const m = new Map(prev);
          for (const eid of m.keys()) {
            // 该 slotId 下的所有 enhanceId（含强化 optIdx1-18、解锁、调校）全删
            if (eid.startsWith(currentSlotId)) m.delete(eid);
          }
          return m;
        });
      },
    });
  };

  // ★占位按钮（存档系统下一轮实现）
  const onPlaceholder = (name: string) => {
    Taro.showToast({ title: `${name}功能开发中`, icon: "none" });
  };

  if (loading) return <View className="en-loading"><Text>加载中...</Text></View>;
  if (error) return <View className="en-loading"><Text className="text-danger">{error}</Text></View>;
  if (!sys || !shipId) return <View className="en-loading"><Text>舰船数据未找到: {shipId}</Text></View>;

  const slotInfo = sys.slotInfos[currentSlotId];

  return (
    <View className="en-page">
      <View className="en-topbar">
        <Text className="en-back" onClick={onBack}>‹</Text>
        <Text className="en-title">{currentSlotName}</Text>
      </View>

      <View className="en-body">
        {/* 区域① 科技树 */}
        <View className="en-section en-section--tree">
          {treeVM && (
            <EnhanceTree
              columns={treeVM.columns}
              choiceGroups={treeVM.choiceGroups}
              linkedEnhanceIds={linkedEnhanceIds}
              onSelectNode={(eid) => setSheet({ type: "node", enhanceId: eid })}
              onOpenChoice={(key) => setSheet({ type: "choice", choiceKey: key })}
            />
          )}
          {slotInfo && !slotInfo.hasModule && (
            <Text className="en-empty">该系统未装配模块，强化不生效</Text>
          )}
        </View>

        {/* 区域② 调校 */}
        <TuneRow
          slots={tuneRowVM}
          onClick={(s) => setTuneSlot(s)}
        />
      </View>

      {/* 区域③ 系统导航 */}
      <View className="en-nav-fixed">
        <SystemNav
          items={navResult.items}
          onSelect={setCurrentSlotId}
        />
      </View>

      {/* 区域④ 功能区：重置 + 保存/导入/分享（占位），固定页面最底部 */}
      <View className="en-actions">
        <View className="en-action en-action--reset" onClick={onReset}>
          <Text className="en-action__label">重置</Text>
        </View>
        <View className="en-action en-action--save" onClick={() => onPlaceholder("保存")}>
          <Text className="en-action__label">保存</Text>
        </View>
        <View className="en-action en-action--import" onClick={() => onPlaceholder("导入")}>
          <Text className="en-action__label">导入</Text>
        </View>
        <View className="en-action en-action--share" onClick={() => onPlaceholder("分享")}>
          <Text className="en-action__label">分享</Text>
        </View>
      </View>

      {/* 浮窗 */}
      {sheetVM && (
        <EnhanceSheet
          vm={sheetVM}
          preview={preview}
          onTogglePreview={() => setPreview((p) => !p)}
          onClose={() => setSheet(null)}
          onAddOne={onAddOne}
          onAddFull={onAddFull}
          onSelectChoice={onSelectChoice}
        />
      )}

      {/* 调校浮窗 */}
      {tuneSlot && (
        <TuneSheet
          vm={tuneSlot}
          preview={preview}
          onTogglePreview={() => setPreview((p) => !p)}
          onClose={() => setTuneSlot(null)}
          onAddOne={() => {
            const newLv = Math.min(tuneSlot.maxLevel, tuneSlot.currentLevel + 1);
            updateAcquired((prev) => {
              const m = new Map(prev);
              if (newLv > 0) m.set(tuneSlot.enhanceId, newLv);
              return m;
            });
            if (newLv >= tuneSlot.maxLevel) setTuneSlot(null);
            else setTuneSlot({ ...tuneSlot, currentLevel: newLv, state: "active" });
          }}
          onAddFull={() => {
            updateAcquired((prev) => {
              const m = new Map(prev);
              m.set(tuneSlot.enhanceId, tuneSlot.maxLevel);
              return m;
            });
            setTuneSlot(null);
          }}
        />
      )}
    </View>
  );
}
