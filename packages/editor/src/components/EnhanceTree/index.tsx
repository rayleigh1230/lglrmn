import { View, Text, Image } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useRef, useEffect, useLayoutEffect, useState, useCallback, useMemo } from "react";
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

/** ★cell 尺寸（设计稿 px）。行高=列宽=节点高 140，cell 紧贴节点，
 *   横向/纵向间距完全由 grid gap(30) 决定 → 上下左右严格一致。
 *   用 Taro.pxTransform 转 rem，保证窄屏等比缩放。 */
const CELL = 140;       // grid 单元尺寸（=节点尺寸）

/** 一条连线（真实像素坐标，相对于 grid 容器左上角） */
interface Edge { x1: number; y1: number; x2: number; y2: number; lit: boolean; key: string; }

export default function EnhanceTree({ columns, choiceGroups, linkedEnhanceIds, onSelectNode, onOpenChoice }: Props) {
  const colKeys = Object.keys(columns).map(Number).sort((a, b) => a - b);
  // 收集所有节点 + 算网格列/行数（决定 grid-template 的 repeat 数）
  // ★用 useMemo 稳定引用：measure/effect 依赖它，避免每次渲染都产生新数组触发循环
  const allNodes = useMemo<EnhanceNodeVM[]>(() => {
    const arr: EnhanceNodeVM[] = [];
    for (const col of colKeys) arr.push(...columns[col]);
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns]);
  const maxCol = Math.max(...allNodes.map((n) => n.gridCol), 0);
  const maxRow = Math.max(...allNodes.map((n) => n.gridRow), 0);

  // 鼠标拖曳滚动（H5 桌面端）：mousedown 记录起点，mousemove 用增量 scrollBy，mouseup/leave 结束
  const scrollRef = useRef<HTMLElement>(null);
  const drag = useRef<{ x: number; dragging: boolean; moved: boolean }>({ x: 0, dragging: false, moved: false });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag.current.dragging || !scrollRef.current) return;
      const dx = e.clientX - drag.current.x;
      if (Math.abs(dx) > 3) drag.current.moved = true;
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
    if (drag.current.moved) return;
    fn();
  };

  // ★节点 DOM 引用表：enhanceId → HTMLElement（用于测量真实中心坐标画连线）
  const nodeEls = useRef<Map<string, HTMLElement>>(new Map());
  const gridRef = useRef<HTMLElement>(null);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });

  // ★渲染后测量真实 DOM 位置，计算连线坐标。这样无论 rem/rpx 怎么缩放，连线都精准对齐节点中心。
  //   H5 端可靠；小程序端拿不到 DOM（SVG 方案本身也不支持小程序，此组件当前仅 H5 使用）。
  const measure = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) { return; }
    const gridRect = grid.getBoundingClientRect();
    setSvgSize({ w: gridRect.width, h: gridRect.height });

    // 构建 enhanceId → 节点中心(相对 grid 左上角) 的映射
    const centerOf = (el: HTMLElement | undefined) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2 - gridRect.left, y: r.top + r.height / 2 - gridRect.top };
    };

    // 节点查找表
    const nodeByEnhanceId = new Map<string, EnhanceNodeVM>();
    for (const n of allNodes) nodeByEnhanceId.set(n.slot.enhanceId, n);

    const result: Edge[] = [];
    const seen = new Set<string>();
    for (const n of allNodes) {
      for (const parentId of n.slot.prerequisites) {
        const parent = nodeByEnhanceId.get(parentId);
        if (!parent) continue; // 父节点可能被二选一 hiddenByChoice 隐藏，跳过
        const key = `${parentId}->${n.slot.enhanceId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const a = centerOf(nodeEls.current.get(parentId));
        const b = centerOf(nodeEls.current.get(n.slot.enhanceId));
        if (!a || !b) continue;
        result.push({
          x1: a.x, y1: a.y, x2: b.x, y2: b.y,
          lit: parent.currentLevel > 0 && n.currentLevel > 0,
          key,
        });
      }
    }
    setEdges(result);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allNodes]);

  // ★用 ResizeObserver 监听 grid 容器：窗口缩放、图片加载、1fr 重排 任何尺寸变化都重测。
  //   这能覆盖 useLayoutEffect 单次测量漏掉的场景（异步图片加载改变节点位置）。
  useLayoutEffect(() => {
    measure();
    const grid = gridRef.current;
    if (!grid || typeof ResizeObserver === "undefined") return;
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure); // 节流：一帧内只测一次
    });
    ro.observe(grid);
    // 也观察每个节点（图标加载改变节点尺寸时触发）
    nodeEls.current.forEach((el) => ro.observe(el));
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [measure, columns, choiceGroups]);

  return (
    <View
      ref={scrollRef as any}
      className="et-scroll"
      onMouseDown={onMouseDown}
    >
      <View
        ref={gridRef as any}
        className="et-grid"
        style={`grid-template-columns: repeat(${maxCol + 1}, ${Taro.pxTransform(CELL)}); grid-template-rows: repeat(${maxRow + 1}, ${Taro.pxTransform(CELL)});`}
      >
        {/* ★SVG 连线层（绝对定位覆盖在 grid 上，pointer-events:none 不挡点击）
            坐标用渲染后测量的真实节点中心，任何缩放都对齐 */}
        {edges.length > 0 && svgSize.w > 0 && (
          <View className="et-edges">
            <svg width={svgSize.w} height={svgSize.h} className="et-edges__svg" xmlns="http://www.w3.org/2000/svg">
              {edges.map((e) => (
                <line
                  key={e.key}
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
                ref={(el: any) => { registerEl(node.slot.enhanceId, el); }}
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
              ref={(el: any) => { registerEl(node.slot.enhanceId, el); }}
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

  // ★ref 注册函数：null 时删除，避免卸载的节点残留
  function registerEl(id: string, el: HTMLElement | null) {
    if (el) nodeEls.current.set(id, el);
    else nodeEls.current.delete(id);
  }
}
