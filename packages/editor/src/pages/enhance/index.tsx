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
import { exportMarkdown } from "../../data/schemeMarkdown";
import EnhanceTree from "../../components/EnhanceTree";
import EnhanceSheet from "../../components/EnhanceSheet";
import TuneRow from "../../components/TuneRow";
import TuneSheet from "../../components/TuneSheet";
import SystemNav from "../../components/SystemNav";
import SchemeImportSheet from "../../components/SchemeImportSheet";
import "./index.css";

export default function EnhancePage() {
  const router = useRouter();
  const shipId = (router.params.shipId || "") as string;
  const { store, loading, error } = useEditorData();

  const [currentSlotId, setCurrentSlotId] = useState("");
  // 导入方案浮窗开关
  const [importSheet, setImportSheet] = useState(false);
  const enhanceState = useEnhanceState();
  // ★peakLevel / enabledSlots 改由全局 store 传递（已提升，支持存档）
  const shipConfig = enhanceState.getShipConfig(shipId);
  const peakLevel = shipConfig.peakLevel;
  const enabledSlots = shipConfig.enabledSlots.length > 0 ? shipConfig.enabledSlots : undefined;
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

  // ★分享码导入/导出：游戏16字符短码经证实是服务器端编解码（客户端无算法），
  //   改用 markdown 方案文本导入/导出（用户从游戏「复制方案」得到的就是这种格式，完全本地解析）。
  // 导出：把当前加点序列化为 markdown 复制到剪贴板
  // ★H5优先用 navigator.clipboard.writeText()（Taro的setClipboardData在H5会强制弹"内容已复制"Toast与我们的Toast冲突）
  const onExport = async () => {
    if (!store || !shipId) return;
    const md = exportMarkdown(store, shipId, enhanceState.getLevels(shipId), enabledSlots);
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(md);
        Taro.showToast({ title: "已复制到剪贴板", icon: "success" });
        return;
      } catch (e) {
        console.warn("[clipboard] navigator.clipboard.writeText 失败，降级 Taro", e);
      }
    }
    // 降级：Taro.setClipboardData（weapp主用；H5会额外弹"内容已复制"，忽略）
    Taro.setClipboardData({
      data: md,
      fail: () => Taro.showToast({ title: "复制失败", icon: "none" }),
    });
  };
  // 导入应用：整批替换（绕开 updateAcquired，让 useEffect 自动同步本地 state）
  // - "仅加点"：只替换 levels（装配/巅峰不动）
  // - "对齐并应用"(带enabledSlots)：重置系统装配+强化/调校加点到初始值，再写入方案（确定性）
  //   ★巅峰等级不动（它是整船属性，独立于系统装配，方案markdown也不含巅峰信息）
  const onApplyImport = (payload: { levels: Record<string, number>; enabledSlots?: string[] }) => {
    enhanceState.setLevels(shipId, payload.levels);
    if (payload.enabledSlots) {
      enhanceState.setEnabledSlots(shipId, payload.enabledSlots);
    }
    setImportSheet(false);
    Taro.showToast({ title: "导入成功", icon: "success" });
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

      {/* 区域④ 功能区：重置 + 方案导入/导出，固定页面最底部
          ★保存按钮已移至蓝图属性页（保存整个蓝图状态快照）；强化页是子页面
          ★导入/导出用 markdown 方案文本（游戏16字符短码是服务器端编解码，本地不可行） */}
      <View className="en-actions">
        <View className="en-action en-action--reset" onClick={onReset}>
          <Text className="en-action__label">重置</Text>
        </View>
        <View className="en-action en-action--import" onClick={() => setImportSheet(true)}>
          <Text className="en-action__label">导入</Text>
        </View>
        <View className="en-action en-action--share" onClick={onExport}>
          <Text className="en-action__label">导出</Text>
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

      {/* 导入方案浮窗 */}
      {importSheet && (
        <SchemeImportSheet
          shipId={shipId}
          onApply={onApplyImport}
          onClose={() => setImportSheet(false)}
        />
      )}
    </View>
  );
}
