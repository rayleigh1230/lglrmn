import { View, Text, Image } from "@tarojs/components";
import type { TuneSlotVM } from "../../data/enhanceView";
import { levelText } from "../../data/enhanceView";
import "./index.css";

interface Props {
  vm: TuneSlotVM;
  preview: boolean;
  onTogglePreview: () => void;
  onClose: () => void;
  onAddOne: () => void;   // +1 级 / 解锁
  onAddFull: () => void;  // 加满
}

export default function TuneSheet({ vm, preview, onTogglePreview, onClose, onAddOne, onAddFull }: Props) {
  const isMaxed = vm.currentLevel >= vm.maxLevel;
  const targetMet = vm.state !== "locked";
  // multi(tune, maxLevel=10) / single(unlock, maxLevel=1)
  const mode: "multi" | "single" = vm.maxLevel > 1 ? "multi" : "single";
  const lt = levelText(vm.currentLevel, vm.maxLevel, preview);
  const levelDots = Array.from({ length: vm.maxLevel }, (_, i) => i < vm.currentLevel);

  // 数值显示：param × level / maxLevel（和强化浮窗的当前值+增量同风格）
  const isPercent = vm.effectId === 10 || vm.effectId === 13005 || vm.effectId === 12014 || vm.effectId === 12010;
  const curVal = vm.param ? Math.round((vm.param * vm.currentLevel) / vm.maxLevel) : 0;
  const nextVal = vm.param ? Math.round((vm.param * (vm.currentLevel + 1)) / vm.maxLevel) : 0;
  const unit = isPercent ? "‱" : "";

  return (
    <View className="ts-overlay" onClick={onClose}>
      <View className="ts-sheet" onClick={(e) => e.stopPropagation()}>
        {/* 头部：图标 + 名称 + 满级预览开关（和强化浮窗一致） */}
        <View className="ts-head">
          {vm.icon ? (
            <Image className="ts-icon" src={vm.icon} mode="aspectFit" />
          ) : (
            <View className="ts-icon ts-icon--ph">{vm.name.slice(0, 1)}</View>
          )}
          <View className="ts-head-text">
            <Text className="ts-name">{vm.name}</Text>
            {vm.targetEnhanceId && <Text className="ts-tag">调校强化项</Text>}
            {vm.type === "unlock" && <Text className="ts-tag">永久加成</Text>}
            {isMaxed && <Text className="ts-tag ts-tag--max">{vm.type === "unlock" ? "已解锁" : "已调校满级"}</Text>}
          </View>
          {/* 满级预览开关（仅多级调校显示，和强化浮窗一致） */}
          {mode === "multi" && (
            <View
              className={`ts-preview-toggle ${preview ? "ts-preview-toggle--on" : ""}`}
              onClick={onTogglePreview}
            >
              <Text className="ts-preview-label">满级预览</Text>
              <View className={`ts-preview-switch ${preview ? "ts-preview-switch--on" : ""}`} />
            </View>
          )}
          <Text className="ts-close" onClick={onClose}>×</Text>
        </View>

        {/* 描述：效果名 + 数值（当前值白 → 下一级增量金，和强化浮窗同风格） */}
        <Text className="ts-desc">
          {vm.effectName}
          {vm.param ? (
            <Text>
              {"  "}
              <Text style="color:#e0e6f0">{curVal}{unit}</Text>
              {!isMaxed && targetMet ? (
                <Text>{" → "}<Text style="color:#ffc857">{nextVal}{unit}</Text></Text>
              ) : null}
            </Text>
          ) : null}
        </Text>

        {/* 等级区（和强化浮窗一致：current +next /max + 圆点） */}
        <View className="ts-level">
          <Text className="ts-level-text">
            <Text style="color:#e0e6f0">{lt.current}</Text>
            <Text style="color:#ffc857">{lt.next}</Text>
            <Text style="color:#e0e6f0">{lt.max}</Text>
          </Text>
          <View className="ts-dots">
            {levelDots.map((on, i) => (
              <View key={i} className={`ts-dot ${on ? "ts-dot--on" : ""}`} />
            ))}
          </View>
        </View>

        {/* 按钮区（和强化浮窗一致：前置未满足/已满级/双按钮） */}
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
            {mode === "multi" && (
              <View className="ts-btn ts-btn--full" onClick={onAddFull}>
                <Text className="ts-btn-label">全部调校</Text>
              </View>
            )}
            <View className={`ts-btn ts-btn--one ${mode === "single" ? "ts-btn--wide" : ""}`} onClick={onAddOne}>
              <Text className="ts-btn-label">{vm.type === "unlock" ? "解锁" : "调校"}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
