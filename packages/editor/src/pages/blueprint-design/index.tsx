import { useMemo, useState } from "react";
import { View, Text, Image } from "@tarojs/components";
import Taro, { useRouter } from "@tarojs/taro";
import { useEditorData } from "../../state/useEditorData";
import { useEnhanceState } from "../../state/enhanceStore";
import { useLoadoutStore } from "../../state/loadoutStore";
import {
  getShipPanel,
  getVariants,
  getShipSystems,
  CATEGORY_COLOR,
} from "../../data/blueprintSelector";
import { computeSlotStates, type SlotState } from "../../data/enhanceView";
import { shipThumbnailIcon, peakIcon, companyIcon, prefixIcon, iconUrl } from "../../data/iconResolver";
import "./index.css";

export default function BlueprintDesign() {
  const router = useRouter();
  const bpId = (router.params.bpId || "") as string;
  const { store, loading, error } = useEditorData();
  const enhanceState = useEnhanceState();
  const loadoutStore = useLoadoutStore();

  // 下拉框展开状态（哪个GROUP展开）
  const [dropdownOpen, setDropdownOpen] = useState("");

  // 当前船的强化等级（从全局 store 取，版本号变化时重算）
  const shipId = useMemo(() => {
    if (!store) return "";
    const wl = (store as any).shipWhitelist ?? {};
    return (wl[bpId]?.shipId ?? "") as string;
  }, [store, bpId]);
  const shipConfig = useMemo(
    () => (shipId ? enhanceState.getShipConfig(shipId) : { enhanceLevels: {}, peakLevel: 0, enabledSlots: [] }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shipId, enhanceState.version]
  );
  const enhanceLevels = shipConfig.enhanceLevels;
  const peakLevel = shipConfig.peakLevel;
  const enabledSlots = shipConfig.enabledSlots;

  const panel = useMemo(() => {
    if (!store) return null;
    return getShipPanel(store, bpId, peakLevel, enabledSlots, enhanceLevels);
  }, [store, bpId, peakLevel, enabledSlots, enhanceLevels]);

  const variants = useMemo(() => {
    if (!store) return [];
    return getVariants(store, bpId);
  }, [store, bpId]);

  const systems = useMemo(() => {
    if (!store || !panel) return [];
    return getShipSystems(store, panel.shipId, enabledSlots);
  }, [store, panel, enabledSlots]);

  // 按GROUP统一分组，切换组(同组≥2模块)用弹出选择，单模块组用固定卡片
  // letter 直接取自 selector 算好的 moduleId 前缀(M/A/B/C...)，避免重复维护映射
  const moduleGroups = useMemo(() => {
    const groups: Record<string, { key: string; letter: string; options: typeof systems }> = {};
    for (const sys of systems) {
      if (!sys.isSwitchable || sys.group === null) continue;
      const key = String(sys.group);
      if (!groups[key]) {
        const letter = sys.moduleId ? sys.moduleId.replace(/[0-9]/g, "") : "";
        groups[key] = { key, letter, options: [] };
      }
      groups[key].options.push(sys);
    }
    return Object.values(groups)
      .filter((g) => g.options.length > 1)
      .sort((a, b) => Number(a.key) - Number(b.key));
  }, [systems]);

  // 统一槽位列表: 单成员系统用fixed卡片, 多成员组用group弹出
  const moduleSlots = useMemo(() => {
    type Slot = { type: "fixed"; system: typeof systems[0] } | { type: "group"; group: typeof moduleGroups[0] };
    const slots: Slot[] = [];
    const usedGroupKeys = new Set<string>();
    const multiGroupKeys = new Set(moduleGroups.map((g) => g.key));
    for (const sys of systems) {
      const gk = sys.group !== null ? String(sys.group) : null;
      if (gk && multiGroupKeys.has(gk)) {
        // 多成员组: 只在首次遇到时加入
        if (!usedGroupKeys.has(gk)) {
          usedGroupKeys.add(gk);
          const grp = moduleGroups.find((g) => g.key === gk);
          if (grp) slots.push({ type: "group", group: grp });
        }
      } else {
        // 单成员: 固定卡片
        slots.push({ type: "fixed", system: sys });
      }
    }
    return slots;
  }, [systems, moduleGroups]);

  // 分两排: 固定系统(无切换)一排，切换模块组一排，各自从左到右按编号(顺序)排
  const fixedSlots = moduleSlots.filter((s) => s.type === "fixed");
  const switchSlots = moduleSlots.filter((s) => s.type === "group");

  // 切换模块：同 GROUP 互斥（选一个自动取消同组其他，含初始默认项）
  // 切换组里所有成员(含固定初始项)等价可选；选中态完全由 enabledSlots 驱动
  // ★enabledSlots 已提升到全局 store（支持存档保存/切换）
  const toggleModule = (sys: { systemId: string; group: number | null; isSwitchable: boolean }) => {
    if (!sys.isSwitchable) return;
    const enabledSet = new Set(enabledSlots);
    if (enabledSet.has(sys.systemId)) {
      // 已选中 → 取消(回到默认项, 由 getShipSystems 重算)
      enabledSet.delete(sys.systemId);
    } else {
      // 选中此项，同 GROUP 互斥（取消同组其他所有，含默认项）
      if (sys.group !== null) {
        for (const s of systems) {
          if (s.group === sys.group && s.systemId !== sys.systemId) {
            enabledSet.delete(s.systemId);
          }
        }
      }
      enabledSet.add(sys.systemId);
    }
    enhanceState.setEnabledSlots(shipId, Array.from(enabledSet));
  };

  const onBack = () => {
    Taro.navigateBack({
      fail: () => {
        // 无历史记录时(如直接URL打开)，跳回舰船列表
        Taro.reLaunch({ url: "/pages/ship-list/index" });
      },
    });
  };
  const onVariantClick = (id: string) => {
    Taro.navigateTo({ url: `/pages/blueprint-design/index?bpId=${id}` });
  };

  // ★保存：把当前 enhanceStore 全量快照写回当前激活存档（整个蓝图状态快照）
  const onSave = () => {
    loadoutStore.saveActive(enhanceState.snapshotAll());
    Taro.showToast({ title: "已保存", icon: "success" });
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
      {/* 顶部栏: 返回 + 指挥值 + 保存 */}
      <View className="bp-topbar">
        <View className="bp-back" onClick={onBack}>
          <Text className="bp-back__icon">‹</Text>
        </View>
        <View className="bp-command">
          <Text className="bp-command__label">指挥值</Text>
          <Text className="bp-command__value">{panel.command}</Text>
        </View>
        <View className="bp-save" onClick={onSave}>
          <Text className="bp-save__label">保存</Text>
        </View>
      </View>

      <View className="bp-scroll">
        {/* 第一排: 舰船缩略图 + 舰船名 + 型号名 */}
        <View className="bp-header">
          {(() => {
            const thumb = shipThumbnailIcon(panel.shipId);
            return thumb ? <Image className="bp-header__thumb" src={thumb} mode="aspectFit" /> : null;
          })()}
          <View className="bp-header__text">
            <Text className="bp-header__ship">{panel.shipName}</Text>
            <Text className="bp-header__sub">{panel.subTypeName}</Text>
          </View>
        </View>

        {/* 第二排: 巅峰等级 / 型号数 / 技术值版本 */}
        <View className="bp-row2">
          {/* 巅峰等级: ADV底图(含ADV字样) + 公司图标叠加 + 右下数字 + 箭头 */}
          <View className={`bp-peak ${peakLevel > 0 ? "bp-peak--active" : ""}`}>
            <View className="bp-peak__badge">
              <Image
                className="bp-peak__advbg"
                src={peakIcon("img_blueprint_logo_bg_adv.png")}
                mode="aspectFit"
              />
              <Image
                className="bp-peak__coicon"
                src={companyIcon(panel.shipId) || iconUrl("system_type/icon_system_empty.png")}
                mode="aspectFit"
              />
              <View className="bp-peak__lvwrap">
                <Text className="bp-peak__lv">{peakLevel}</Text>
              </View>
            </View>
            <View className="bp-peak__arrows">
              <Text
                className="bp-peak__arrow bp-peak__arrow--up"
                onClick={() => enhanceState.setPeakLevel(shipId, Math.min(20, peakLevel + 1))}
              >▲</Text>
              <Text
                className="bp-peak__arrow bp-peak__arrow--down"
                onClick={() => enhanceState.setPeakLevel(shipId, Math.max(0, peakLevel - 1))}
              >▼</Text>
            </View>
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
              {panel.panel.shield > 0 ? panel.panel.shield + "%" : "—"}
            </Text>
          </View>
          <View className="bp-stat">
            <Text className="bp-stat__label">普通移速</Text>
            <Text className="bp-stat__value">{panel.panel.speed}</Text>
          </View>
          <View className="bp-stat">
            <Text className="bp-stat__label">曲率速度</Text>
            <Text className="bp-stat__value">
              {panel.panel.curvatureSpeed > 0
                ? panel.panel.curvatureSpeed.toLocaleString()
                : "—"}
            </Text>
          </View>
          {panel.panel.repairEfficiency > 0 && (
            <View className="bp-stat">
              <Text className="bp-stat__label">维修效率</Text>
              <Text className="bp-stat__value">
                +{(panel.panel.repairEfficiency / 100).toFixed(1)}%
              </Text>
            </View>
          )}
        </View>

        {/* 系统模块: 图标网格(固定系统 + 可选模块选中态) */}
        <View className="bp-section">
          <Text className="bp-section__title">系统模块</Text>
          {/* 第一排: 固定系统(无切换模块) */}
          {fixedSlots.length > 0 && (
            <View className="bp-sysgrid">
              {fixedSlots.map((slot) => {
                const sys = slot.system;
                const icon = sys.prefix ? prefixIcon(sys.prefix) : "";
                // ★孔位状态（与强化页导航条联动，按强化等级计数着色）
                const slotStates = store ? computeSlotStates(store, sys.systemId, sys.enhanceLimit, enhanceLevels) : [];
                return (
                  <View key={sys.systemId} className="bp-syscard">
                    {sys.moduleId && <Text className="bp-syscard__tag">{sys.moduleId}</Text>}
                    {icon ? (
                      <Image className="bp-syscard__icon" src={icon} mode="aspectFit" />
                    ) : (
                      <Image className="bp-syscard__icon bp-syscard__icon--empty" src={iconUrl("system_type/icon_system_empty.png")} mode="aspectFit" />
                    )}
                    <View className="bp-syscard__slots">
                      {slotStates.map((st, i) => (
                        <View key={i} className={`bp-syscard__slot bp-syscard__slot--${st}`} />
                      ))}
                      {sys.enhanceLimit === 0 && <Text className="bp-syscard__noslots">—</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
          {/* 第二排: 切换模块组(可换装) */}
          {switchSlots.length > 0 && (
            <View className="bp-sysgrid bp-sysgrid--switch">
              {switchSlots.map((slot) => {
                const group = slot.group;
                const selected = group.options.find((o) => o.enabled);
                const isOpen = dropdownOpen === group.key;
                return (
                  <View key={group.key} className="bp-syscard-wrap">
                    {/* 展开的选项(在图标上方竖排) */}
                    {isOpen && (
                      <View className="bp-syspop">
                        {group.options.map((opt) => {
                          const optIcon = opt.prefix ? prefixIcon(opt.prefix) : "";
                          return (
                            <View
                              key={opt.systemId}
                              className={`bp-syspop__item ${opt.enabled ? "bp-syspop__item--active" : ""}`}
                              onClick={() => { toggleModule(opt); setDropdownOpen(""); }}
                            >
                              {optIcon ? (
                                <Image className="bp-syspop__icon" src={optIcon} mode="aspectFit" />
                              ) : (
                                <Image className="bp-syspop__icon" src={iconUrl("system_type/icon_system_empty.png")} mode="aspectFit" />
                              )}
                              <Text className="bp-syspop__mid">{opt.moduleId}</Text>
                              <Text className="bp-syspop__name">{opt.name}</Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                    {/* 当前选中模块图标(和固定系统同样式) */}
                    <View
                      className={`bp-syscard ${isOpen ? "bp-syscard--popup" : ""}`}
                      onClick={() => setDropdownOpen(isOpen ? "" : group.key)}
                    >
                      <Text className="bp-syscard__tag">{selected?.moduleId ?? group.letter}</Text>
                      {selected && selected.prefix ? (
                        <Image className="bp-syscard__icon" src={prefixIcon(selected.prefix)} mode="aspectFit" />
                      ) : (
                        <Image className="bp-syscard__icon bp-syscard__icon--empty" src={iconUrl("system_type/icon_system_empty.png")} mode="aspectFit" />
                      )}
                      <View className="bp-syscard__slots">
                        {selected ? (() => {
                          // ★切换组孔位状态（与固定系统一致，按强化等级着色）
                          const slotStates = store ? computeSlotStates(store, selected.systemId, selected.enhanceLimit, enhanceLevels) : [];
                          return slotStates.map((st, i) => (
                            <View key={i} className={`bp-syscard__slot bp-syscard__slot--${st}`} />
                          ));
                        })() : <Text className="bp-syscard__noslots">+</Text>}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ height: "20px" }} />
      </View>

      {/* 右下角"蓝图强化"悬浮按钮 */}
      <Text
        className="bp-enhance-fab"
        onClick={() => {
          // ★强化页是蓝图属性页的子页面：peakLevel/enabledSlots 由全局 store 传递
          //   同步当前装配清单（enabled=true 的 systemId）到全局 store
          const enabledSystemIds = systems.filter((s) => s.enabled).map((s) => s.systemId);
          enhanceState.setEnabledSlots(shipId, enabledSystemIds);
          Taro.navigateTo({ url: `/pages/enhance/index?shipId=${panel.shipId}` });
        }}
      >
        蓝图强化
      </Text>

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
