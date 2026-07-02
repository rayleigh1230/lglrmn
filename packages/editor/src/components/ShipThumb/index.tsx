import { Component } from "react";
import { Image, View, Text } from "@tarojs/components";
import { shipThumbnailIcon } from "../../data/iconResolver";
import "./index.css";

interface ShipThumbProps {
  shipTypeTier: number;  // cfg_ship_blueprint[6]
  shipType?: number;     // cfg_ship[3]
  size?: "small" | "medium" | "large";
  fallbackText?: string; // 名称首字
}

/**
 * 舰船缩略图
 * 游戏没有静态舰船PNG (3D渲染), 用舰种通用图标 + 名称首字回退
 */
export default class ShipThumb extends Component<ShipThumbProps> {
  render() {
    const { shipTypeTier, shipType, size = "medium", fallbackText } = this.props;
    const icon = shipThumbnailIcon(String(shipType ?? shipTypeTier));

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
