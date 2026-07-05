import { useMemo, useState, useEffect } from "react";
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
  resolveTuneRow,
  renderEnhanceDesc,
  singleCost,
  fullCost,
  type EnhanceSheetVM,
} from "../../data/enhanceView";
import { enhanceIcon, prefixIcon } from "../../data/iconResolver";
import EnhanceTree from "../../components/EnhanceTree";
import EnhanceSheet from "../../components/EnhanceSheet";
import TuneRow from "../../components/TuneRow";
import SystemNav from "../../components/SystemNav";
import "./index.css";

export default function EnhancePage() {
  const router = useRouter();
  const shipId = (router.params.shipId || "") as string;
  const peakLevel = Number(router.params.peakLevel || 0);
  const { store, loading, error } = useEditorData();

  const [currentSlotId, setCurrentSlotId] = useState("");
  const enhanceState = useEnhanceState();
  // acquired: 本地 state 驱动 UI，初始化从全局 store 取，变更时同步回全局
  const [acquired, setAcquired] = useState<Map<string, number>>(() => {
    const globalLevels = enhanceState.getLevels(shipId);
    return new Map(Object.entries(globalLevels));
  });
  // 全局 store 变化时（如从其他页回来）同步到本地
  useEffect(() => {
    const globalLevels = enhanceState.getLevels(shipId);
    setAcquired(new Map(Object.entries(globalLevels)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipId, enhanceState.version]);
  // 本地变更同步回全局 store
  const updateAcquired = (updater: (prev: Map<string, number>) => Map<string, number>) => {
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

  const sys = useMemo(() => {
    if (!store || !shipId) return null;
    return resolveEnhanceSystem(store, shipId);
  }, [store, shipId]);

  const navResult = useMemo(() => {
    if (!store || !shipId) return { items: [], defaultSlotId: "" };
    return resolveSystemNav(store, shipId, currentSlotId);
  }, [store, shipId, currentSlotId]);

  // 默认槽初始化（进页面后取 slotId 最小）
  if (!currentSlotId && navResult.defaultSlotId) {
    setCurrentSlotId(navResult.defaultSlotId);
  }

  const treeVM = useMemo(() => {
    if (!store || !currentSlotId) return null;
    const selId = sheet?.type === "node" ? sheet.enhanceId : undefined;
    return resolveEnhanceTreeVM(store, shipId, currentSlotId, acquired, selId, peakLevel);
  }, [store, shipId, currentSlotId, acquired, sheet, peakLevel]);

  const tuneSlots = useMemo(() => {
    if (!store || !currentSlotId) return [];
    return resolveTuneRow(store, shipId, currentSlotId);
  }, [store, shipId, currentSlotId]);

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
    const maxLevel = isChoice ? 1 : slot.maxLevel;
    const isMaxed = cur >= maxLevel;
    const avail = isEnhanceAvailable(slot, slotInfo, new Set(acquired.keys()));
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

  if (loading) return <View className="en-loading"><Text>加载中...</Text></View>;
  if (error) return <View className="en-loading"><Text className="text-danger">{error}</Text></View>;
  if (!sys || !shipId) return <View className="en-loading"><Text>舰船数据未找到: {shipId}</Text></View>;

  const currentSlotName = sys.slotInfos[currentSlotId]?.systemName || currentSlotId;
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
          tuneSlots={tuneSlots}
          acquired={new Set(acquired.keys())}
          onClick={() => {}}
        />
      </View>

      {/* 区域③ 系统导航：固定最下方 */}
      <View className="en-nav-fixed">
        <SystemNav
          items={navResult.items}
          onSelect={setCurrentSlotId}
          iconFor={(sid) => {
            // 用该槽首个强化项的 SYSTEM_EFFECT_PREFIX 解析图标（与蓝图页一致）
            const item = navResult.items.find((i) => i.slotId === sid);
            return item && item.prefix ? prefixIcon(item.prefix) : "";
          }}
        />
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
    </View>
  );
}
