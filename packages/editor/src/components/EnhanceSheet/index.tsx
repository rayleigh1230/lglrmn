import { View, Text, Image } from "@tarojs/components";
import type { EnhanceSheetVM } from "../../data/enhanceView";
import { levelText } from "../../data/enhanceView";
import "./index.css";

interface Props {
  vm: EnhanceSheetVM;
  preview: boolean;
  onTogglePreview: () => void;
  onClose: () => void;
  onAddOne: () => void;   // +1 级 / 单级强化
  onAddFull: () => void;  // 加满
  onSelectChoice?: (enhanceId: string) => void;  // choice 模式选选项
}

export default function EnhanceSheet({ vm, preview, onTogglePreview, onClose, onAddOne, onAddFull, onSelectChoice }: Props) {
  const lt = levelText(vm.currentLevel, vm.maxLevel, preview);

  return (
    <View className="es-overlay" onClick={onClose}>
      <View className="es-sheet" onClick={(e) => e.stopPropagation()}>
        {/* 顶部：图标 + 名称 + 全部加强预览开关 */}
        <View className="es-head">
          {vm.icon ? (
            <Image className="es-icon" src={vm.icon} mode="aspectFit" />
          ) : (
            <View className="es-icon es-icon--ph">{vm.name.slice(0, 1)}</View>
          )}
          <View className="es-head-text">
            <Text className="es-name">{vm.name}</Text>
            {vm.isMaxed && <Text className="es-tag es-tag--max">已强化</Text>}
          </View>
          {/* 全部加强预览开关（仅多级强化项显示） */}
          {vm.maxLevel > 1 && vm.mode !== "choice" && (
            <View
              className={`es-preview-toggle ${preview ? "es-preview-toggle--on" : ""}`}
              onClick={onTogglePreview}
            >
              <Text className="es-preview-label">满级预览</Text>
              <View className={`es-preview-switch ${preview ? "es-preview-switch--on" : ""}`} />
            </View>
          )}
          <Text className="es-close" onClick={onClose}>×</Text>
        </View>

        {/* 描述 */}
        <Text className="es-desc" dangerouslySetInnerHTML={{ __html: vm.descHtml }} />

        {/* 二选一模式：左右选项卡 */}
        {vm.mode === "choice" && vm.choiceGroup && (
          <View className="es-choice">
            {vm.choiceGroup.options.map((opt) => {
              const isSel = opt.enhanceId === vm.choiceGroup!.selectedEnhanceId;
              return (
                <View
                  key={opt.enhanceId}
                  className={`es-choice-card ${isSel ? "es-choice-card--sel" : ""}`}
                  onClick={() => onSelectChoice?.(opt.enhanceId)}
                >
                  <Text className="es-choice-name">{opt.effect?.name || opt.enhanceId}</Text>
                  <Text className="es-choice-desc">{opt.effect?.desc || ""}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* 等级区（非 choice 模式） */}
        {vm.mode !== "choice" && (
          <View className="es-level">
            <Text className="es-level-text">
              <Text className="es-lv-cur">{lt.current}</Text>
              <Text className="es-lv-next">{lt.next}</Text>
              <Text className="es-lv-max">{lt.max}</Text>
            </Text>
            <View className="es-dots">
              {vm.levelDots.map((on, i) => (
                <View key={i} className={`es-dot ${on ? "es-dot--on" : ""}`} />
              ))}
            </View>
          </View>
        )}

        {/* 按钮区（choice 模式只显示选项卡，不显示按钮；选中后切到 single 模式才出按钮） */}
        {vm.mode !== "choice" && (
          vm.prereqMissing.length > 0 ? (
            <View className="es-blocked">
              <Text className="es-blocked-text">需先解锁前置：{vm.prereqMissing.join("、")}</Text>
            </View>
          ) : vm.isMaxed ? (
            <View className="es-blocked">
              <Text className="es-blocked-text es-blocked-text--max">已强化</Text>
            </View>
          ) : (
            <View className="es-btns">
              {vm.mode === "multi" && (
                <View className="es-btn es-btn--full" onClick={onAddFull}>
                  <Text className="es-btn-cost">消耗 {vm.fullCost} 点</Text>
                  <Text className="es-btn-label">全部强化</Text>
                </View>
              )}
              <View className={`es-btn es-btn--one ${vm.mode === "single" ? "es-btn--wide" : ""}`} onClick={onAddOne}>
                <Text className="es-btn-cost">消耗 {vm.singleCost} 点</Text>
                <Text className="es-btn-label">强化</Text>
              </View>
            </View>
          )
        )}
      </View>
    </View>
  );
}
