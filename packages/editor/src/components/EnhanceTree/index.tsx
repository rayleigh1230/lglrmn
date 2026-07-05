import { View, Text, Image } from "@tarojs/components";
import { useRef, useEffect } from "react";
import type { EnhanceNodeVM, ChoiceGroup } from "../../data/enhanceView";
import { enhanceIcon, iconUrl } from "../../data/iconResolver";
import "./index.css";

interface Props {
  columns: Record<number, EnhanceNodeVM[]>;
  choiceGroups: Record<string, ChoiceGroup>;
  /** ★被调校项关联的强化项 ID 集合（改进4：节点显示 icon_link 标记） */
  linkedEnhanceIds?: Set<string>;
  onSelectNode: (enhanceId: string) => void;
  onOpenChoice: (choiceKey: string) => void;
}

/** ★网格几何参数（必须与 index.css 的 grid-template / gap / padding 严格对应，否则连线错位）
 *   CSS grid 布局：cell 宽 COL_W、行高 ROW_H，cell 间有 gap，节点在 cell 内居中。
 *   节点中心坐标 = col*(COL_W+COL_GAP) + COL_W/2 + PAD_X（Y 同理）
 *   ★纵向收紧（截图实证：纵向一般 3 节点，行高/行距适中，不拉远） */
const COL_W = 130;      // grid-template-columns 单元宽（px）
const ROW_H = 108;      // grid-template-rows 单元高（节点100在cell内，留8余量）
const COL_GAP = 8;      // grid gap 列间距（= gap 的第二个值）
const ROW_GAP = 14;     // grid gap 行间距（= gap 的第一个值，收紧）
const NODE_W = 100;     // 节点宽（cell 内居中）
const NODE_H = 100;     // 节点高（cell 内居中）
const PAD_X = 12;       // grid padding 左右
const PAD_TOP = 36;     // grid padding 上
const PAD_BOTTOM = 20;  // grid padding 下

export default function EnhanceTree({ columns, choiceGroups, linkedEnhanceIds, onSelectNode, onOpenChoice }: Props) {
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

  // ★计算节点中心像素坐标（用于画连线），必须与 CSS grid 几何严格对应
  //   节点在 cell 内居中（justify-items/align-items: center）
  //   X = 第col列cell左边缘 + cell宽/2 + padding左
  //       第col列cell左边缘(内容区内) = col * (COL_W + COL_GAP)
  //   Y 同理用 ROW_H + ROW_GAP
  const centerX = (col: number) => col * (COL_W + COL_GAP) + COL_W / 2 + PAD_X;
  const centerY = (row: number) => row * (ROW_H + ROW_GAP) + ROW_H / 2 + PAD_TOP;

  // ★构建节点查找表（enhanceId → VM）+ 边列表
  const nodeByEnhanceId = new Map<string, EnhanceNodeVM>();
  for (const n of allNodes) nodeByEnhanceId.set(n.slot.enhanceId, n);

  // 边：遍历每个可见节点的 prerequisites，每条构成「父→子」边
  //   lit = 父节点 acquired 且 子节点 acquired（已点亮路径）
  interface Edge { x1: number; y1: number; x2: number; y2: number; lit: boolean; }
  const edges: Edge[] = [];
  const seenEdge = new Set<string>();
  for (const n of allNodes) {
    for (const parentId of n.slot.prerequisites) {
      const parent = nodeByEnhanceId.get(parentId);
      if (!parent) continue; // 父节点可能被二选一 hiddenByChoice 隐藏，跳过
      const key = `${parentId}->${n.slot.enhanceId}`;
      if (seenEdge.has(key)) continue;
      seenEdge.add(key);
      edges.push({
        x1: centerX(parent.gridCol),
        y1: centerY(parent.gridRow),
        x2: centerX(n.gridCol),
        y2: centerY(n.gridRow),
        lit: parent.currentLevel > 0 && n.currentLevel > 0,
      });
    }
  }

  // SVG 画布尺寸（与 grid 实际占据尺寸一致：N 个 cell + (N-1) 个 gap + padding）
  const svgW = (maxCol + 1) * COL_W + maxCol * COL_GAP + PAD_X * 2;
  const svgH = (maxRow + 1) * ROW_H + maxRow * ROW_GAP + PAD_TOP + PAD_BOTTOM;

  return (
    <View
      ref={scrollRef as any}
      className="et-scroll"
      onMouseDown={onMouseDown}
    >
      <View
        className="et-grid"
        style={`grid-template-columns: repeat(${maxCol + 1}, ${COL_W}px); grid-template-rows: repeat(${maxRow + 1}, ${ROW_H}px);`}
      >
        {/* ★SVG 连线层（绝对定位覆盖在 grid 上，pointer-events:none 不挡点击） */}
        {edges.length > 0 && (
          <View className="et-edges">
            <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} xmlns="http://www.w3.org/2000/svg">
              {edges.map((e, i) => (
                <line
                  key={i}
                  x1={e.x1}
                  y1={e.y1}
                  x2={e.x2}
                  y2={e.y2}
                  className={`et-edge ${e.lit ? "et-edge--lit" : ""}`}
                />
              ))}
            </svg>
          </View>
        )}

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
          // ★等级显示：当前等级/最大等级（含巅峰扩展），未投入点数不显示
          const totalMax = node.slot.maxLevel + node.extraMaxLevel;
          const showLevel = node.currentLevel > 0;
          // ★关联标记：被调校项关联的强化项显示 icon_link（改进4）
          const isLinked = linkedEnhanceIds?.has(node.slot.enhanceId) ?? false;
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
              {node.hasPeakExtra && (
                <Image className="et-adv" src={iconUrl("peak/icon_adv_prop_l.png")} mode="aspectFit" />
              )}
              {/* ★关联标记（icon_link，左下角），锁定态灰、已点亮高亮 */}
              {isLinked && (
                <Image
                  className={`et-link ${node.state === "locked" ? "et-link--locked" : "et-link--on"}`}
                  src={iconUrl("peak/icon_link.png")}
                  mode="aspectFit"
                />
              )}
              {showLevel && (
                <Text className="et-lv">{node.currentLevel}/{totalMax}</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
