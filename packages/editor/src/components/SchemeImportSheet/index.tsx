/**
 * 加点方案导入浮窗
 *
 * 流程：剪贴板读取/手动粘贴 → 解析预览 → 确认应用
 * - 解析结果三色显示：成功(绿) / 歧义(黄,已全赋) / 未匹配(红)
 * - 装配不符时提示：方案含未装配的切换组系统，可选"对齐装配"
 *
 * ★剪贴板读取：H5 用 navigator.clipboard.readText()（Taro的getClipboardData在H5只读
 *   localStorage，读不到系统剪贴板里游戏复制的内容）；weapp 用 Taro.getClipboardData。
 */
import { useState } from "react";
import { View, Text, Textarea } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useEditorData } from "../../state/useEditorData";
import { useEnhanceState } from "../../state/enhanceStore";
import { parseMarkdown, resolveScheme, type ResolveResult } from "../../data/schemeMarkdown";
import "./index.css";

/** 应用时传入：levels 必传；enabledSlots 仅在"对齐装配"时传 */
export interface ApplyPayload {
  levels: Record<string, number>;
  /** 若提供，同步切换装配到此清单；否则不动装配 */
  enabledSlots?: string[];
}

interface Props {
  shipId: string;
  onApply: (payload: ApplyPayload) => void;
  onClose: () => void;
}

