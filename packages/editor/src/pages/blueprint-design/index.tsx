import { useMemo } from "react";
import { View, Text } from "@tarojs/components";
import Taro, { useRouter } from "@tarojs/taro";
import { useEditorData } from "../../state/useEditorData";
import {
  getShipPanel,
  getVariants,
  getShipSystems,
  CATEGORY_COLOR,
} from "../../data/blueprintSelector";
import "./index.css";

export default function BlueprintDesign() {
  const router = useRouter();
  const bpId = (router.params.bpId || "") as string;
  const { store, loading, error } = useEditorData();

  const panel = useMemo(() => {
    if (!store) return null;
    return getShipPanel(store, bpId);
  }, [store, bpId]);

  const variants = useMemo(() => {
    if (!store) return [];
    return getVariants(store, bpId);
  }, [store, bpId]);

  const systems = useMemo(() => {
    if (!store || !panel) return [];
    return getShipSystems(store, panel.shipId);
  }, [store, panel]);

  const onBack = () => Taro.navigateBack();
  const onVariantClick = (id: string) => {
    Taro.redirectTo({ url: `/pages/blueprint-design/index?bpId=${id}` });
  };

  if (loading) {
    return <View className="bp-loading"><Text>加载中...</Text></View>;
  }
  if (error) {
    return <View className="bp-loading"><Text className="text-danger">{error}</Text></View>;
  }
  if (!panel) {
    return <View className="bp-loading"><Text>舰船数据未找到: {bpId}</Text></View>;
  }

  const catColor = CATEGORY_COLOR[panel.category] || "#4fc3f7";

  return (
    <View className="bp">
      {/* 顶部栏: 返回 + 指挥值 */}
      <View className="bp-topbar">
        <View className="bp-back" onClick={onBack}>
          <Text className="bp-back__icon">‹</Text>
        </View>
        <View className="bp-command">
          <Text className="bp-command__label">指挥值</Text>
          <Text className="bp-command__value">{panel.command}</Text>
        </View>
      </View>

      <View className="bp-scroll">
        {/* 第一排: 舰船名 + 型号名 */}
        <View className="bp-header">
          <Text className="bp-header__ship">{panel.shipName}</Text>
          <Text className="bp-header__sub">{panel.subTypeName}</Text>
        </View>

        {/* 第二排: 巅峰等级 / 型号数 / 技术值版本 */}
        <View className="bp-row2">
          <View className="bp-badge bp-badge--peak">
            <Text className="bp-badge__label">巅峰等级</Text>
            <Text className="bp-badge__value">0</Text>
          </View>
          <View className="bp-badge bp-badge--variant">
            <Text className="bp-badge__label">型号</Text>
            <Text className="bp-badge__value">{variants.length}</Text>
          </View>
          <View className="bp-badge bp-badge--tech">
            <Text className="bp-badge__label">技术值</Text>
            <Text className="bp-badge__value">1.00</Text>
          </View>
        </View>

        {/* 第三排: 火力总合 + 能力评级 */}
        <View className="bp-row3">
          {/* 左: 火力总合 */}
          <View className="bp-firepower">
            <Text className="bp-firepower__title">火力</Text>
            <View className="bp-firepower__list">
              <Text className="bp-firepower__item">
                <Text className="bp-firepower__type">对舰</Text>
                <Text className="bp-firepower__num">{panel.panel.firepower.antiShip || "—"}</Text>
              </Text>
              <Text className="bp-firepower__item">
                <Text className="bp-firepower__type">防空</Text>
                <Text className="bp-firepower__num">{panel.panel.firepower.antiAir || "—"}</Text>
              </Text>
              <Text className="bp-firepower__item">
                <Text className="bp-firepower__type">攻城</Text>
                <Text className="bp-firepower__num">{panel.panel.firepower.siege || "—"}</Text>
              </Text>
            </View>
          </View>
          {/* 右: 能力评级 */}
          <View className="bp-assess">
            <Text className="bp-assess__title">定位</Text>
            <View className="bp-assess__list">
              {[
                { name: "对舰", grade: "—" },
                { name: "对空", grade: "—" },
                { name: "攻城", grade: "—" },
                { name: "支援", grade: "—" },
                { name: "生存", grade: "—" },
                { name: "战略", grade: "—" },
              ].map((item) => (
                <Text key={item.name} className="bp-assess__item">
                  <Text className="bp-assess__name">{item.name}</Text>
                  <Text className="bp-assess__grade">{item.grade}</Text>
                </Text>
              ))}
            </View>
          </View>
        </View>

        {/* 第四排: 基础属性 */}
        <View className="bp-stats">
          <View className="bp-stat">
            <Text className="bp-stat__label">结构值</Text>
            <Text className="bp-stat__value">{panel.panel.finalStructure.toLocaleString()}</Text>
          </View>
          <View className="bp-stat">
            <Text className="bp-stat__label">抵抗值</Text>
            <Text className="bp-stat__value">{panel.panel.resistance}</Text>
          </View>
          <View className="bp-stat">
            <Text className="bp-stat__label">护盾值</Text>
            <Text className="bp-stat__value">
              {panel.panel.shield > 0 ? Math.round(panel.panel.shield * 100) + "%" : "—"}
            </Text>
          </View>
          <View className="bp-stat">
            <Text className="bp-stat__label">普通移速</Text>
            <Text className="bp-stat__value">{panel.panel.speed}</Text>
          </View>
          <View className="bp-stat">
            <Text className="bp-stat__label">曲率速度</Text>
            <Text className="bp-stat__value">
              {panel.panel.curvatureSpeedBonus > 0
                ? "+" + (panel.panel.curvatureSpeedBonus / 100).toFixed(1) + "%"
                : "—"}
            </Text>
          </View>
        </View>

        {/* 系统加点状态 */}
        <View className="bp-section">
          <Text className="bp-section__title">系统强化</Text>
          <View className="bp-systems">
            {systems.map((sys) => (
              <View key={sys.systemId} className="bp-sys">
                <Text className="bp-sys__name">{sys.name}</Text>
                <View className="bp-sys__slots">
                  {Array.from({ length: Math.max(sys.enhanceLimit, 1) }).map((_, i) => (
                    <View
                      key={i}
                      className={`bp-sys__slot ${
                        i < sys.enhanceLimit ? "bp-sys__slot--empty" : ""
                      }`}
                    />
                  ))}
                  {sys.enhanceLimit === 0 && (
                    <Text className="bp-sys__noslots">无强化</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: "100px" }} />
      </View>

      {/* 底部型号切换栏 */}
      <View className="bp-variants">
        {variants.map((v) => (
          <View
            key={v.bpId}
            className={`bp-variant ${v.isCurrent ? "bp-variant--active" : ""}`}
            onClick={() => onVariantClick(v.bpId)}
          >
            <Text className="bp-variant__name">{v.subTypeName}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
