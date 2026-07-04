import { useState, useMemo, useEffect } from "react";
import { View, Text, Input, Image } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useEditorData } from "../../state/useEditorData";
import {
  listBlueprints,
  filterByCategory,
  searchShips,
  SHIP_CATEGORIES,
  CATEGORY_COLOR,
  setWhitelist,
  type ShipListItem,
} from "../../data/blueprintSelector";
import { iconUrl, shipThumbnailIcon, shipWikiIcon } from "../../data/iconResolver";
import "./index.css";

export default function ShipList() {
  const { store, loading, error } = useEditorData();
  const [keyword, setKeyword] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("护卫舰");

  // 注入白名单
  useEffect(() => {
    if (store?.shipWhitelist) {
      setWhitelist(store.shipWhitelist as any);
    }
  }, [store]);

  const allShips = useMemo<ShipListItem[]>(() => {
    if (!store) return [];
    return listBlueprints(store);
  }, [store]);

  // 各舰型数量(只显示有船的)
  const dockItems = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of allShips) m.set(s.category, (m.get(s.category) || 0) + 1);
    return SHIP_CATEGORIES
      .filter((c) => m.has(c.key))
      .map((c) => ({ ...c, count: m.get(c.key) || 0 }));
  }, [allShips]);

  const filtered = useMemo(() => {
    let r = filterByCategory(allShips, activeCategory);
    r = searchShips(r, keyword);
    return r;
  }, [allShips, activeCategory, keyword]);

  const onShipClick = (ship: ShipListItem) => {
    Taro.navigateTo({
      url: `/pages/blueprint-design/index?bpId=${ship.bpId}&shipId=${ship.shipId}`,
    });
  };

  if (loading) {
    return <View className="sl-loading"><Text>加载中...</Text></View>;
  }
  if (error) {
    return <View className="sl-error"><Text className="text-danger">{error}</Text></View>;
  }

  return (
    <View className="sl">
      {/* 搜索栏 */}
      <View className="sl-search">
        <Input
          className="sl-search__input"
          type="text"
          placeholder="搜索舰船名称 / ID"
          placeholderClass="sl-search__ph"
          value={keyword}
          onInput={(e) => setKeyword(e.detail.value)}
        />
      </View>

      {/* 标题条 */}
      <View className="sl-titlebar">
        <Text className="sl-titlebar__name">{activeCategory}</Text>
        <Text className="sl-titlebar__count">{filtered.length} 艘</Text>
      </View>

      {/* 舰船列表 */}
      <View className="sl-list">
        {filtered.map((ship) => (
          <View key={ship.bpId} className="sl-card" onClick={() => onShipClick(ship)}>
            <View
              className="sl-card__bar"
              style={{ background: CATEGORY_COLOR[ship.category] || "#4fc3f7" }}
            />
            <View className="sl-card__thumb">
              <Image
                className="sl-card__thumb-img"
                src={shipWikiIcon(ship.shipId)}
                mode="aspectFit"
                onError={(e) => {
                  // wiki图加载失败 → 回退到侧视缩略图 → 再回退舰种图标
                  const img = e.currentTarget as any;
                  const fallback = shipThumbnailIcon(ship.shipId) || iconUrl(SHIP_CATEGORIES.find((c) => c.key === ship.category)?.icon);
                  if (img && img.src !== fallback) img.src = fallback;
                }}
              />
            </View>
              <View className="sl-card__body">
                <Text className="sl-card__name">{ship.name}</Text>
                <Text className={`sl-card__tag sl-card__tag--row sl-card__tag--row-${ship.rowLabel}`}>
                  {ship.rowLabel}
                </Text>
              </View>
            <Text className="sl-card__arrow">›</Text>
          </View>
        ))}
        {filtered.length === 0 && (
          <View className="sl-empty"><Text className="text-muted">无匹配舰船</Text></View>
        )}
      </View>

      {/* 底部舰种图标栏 */}
      <View className="sl-dock">
        {dockItems.map((cat) => (
          <View
            key={cat.key}
            className={`sl-dock__item ${activeCategory === cat.key ? "sl-dock__item--active" : ""}`}
            onClick={() => setActiveCategory(cat.key)}
          >
            <Image className="sl-dock__icon" src={iconUrl(cat.icon)} mode="aspectFit" />
            <Text className="sl-dock__label">{cat.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
