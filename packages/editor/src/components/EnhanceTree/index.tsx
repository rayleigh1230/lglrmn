import { View, Text, Image } from "@tarojs/components";
import { useRef, useEffect } from "react";
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

  // 鼠标拖曳滚动（H5 桌面端）：mousedown 记录起点，mousemove 用增量 scrollBy，mouseup/leave 结束
  // 不用 Taro ScrollView 的 scrollX（会和原生滚动冲突），改用原生 overflow-x:auto + window 监听
  const scrollRef = useRef<HTMLElement>(null);
  const drag = useRef<{ x: number; dragging: boolean; moved: boolean }>({ x: 0, dragging: false, moved: false });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag.current.dragging || !scrollRef.current) return;
      const dx = e.clientX - drag.current.x;
      if (Math.abs(dx) > 3) drag.current.moved = true; // 标记发生了拖动（区分点击）
      drag.current.x = e.clientX;
      scrollRef.current.scrollLeft -= dx;
    };
    const onUp = () => {
      if (drag.current.dragging && scrollRef.current) {
        scrollRef.current.style.cursor = "grab";
      }
      drag.current.dragging = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const onMouseDown = (e: any) => {
    drag.current = { x: e.clientX, dragging: true, moved: false };
    (e.currentTarget as HTMLElement).style.cursor = "grabbing";
  };

  // 拖动后松开如果是拖动(moved=true)则阻止点击，避免误触节点
  const swallowClickIfDragged = (fn: () => void) => () => {
    if (drag.current.moved) return; // 这次是拖动，不触发点击
    fn();
  };

  return (
    <View
      ref={scrollRef as any}
      className="et-scroll"
      onMouseDown={onMouseDown}
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
              onClick={swallowClickIfDragged(() => onOpenChoice(node.choiceGroupId!))}
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
            onClick={swallowClickIfDragged(() => onSelectNode(node.slot.enhanceId))}
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
    </View>
  );
}
