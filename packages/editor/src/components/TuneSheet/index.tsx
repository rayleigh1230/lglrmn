import { View, Text, Image } from "@tarojs/components";
import type { TuneSlotVM } from "../../data/enhanceView";
import "./index.css";

interface Props {
  vm: TuneSlotVM;
  onClose: () => void;
  onAddOne: () => void;
}

export default function TuneSheet({ vm, onClose, onAddOne }: Props) {
  const isMaxed = vm.currentLevel >= vm.maxLevel;
  const targetMet = vm.state !== "locked";
  const nextRate = vm.adjustProb ? vm.adjustProb[vm.currentLevel] ?? 0 : 100;

  // 数值显示: param × level / 10
  const curVal = vm.param ? Math.round(vm.param * vm.currentLevel / 10) : 0;
  const nextVal = vm.param ? Math.round(vm.param * (vm.currentLevel + 1) / 10) : 0;
  const isPercent = vm.effectId === 10 || vm.effectId === 13005 || vm.effectId === 12014 || vm.effectId === 12010;

  return (
    <View className="ts-overlay" onClick={onClose}>
      <View className="ts-sheet" onClick={(e) => e.stopPropagation()}>
        {/* 头部 */}
        <View className="ts-head">
          {vm.icon ? (
            <Image className="ts-icon" src={vm.icon} mode="aspectFit" />
          ) : (
            <View className="ts-icon ts-icon--ph">{vm.name.slice(0, 1)}</View>
          )}
          <View className="ts-head-text">
            <Text className="ts-name">{vm.name}</Text>
            {vm.targetEnhanceId && (
              <Text className="ts-tag">调校强化项</Text>
            )}
            {vm.type === "unlock" && (
              <Text className="ts-tag">永久加成</Text>
            )}
          </View>
          <Text className="ts-close" onClick={onClose}>×</Text>
        </View>

        {/* 描述 */}
        <Text className="ts-desc">
          {vm.effectName}
          {vm.param ? (
            <Text>
              {" "}效果: <Text style="color:#e0e6f0">{curVal}{isPercent ? "‱" : ""}</Text>
              {!isMaxed && targetMet ? (
                <Text>{" → "}<Text style="color:#ffc857">{nextVal}{isPercent ? "‱" : ""}</Text></Text>
              ) : null}
            </Text>
          ) : null}
        </Text>

        {/* 调校型: 等级区 + 成功率 */}
        {vm.type === "tune" && (
          <View>
            <View className="ts-level">
              <Text className="ts-level-text">
                <Text style="color:#e0e6f0">{vm.currentLevel > 0 ? vm.currentLevel : ""}</Text>
                <Text style="color:#ffc857">{isMaxed ? "" : `+1`}</Text>
                <Text style="color:#e0e6f0">/{vm.maxLevel}</Text>
              </Text>
              <View className="ts-dots">
                {Array.from({ length: vm.maxLevel }, (_, i) => (
                  <View key={i} className={`ts-dot ${i < vm.currentLevel ? "ts-dot--on" : ""}`} />
                ))}
              </View>
            </View>
            {!isMaxed && targetMet && (
              <Text className="ts-rate">下一级成功率: <Text style="color:#ffc857">{nextRate}%</Text></Text>
            )}
          </View>
        )}

        {/* 按钮区 */}
        {!targetMet ? (
          <View className="ts-blocked">
            <Text className="ts-blocked-text">需先解锁前置调校槽</Text>
          </View>
        ) : isMaxed ? (
          <View className="ts-blocked">
            <Text className="ts-blocked-text ts-blocked-text--max">{vm.type === "unlock" ? "已解锁" : "已调校满级"}</Text>
          </View>
        ) : (
          <View className="ts-btns">
            <View className="ts-btn ts-btn--one" onClick={onAddOne}>
              <Text className="ts-btn-label">{vm.type === "unlock" ? "解锁" : "调校"}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
