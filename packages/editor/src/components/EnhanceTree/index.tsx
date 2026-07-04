import { View, Text, Image, ScrollView } from "@tarojs/components";
import { useRef } from "react";
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
  // 收集所有节点 + 算网格尺寸
  const allNodes: EnhanceNodeVM[] = [];
  for (const col of colKeys) allNodes.push(...columns[col]);
  const maxCol = Math.max(...allNodes.map((n) => n.gridCol), 0);
  const maxRow = Math.max(...allNodes.map((n) => n.gridRow), 0);

  // 鼠标拖曳滚动（H5 桌面端）
  const dragRef = useRef<{ x: number; left: number; dragging: boolean }>({ x: 0, left: 0, dragging: false });
  const onPointerDown = (e: any) => {
    const scroller = e.currentTarget as HTMLElement;
    dragRef.current = { x: e.clientX, left: scroller.scrollLeft, dragging: true };
    scroller.style.cursor = "grabbing";
  };
  const onPointerMove = (e: any) => {
    if (!dragRef.current.dragging) return;
    const scroller = e.currentTarget as HTMLElement;
    const dx = e.clientX - dragRef.current.x;
    scroller.scrollLeft = dragRef.current.left - dx;
  };
  const onPointerUp = (e: any) => {
    dragRef.current.dragging = false;
    (e.currentTarget as HTMLElement).style.cursor = "grab";
  };

  return (
    <ScrollView
      className="et-scroll"
      scrollX
      onTouchStart={onPointerDown}
      onTouchMove={onPointerMove}
      onTouchEnd={onPointerUp}
      onMouseDown={onPointerDown}
      onMouseMove={onPointerMove}
      onMouseUp={onPointerUp}
      onMouseLeave={onPointerUp}
    >
      <View
        className="et-grid"
        style={`grid-template-columns: repeat(${maxCol + 1}, 76px); grid-template-rows: repeat(${maxRow + 1}, auto);`}
      >
      {allNodes.map((node) => {
        // 二选一未选：合并图标
        if (node.state === "choice" && node.choiceGroupId) {
          const grp = choiceGroups[node.choiceGroupId];
          const placeholderIcon = enhanceIcon(grp.options[0].enhanceId);
          return (
            <View
              key={node.slot.enhanceId}
              className="et-node et-node--choice"
              style={`grid-column: ${node.gridCol + 1}; grid-row: ${node.gridRow + 1};`}
              onClick={() => onOpenChoice(node.choiceGroupId!)}
            >
              {placeholderIcon ? (
                <Image className="et-icon" src={placeholderIcon} mode="aspectFit" />
              ) : (
                <View className="et-icon et-icon--ph">?</View>
              )}
              {node.slot.effect?.label && (
                <Text className="et-label">{node.slot.effect.label}</Text>
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
            style={`grid-column: ${node.gridCol + 1}; grid-row: ${node.gridRow + 1};`}
            onClick={() => onSelectNode(node.slot.enhanceId)}
          >
            {icon ? (
              <Image className="et-icon" src={icon} mode="aspectFit" />
            ) : (
              <View className="et-icon et-icon--ph">
                {node.slot.effect?.name?.slice(0, 1) || "?"}
              </View>
            )}
            {node.slot.effect?.label && (
              <Text className="et-label">{node.slot.effect.label}</Text>
            )}
            {node.currentLevel > 0 && (
              <Text className="et-lv">{node.currentLevel}</Text>
            )}
          </View>
        );
      })}
      </View>
    </ScrollView>
  );
}
