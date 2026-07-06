/**
 * 存档管理页（首页）
 *
 * 列表展示所有存档，激活后把该存档的 ships 灌入 enhanceStore，再跳 ship-list。
 * 支持：新建 / 重命名 / 删除。
 */
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useLoadoutStore } from "../../state/loadoutStore";
import { useEnhanceState } from "../../state/enhanceStore";
import "./index.css";

/** 格式化时间戳为简短日期 */
function fmtTime(ts: number): string {
  if (!ts) return "—";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function LoadoutsPage() {
  const { loadouts, activeId, createLoadout, switchTo, renameLoadout, deleteLoadout } = useLoadoutStore();
  const enhanceState = useEnhanceState();

  // 激活并存档：灌入工作态 → 跳 ship-list
  const onActivate = (id: string) => {
    const lo = switchTo(id);
    if (lo) {
      enhanceState.hydrateFromShips(lo.ships);
      Taro.navigateTo({ url: "/pages/ship-list/index" });
    }
  };

  // 新建存档：命名 → 创建 → 激活 → 跳 ship-list
  // ★editable 是 weapp 扩展字段，Taro 类型定义滞后，用 as any 绕过；H5 降级为默认名
  const onCreate = () => {
    Taro.showModal({
      title: "新建存档",
      content: "使用默认名称？",
      editable: true,
      placeholderText: "输入存档名称",
      success: (res: any) => {
        if (!res.confirm) return;
        const lo = createLoadout(res.content || undefined);
        enhanceState.hydrateFromShips(lo.ships);
        Taro.navigateTo({ url: "/pages/ship-list/index" });
      },
    } as any);
  };

  const onRename = (id: string, oldName: string) => {
    Taro.showModal({
      title: "重命名存档",
      content: `当前：${oldName}`,
      editable: true,
      placeholderText: oldName,
      success: (res: any) => {
        if (!res.confirm) return;
        const name = (res.content || "").trim();
        if (name) renameLoadout(id, name);
      },
    } as any);
  };

  const onDelete = (id: string, name: string) => {
    Taro.showModal({
      title: "删除确认",
      content: `确定删除存档「${name}」？该存档所有船配置将丢失。`,
      confirmColor: "#ff7a7a",
      success: (res) => {
        if (res.confirm) deleteLoadout(id);
      },
    });
  };

  // 长按弹出操作菜单（重命名/删除）
  const onLongPress = (id: string, name: string) => {
    Taro.showActionSheet({
      itemList: ["重命名", "删除"],
      success: (res) => {
        if (res.tapIndex === 0) onRename(id, name);
        else if (res.tapIndex === 1) onDelete(id, name);
      },
    });
  };

  return (
    <View className="lo">
      {/* 顶栏 */}
      <View className="lo-topbar">
        <Text className="lo-topbar__title">我的存档</Text>
        <View className="lo-topbar__new" onClick={onCreate}>
          <Text className="lo-topbar__new-label">+ 新建</Text>
        </View>
      </View>

      {/* 存档列表 */}
      <View className="lo-list">
        {loadouts.map((lo) => {
          const isActive = lo.id === activeId;
          const shipCount = Object.keys(lo.ships).length;
          return (
            <View
              key={lo.id}
              className={`lo-card ${isActive ? "lo-card--active" : ""}`}
              onClick={() => onActivate(lo.id)}
              onLongPress={() => onLongPress(lo.id, lo.name)}
            >
              <View className="lo-card__main">
                <View className="lo-card__head">
                  <Text className="lo-card__name">{lo.name}</Text>
                  {isActive && <Text className="lo-card__badge">当前</Text>}
                </View>
                <View className="lo-card__meta">
                  <Text className="lo-card__count">{shipCount} 艘船</Text>
                  <Text className="lo-card__time">{fmtTime(lo.updatedAt)}</Text>
                </View>
              </View>
              <Text className="lo-card__arrow">›</Text>
            </View>
          );
        })}
        {loadouts.length === 0 && (
          <View className="lo-empty">
            <Text className="lo-empty__text">还没有存档</Text>
          </View>
        )}
      </View>

      <View className="lo-hint">
        <Text className="lo-hint__text">点击进入 · 长按重命名/删除</Text>
      </View>
    </View>
  );
}
