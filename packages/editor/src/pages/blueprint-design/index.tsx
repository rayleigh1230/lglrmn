import { useState, useMemo } from "react";
import { View, Text, ScrollView, Input } from "@tarojs/components";
import Taro, { useRouter } from "@tarojs/taro";
import { useEditorData } from "../../state/useEditorData";
import { useBlueprintDesign } from "../../state/useBlueprintDesign";
import {
  getShipStats,
  getBlueprintSubsystems,
  getEnhanceTreeGroups,
  systemTypeName,
} from "../../data/blueprintSelector";
import ShipThumb from "../../components/ShipThumb";
import StatBar from "../../components/StatBar";
import EnhanceNode from "../../components/EnhanceNode";
import "./index.css";

interface EnhanceNodeData {
  enhanceId: string;
  name: string;
  level: number;
  maxLevel: number;
  cost: number[];
  currentCost: number;
  systemType: number | undefined;
  systemLabel: string;
}

export default function BlueprintDesign() {
  const router = useRouter();
  const bpId = (router.params.bpId || "") as string;
  const shipIdParam = (router.params.shipId || bpId) as string;
  const { store, loading, error } = useEditorData();

  const { levels, techStr, blueprint, techPoints, options, setLevel, setOptions, resetLevels } =
    useBlueprintDesign(store, bpId, shipIdParam);

  // 当前选中的子系统标签 (按 SYSTEM_TYPE 分组)
  const [activeTab, setActiveTab] = useState<string>("all");

  // 舰船属性
  const shipStats = useMemo(() => {
    if (!store) return null;
    return getShipStats(store, shipIdParam);
  }, [store, shipIdParam]);

  // 蓝图子系统列表
  const subsystems = useMemo(() => {
    if (!store) return [];
    return getBlueprintSubsystems(store, bpId);
  }, [store, bpId]);

  // 强化树节点 (从 store.systemEnhance 按 enhance tree groups 过滤)
  const enhanceNodes = useMemo<EnhanceNodeData[]>(() => {
    if (!store || !store.systemEnhance || !store.systemEffect) return [];
    const groups = getEnhanceTreeGroups(store, bpId);
    if (groups.length === 0) return [];

    const nodes: EnhanceNodeData[] = [];
    // 遍历 systemEnhance, 找 enhance_id 前3位(=group) 在 groups 里的
    for (const enhanceId in store.systemEnhance) {
      const group = enhanceId.slice(0, 3);
      if (!groups.includes(group)) continue;
      const rec = store.systemEnhance[enhanceId] as any;
      const prefix = rec.SYSTEM_EFFECT_PREFIX;
      if (prefix === undefined || prefix === null) continue;

      // 图标+名称: effect[prefix+"01"]
      const effectKey = `${prefix}01`;
      const effect = store.systemEffect[effectKey] as any;
      const name = effect?.NAME || "未命名强化";
      const cost: number[] = rec.ENHANCE_COST || [];
      const maxLevel = cost.length || 5;
      const level = levels[enhanceId] || 0;
      const currentCost = cost.slice(0, level).reduce((a: number, b: number) => a + b, 0);

      // 找对应子系统(按 enhanceId 前7位=slotId)
      const slotId = enhanceId.slice(0, 7);
      const sys = store.shipSystem?.[slotId] as any;
      const systemType = sys?.SYSTEM_TYPE;

      nodes.push({
        enhanceId,
        name,
        level,
        maxLevel,
        cost,
        currentCost,
        systemType,
        systemLabel: systemTypeName(systemType),
      });
    }
    return nodes.sort((a, b) => a.systemLabel.localeCompare(b.systemLabel, "zh") || a.name.localeCompare(b.name, "zh"));
  }, [store, bpId, levels]);

  // 按子系统标签过滤
  const tabs = useMemo(() => {
    const map = new Map<string, number>();
    for (const n of enhanceNodes) {
      const label = n.systemLabel;
      map.set(label, (map.get(label) || 0) + 1);
    }
    return [{ key: "all", label: "全部", count: enhanceNodes.length },
      ...Array.from(map.entries()).map(([k, v]) => ({ key: k, label: k, count: v }))];
  }, [enhanceNodes]);

  const filteredNodes = useMemo(() => {
    if (activeTab === "all") return enhanceNodes;
    return enhanceNodes.filter((n) => n.systemLabel === activeTab);
  }, [enhanceNodes, activeTab]);

  if (loading) {
    return <View className="bp-loading"><Text>加载中...</Text></View>;
  }
  if (error) {
    return <View className="bp-error"><Text className="text-danger">{error}</Text></View>;
  }
  if (!store || !shipStats) {
    return <View className="bp-error"><Text>舰船数据未找到: {shipIdParam}</Text></View>;
  }

  // 属性展示
  const bp = blueprint;
  const usedPoints = techPoints?.totalPoints || 0;

  return (
    <View className="bp-design">
      {/* 顶部: 舰船信息条 */}
      <View className="bp-design__header">
        <ShipThumb
          shipTypeTier={3}
          shipType={shipStats.shipType}
          size="medium"
          fallbackText={shipStats.shortName.slice(0, 2)}
        />
        <View className="bp-design__header-info">
          <Text className="bp-design__ship-name">{shipStats.fullName}</Text>
          <View className="bp-design__header-meta">
            <Text className="text-gold">结构 {shipStats.structure.toLocaleString()}</Text>
            <Text className="text-muted">速度 {shipStats.speed}</Text>
          </View>
          <View className="bp-design__points">
            <Text className="text-primary">技能点 {usedPoints}</Text>
            {bp && (
              <Text className="text-success">
                结构 → {bp.finalStructure.toLocaleString()}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* 子系统标签栏 */}
      <ScrollView className="bp-design__tabs" scrollX>
        {tabs.map((t) => (
          <View
            key={t.key}
            className={`bp-design__tab ${activeTab === t.key ? "bp-design__tab--active" : ""}`}
            onClick={() => setActiveTab(t.key)}
          >
            <Text>{t.label}</Text>
            <Text className="bp-design__tab-count">{t.count}</Text>
          </View>
        ))}
      </ScrollView>

      {/* 强化树 */}
      <ScrollView className="bp-design__tree" scrollY>
        <View className="bp-design__tree-list">
          {filteredNodes.map((node) => (
            <EnhanceNode
              key={node.enhanceId}
              enhanceId={node.enhanceId}
              name={node.name}
              level={node.level}
              maxLevel={node.maxLevel}
              cost={node.cost}
              currentCost={node.currentCost}
              onLevelChange={(lvl) => setLevel(node.enhanceId, lvl)}
            />
          ))}
          {filteredNodes.length === 0 && (
            <View className="bp-design__tree-empty">
              <Text className="text-muted">无强化项</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 属性面板 */}
      <View className="bp-design__stats-panel">
        <View className="bp-design__stats-header">
          <Text className="bp-design__stats-title">属性面板</Text>
        </View>
        <ScrollView className="bp-design__stats-scroll" scrollY>
          {bp ? (
            <View className="bp-design__stats-list">
              <StatBar
                label="结构"
                value={bp.finalStructure}
                base={bp.baseStructure}
                highlight
              />
              <StatBar
                label="结构加成"
                value={bp.structureBonusPermille}
                permille
              />
              <StatBar label="抵抗" value={bp.resistanceBonus} suffix="点" />
              <StatBar label="命中" value={bp.hitBonus} permille />
              <StatBar label="闪避" value={bp.dodgeBonus} permille />
              <StatBar label="暴击率" value={bp.critRate} permille />
              <StatBar label="暴击伤害" value={bp.critDamage} permille />
              <StatBar label="航速" value={bp.speedBonus} permille />
              <StatBar label="曲率速度" value={bp.curvatureSpeedBonus} permille />
              <StatBar label="基础伤害" value={bp.baseDamageBonus} suffix="点" />
              <StatBar label="攻城伤害" value={bp.siegeDamageBonus} permille />
              <StatBar label="对空伤害" value={bp.antiAirDamageBonus} permille />
              <StatBar label="能量抗性" value={bp.energyResistance} permille />
              <StatBar label="系统结构" value={bp.systemStructureBonus} permille />
              <StatBar label="锁定时间" value={bp.targetLockTimeReduction} permille />
              <StatBar label="拦截率" value={bp.interceptRate} permille />
            </View>
          ) : (
            <Text className="text-muted">无属性数据</Text>
          )}
        </ScrollView>
      </View>

      {/* 底部: 外部参数 + 科技串 */}
      <View className="bp-design__footer">
        <View className="bp-design__footer-row">
          <Text className="bp-design__footer-label">巅峰加成</Text>
          <Input
            className="bp-design__footer-input"
            type="number"
            value={String(options.peakStructureBonus)}
            onInput={(e) =>
              setOptions({ ...options, peakStructureBonus: Number(e.detail.value) || 0 })
            }
          />
          <Text className="bp-design__footer-label">版本加成</Text>
          <Input
            className="bp-design__footer-input"
            type="number"
            value={String(options.versionStructureBonus)}
            onInput={(e) =>
              setOptions({ ...options, versionStructureBonus: Number(e.detail.value) || 0 })
            }
          />
        </View>
        <View className="bp-design__tech-str">
          <Text className="bp-design__tech-str-label">科技串:</Text>
          <Text className="bp-design__tech-str-value">{techStr || "(空)"}</Text>
        </View>
        <View className="bp-design__footer-actions">
          <View className="btn" onClick={resetLevels}>
            <Text>重置</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
