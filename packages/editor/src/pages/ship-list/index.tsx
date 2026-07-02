import { useState, useMemo, useEffect } from "react";
import { View, Text, Input, ScrollView } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useEditorData } from "../../state/useEditorData";
import {
  listBlueprints,
  filterBlueprints,
  shipTypeTierName,
  type ShipListItem,
} from "../../data/blueprintSelector";
import ShipThumb from "../../components/ShipThumb";
import "./index.css";

// 舰种筛选 chips
const TIER_FILTERS: { value: number | null; label: string }[] = [
  { value: null, label: "全部" },
  { value: 3, label: "主力舰" },
  { value: 1, label: "战机/护航艇" },
  { value: 2, label: "轰炸机" },
];

export default function ShipList() {
  const { store, loading, error } = useEditorData();
  const [keyword, setKeyword] = useState("");
  const [tierFilter, setTierFilter] = useState<number | null>(null);

  const allShips = useMemo<ShipListItem[]>(() => {
    if (!store) return [];
    return listBlueprints(store);
  }, [store]);

  const filtered = useMemo(() => {
    return filterBlueprints(allShips, { keyword, shipTypeTier: tierFilter });
  }, [allShips, keyword, tierFilter]);

  const onShipClick = (ship: ShipListItem) => {
    Taro.navigateTo({
      url: `/pages/blueprint-design/index?bpId=${ship.bpId}&shipId=${ship.shipId}`,
    });
  };

  // 设置导航栏标题
  useEffect(() => {
    Taro.setNavigationBarTitle({ title: `舰船列表 (${filtered.length})` });
  }, [filtered.length]);

  if (loading) {
    return (
      <View className="ship-list-loading">
        <Text>加载配置数据中...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="ship-list-error">
        <Text className="text-danger">加载失败</Text>
        <Text className="text-muted">{error}</Text>
      </View>
    );
  }

  return (
    <View className="ship-list">
      {/* 搜索栏 */}
      <View className="ship-list__search">
        <Input
          className="ship-list__search-input"
          type="text"
          placeholder="搜索舰船名称/ID"
          placeholderClass="ship-list__search-placeholder"
          value={keyword}
          onInput={(e) => setKeyword(e.detail.value)}
        />
      </View>

      {/* 舰种筛选 chips */}
      <ScrollView className="ship-list__filters" scrollX>
        {TIER_FILTERS.map((f) => (
          <View
            key={String(f.value)}
            className={`ship-list__chip ${tierFilter === f.value ? "ship-list__chip--active" : ""}`}
            onClick={() => setTierFilter(f.value)}
          >
            <Text>{f.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* 统计 */}
      <View className="ship-list__stats">
        <Text className="text-muted">
          显示 {filtered.length} / {allShips.length} 艘
        </Text>
      </View>

      {/* 舰船网格 */}
      <ScrollView className="ship-list__grid-scroll" scrollY>
        <View className="ship-list__grid">
          {filtered.map((ship) => (
            <View
              key={ship.bpId}
              className="ship-card"
              onClick={() => onShipClick(ship)}
            >
              <ShipThumb
                shipTypeTier={ship.shipTypeTier}
                size="medium"
                fallbackText={ship.name.slice(0, 2)}
              />
              <View className="ship-card__info">
                <Text className="ship-card__name">{ship.name}</Text>
                <View className="ship-card__meta">
                  <Text className="ship-card__tier">{shipTypeTierName(ship.shipTypeTier)}</Text>
                </View>
                <Text className="ship-card__cost">建造 {ship.cost.toLocaleString()}</Text>
              </View>
            </View>
          ))}
        </View>
        {filtered.length === 0 && (
          <View className="ship-list__empty">
            <Text className="text-muted">无匹配舰船</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
