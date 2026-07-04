import { View, Text, Image } from "@tarojs/components";
import type { EnhanceNodeVM, ChoiceGroup } from "../../data/enhanceView";
import { enhanceIcon } from "../../data/iconResolver";
import "./index.css";

interface Props {
  columns: Record<number, EnhanceNodeVM[]>;
  choiceGroups: Record<string, ChoiceGroup>;
  onSelectNode: (enhanceId: string) => void;
  onOpenChoice: (choiceKey: string) => void;
}

export default function EnhanceTree({ columns, choiceGroups, onSelectNode, onOpenChoice }: Props) {
  const colKeys = Object.keys(columns).map(Number).sort((a, b) => a - b);

  // 算每个节点的前置在同一列/不同列的分布，决定连线样式
  // 收集所有节点便于查前置位置
  const allNodes: EnhanceNodeVM[] = [];
  for (const col of colKeys) allNodes.push(...columns[col]);
  const nodeByEnhanceId = new Map(allNodes.map((n) => [n.slot.enhanceId, n]));
  // 列号 → 节点 enhanceId 集合（判断前置是否在相邻列）
  const colOfEnhance = new Map<string, number>();
  for (const col of colKeys) {
    for (const n of columns[col]) colOfEnhance.set(n.slot.enhanceId, col);
  }

  return (
    <View className="et-tree">
      {colKeys.map((col, idx) => (
        <View key={col} className="et-col">
          <View className="et-col-nodes">
            {columns[col].map((node) => {
              const isRoot = idx === 0; // 第一列=根节点，无连线
              // 多前置(斜线汇聚) vs 单前置(直线)
              const parents = node.slot.prerequisites.filter((p) => nodeByEnhanceId.has(p));
              const isMulti = parents.length >= 2;

              // 二选一未选：合并图标
              if (node.state === "choice" && node.choiceGroupId) {
                const grp = choiceGroups[node.choiceGroupId];
                const placeholderIcon = enhanceIcon(grp.options[0].enhanceId);
                return (
                  <View key={node.slot.enhanceId} className="et-node-row">
                    {!isRoot && (
                      <View className={`et-link ${isMulti ? "et-link--multi" : ""}`} />
                    )}
                    <View
                      className="et-node et-node--choice"
                      onClick={() => onOpenChoice(node.choiceGroupId!)}
                    >
                      {placeholderIcon ? (
                        <Image className="et-icon" src={placeholderIcon} mode="aspectFit" />
                      ) : (
                        <View className="et-icon et-icon--ph">?</View>
                      )}
                      <Text className="et-choice-label">二选一</Text>
                    </View>
                  </View>
                );
              }
              const icon = enhanceIcon(node.slot.enhanceId);
              return (
                <View key={node.slot.enhanceId} className="et-node-row">
                  {!isRoot && (
                    <View className={`et-link ${isMulti ? "et-link--multi" : ""}`}>
                      {isMulti && <Text className="et-link-mark">◢</Text>}
                    </View>
                  )}
                  <View
                    className={`et-node et-node--${node.state}`}
                    onClick={() => onSelectNode(node.slot.enhanceId)}
                  >
                    {icon ? (
                      <Image className="et-icon" src={icon} mode="aspectFit" />
                    ) : (
                      <View className="et-icon et-icon--ph">
                        {node.slot.effect?.name?.slice(0, 1) || "?"}
                      </View>
                    )}
                    {/* 分类标签（预警/伤害/频率/命中 等，直接显示在图标上方） */}
                    {node.slot.effect?.label && (
                      <Text className="et-label">{node.slot.effect.label}</Text>
                    )}
                    {node.currentLevel > 0 && (
                      <Text className="et-lv">{node.currentLevel}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}
