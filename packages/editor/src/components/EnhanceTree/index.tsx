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

  return (
    <View className="et-tree">
      {colKeys.map((col, idx) => (
        <View key={col} className="et-col">
          {idx > 0 && <View className="et-link" />}
          <View className="et-col-nodes">
            {columns[col].map((node) => {
              // 二选一未选：合并图标
              if (node.state === "choice" && node.choiceGroupId) {
                const grp = choiceGroups[node.choiceGroupId];
                const placeholderIcon = enhanceIcon(grp.options[0].enhanceId);
                return (
                  <View
                    key={node.slot.enhanceId}
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
                );
              }
              const icon = enhanceIcon(node.slot.enhanceId);
              return (
                <View
                  key={node.slot.enhanceId}
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
                  {node.currentLevel > 0 && (
                    <Text className="et-lv">{node.currentLevel}</Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}
