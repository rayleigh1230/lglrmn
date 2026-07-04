import { useMemo, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro, { useRouter } from "@tarojs/taro";
import { useEditorData } from "../../state/useEditorData";
import {
  resolveEnhanceSystem,
  isEnhanceAvailable,
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
  const { store, loading, error } = useEditorData();

  const [currentSlotId, setCurrentSlotId] = useState("");
  const [acquired, setAcquired] = useState<Map<string, number>>(new Map());
  const [sheet, setSheet] = useState<
    | { type: "node"; enhanceId: string }
    | { type: "choice"; choiceKey: string }
    | null
  >(null);

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
    return resolveEnhanceTreeVM(store, shipId, currentSlotId, acquired, selId);
  }, [store, shipId, currentSlotId, acquired, sheet]);

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
    const allSlots = treeVM ? Object.values(treeVM.columns).flat() : [];
    const nodeVM = allSlots.find((n) => n.slot.enhanceId === sheet.enhanceId);
    if (!nodeVM) return null;
    const slot = nodeVM.slot;
    const cur = nodeVM.currentLevel;
    const isChoice = nodeVM.isChoice;
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
      descHtml: renderEnhanceDesc(store, slot, cur),
      levelDots: Array.from({ length: maxLevel }, (_, i) => i < cur),
      singleCost: singleCost(store, slot, cur),
      fullCost: fullCost(store, slot, cur),
      prereqMissing: avail.available ? [] : avail.reasons,
      isMaxed,
    };
  }, [store, sheet, sys, currentSlotId, treeVM, acquired]);

  const onAddOne = () => {
    if (!sheetVM || sheetVM.mode === "choice") return;
    const newLv = Math.min(sheetVM.maxLevel, sheetVM.currentLevel + 1);
    setAcquired((prev) => {
      const m = new Map(prev);
      if (newLv > 0) m.set(sheetVM.slot.enhanceId, newLv);
      return m;
    });
    if (newLv >= sheetVM.maxLevel) setSheet(null);
  };
  const onAddFull = () => {
    if (!sheetVM) return;
    setAcquired((prev) => {
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

        {/* 区域③ 系统导航 */}
        <SystemNav
          items={navResult.items}
          onSelect={setCurrentSlotId}
          iconFor={(sid) => {
            const s = sys.slotInfos[sid];
            const modId = s?.installedModuleIds?.[0];
            return modId ? prefixIcon(modId.replace(/[0-9]/g, "")) : "";
          }}
        />
      </View>

      {/* 浮窗 */}
      {sheetVM && (
        <EnhanceSheet
          vm={sheetVM}
          onClose={() => setSheet(null)}
          onAddOne={onAddOne}
          onAddFull={onAddFull}
          onSelectChoice={onSelectChoice}
        />
      )}
    </View>
  );
}
