import { Component } from "react";
import { Image, View, Text } from "@tarojs/components";
import { shipThumbnailIcon } from "../../data/iconResolver";
import "./index.css";

interface ShipThumbProps {
  shipTypeTier: number;  // cfg_ship_blueprint[6] (1战机/2主力舰/3超主力舰)
  shipType?: number;     // cfg_ship[3]
  category?: string;     // 舰型分类 key (frigate/destroyer/cruiser/battlecruiser...)
  size?: "small" | "medium" | "large";
  fallbackText?: string; // 名称首字
}

/**
 * 舰船缩略图
 * 优先用舰型 category 匹配对应的舰种图标（icon_production_shiptype_*），
 * 匹配不到则按 tier 用通用舰种图标，最后用名称首字回退。
 */
export default class ShipThumb extends Component<ShipThumbProps> {
  render() {
    const { shipTypeTier, category, size = "medium", fallbackText } = this.props;
    const icon = shipThumbnailIcon(category || String(shipTypeTier));

    return (
      <View className={`ship-thumb ship-thumb--${size}`}>
        {icon ? (
          <Image className="ship-thumb__img" src={icon} mode="aspectFit" />
        ) : (
          <View className="ship-thumb__placeholder">
            {fallbackText ? fallbackText.slice(0, 2) : "舰"}
          </View>
        )}
      </View>
    );
  }
}