export default function SchemeImportSheet({ shipId, onApply, onClose }: Props) {
  const { store } = useEditorData();
  const enhanceState = useEnhanceState();
  const [text, setText] = useState("");
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [parsedShipName, setParsedShipName] = useState("");

  // 从剪贴板读取
  // H5: navigator.clipboard.readText()（需用户点击触发，浏览器才允许）
  // weapp: Taro.getClipboardData（小程序端读系统剪贴板）
  const onPaste = async () => {
    // 优先用浏览器原生 Clipboard API（H5）
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.readText) {
      try {
        const data = await navigator.clipboard.readText();
        if (data && data.trim()) {
          setText(data);
          setResult(null);
          return;
        }
        Taro.showToast({ title: "剪贴板为空，请手动粘贴", icon: "none" });
        return;
      } catch (e) {
        // 浏览器拒绝授权或不可用，降级到 Taro API / 手动粘贴
        console.warn("[clipboard] navigator.clipboard.readText 失败，尝试 Taro API", e);
      }
    }
    // 降级：Taro.getClipboardData（weapp 有效；H5 只读 localStorage，大概率读不到）
    Taro.getClipboardData({
      success: (res: any) => {
        if (res.data && res.data.trim()) {
          setText(res.data);
          setResult(null);
        } else {
          Taro.showToast({ title: "无法自动读取，请手动粘贴", icon: "none" });
        }
      },
      fail: () => {
        Taro.showToast({ title: "无法自动读取，请在框内手动粘贴", icon: "none" });
      },
    });
  };

  // 解析
  const onParse = () => {
    if (!store || !shipId) return;
    if (!text.trim()) {
      Taro.showToast({ title: "请先粘贴方案文本", icon: "none" });
      return;
    }
    const parsed = parseMarkdown(text);
    setParsedShipName(parsed.shipName);
    const shipConfig = enhanceState.getShipConfig(shipId);
    const r = resolveScheme(parsed, store, shipId, shipConfig.enabledSlots.length > 0 ? shipConfig.enabledSlots : undefined);
    setResult(r);
    if (r.resolved === 0 && r.ambiguous === 0) {
      Taro.showToast({ title: "未匹配到任何强化项", icon: "none" });
    }
  };

  const hasResult = result && (result.resolved > 0 || result.ambiguous > 0);
  const hasUnloadConflict = result && result.unloadedSystems.length > 0;

  return (
    <View className="si-overlay" onClick={onClose}>
      <View className="si-sheet" onClick={(e) => e.stopPropagation()}>
        {/* 顶部 */}
        <View className="si-head">
          <Text className="si-title">导入加点方案</Text>
          <Text className="si-close" onClick={onClose}>×</Text>
        </View>

        {!result ? (
          // 编辑态：粘贴 + 解析
          <View className="si-edit">
            <View className="si-paste-btn" onClick={onPaste}>
              <Text className="si-paste-label">从剪贴板读取</Text>
            </View>
            <Text className="si-hint">或手动粘贴游戏复制的方案文本（### 开头）</Text>
            <Textarea
              className="si-textarea"
              style={{ height: "420px" }}
              value={text}
              onInput={(e) => setText(e.detail.value)}
              placeholder="粘贴方案文本..."
              placeholderClass="si-ph"
              maxlength={-1}
            />
            <View className="si-parse-btn" onClick={onParse}>
              <Text className="si-parse-label">解析</Text>
            </View>
          </View>
        ) : (
          // 预览态：结果 + 确认
          <View className="si-preview">
            {parsedShipName && (
              <View className="si-shipcheck">
                <Text className="si-shipcheck-text">方案船名：{parsedShipName}</Text>
              </View>
            )}

            {/* 统计 */}
            <View className="si-stats">
              <View className="si-stat si-stat--ok">
                <Text className="si-stat-num">{result.resolved}</Text>
                <Text className="si-stat-label">匹配</Text>
              </View>
              {result.ambiguous > 0 && (
                <View className="si-stat si-stat--warn">
                  <Text className="si-stat-num">{result.ambiguous}</Text>
                  <Text className="si-stat-label">歧义(已全赋)</Text>
                </View>
              )}
              {result.unmatched.length > 0 && (
                <View className="si-stat si-stat--err">
                  <Text className="si-stat-num">{result.unmatched.length}</Text>
                  <Text className="si-stat-label">未匹配</Text>
                </View>
              )}
            </View>

            {/* 未匹配明细 */}
            {result.unmatched.length > 0 && (
              <View className="si-unmatched">
                <Text className="si-unmatched-title">未匹配项：</Text>
                {result.unmatched.slice(0, 8).map((u, i) => (
                  <Text key={i} className="si-unmatched-item">{u}</Text>
                ))}
                {result.unmatched.length > 8 && (
                  <Text className="si-unmatched-more">等 {result.unmatched.length} 项</Text>
                )}
              </View>
            )}

            {/* ★装配不符提示 */}
            {hasUnloadConflict && (
              <View className="si-conflict">
                <Text className="si-conflict-title">
                  ⚠️ 方案含 {result.unloadedSystems.length} 个未装配的系统：
                </Text>
                {result.unloadedSystems.map((us, i) => (
                  <Text key={i} className="si-conflict-item">
                    {us.systemName}（当前：{us.currentActiveName}）
                  </Text>
                ))}
                <Text className="si-conflict-hint">
                  ·「仅加点」：只写入强化加点，装配不动{'\n'}
                  ·「对齐并应用」：重置系统装配+强化/调校加点到初始状态，再按方案写入（巅峰等级不动）
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ★底部操作区：始终固定在浮窗底部，永不被内容遮挡 */}
        {result && (
          <View className="si-actions">
            <View className="si-btn si-btn--cancel" onClick={() => setResult(null)}>
              <Text className="si-btn-label">重新编辑</Text>
            </View>
            {hasUnloadConflict ? (
              <>
                <View
                  className={`si-btn si-btn--secondary ${!hasResult ? "si-btn--disabled" : ""}`}
                  onClick={() => hasResult && onApply({ levels: result.levels })}
                >
                  <Text className="si-btn-label">仅加点</Text>
                </View>
                <View
                  className={`si-btn si-btn--apply ${!hasResult ? "si-btn--disabled" : ""}`}
                  onClick={() => hasResult && result.alignedEnabledSlots && onApply({ levels: result.levels, enabledSlots: result.alignedEnabledSlots })}
                >
                  <Text className="si-btn-label">对齐并应用</Text>
                </View>
              </>
            ) : (
              <View
                className={`si-btn si-btn--apply ${!hasResult ? "si-btn--disabled" : ""}`}
                onClick={() => hasResult && onApply({ levels: result.levels })}
              >
                <Text className="si-btn-label">应用</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
