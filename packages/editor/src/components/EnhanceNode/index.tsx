import { Component } from "react";
import { View, Text, Image } from "@tarojs/components";
import { enhanceIcon } from "../../data/iconResolver";
import "./index.css";

interface EnhanceNodeProps {
  enhanceId: string;      // 9位 enhance_id
  name: string;           // cfg_system_effect.NAME
  level: number;          // 当前等级 0-5
  maxLevel: number;       // 最大等级
  cost: number[];         // ENHANCE_COST 每级消耗
  currentCost: number;    // 当前已消耗
  onLevelChange: (newLevel: number) => void;
}

/**
 * 强化树节点
 * 图标 + 名称 + 等级指示器(1-5圆点) + 技能点消耗
 */
export default class EnhanceNode extends Component<EnhanceNodeProps> {
  render() {
    const { enhanceId, name, level, maxLevel, currentCost, onLevelChange } = this.props;
    const icon = enhanceIcon(enhanceId);

    return (
      <View className="enhance-node">
        <View className="enhance-node__main">
          {icon ? (
            <Image className="enhance-node__icon" src={icon} mode="aspectFit" />
          ) : (
            <View className="enhance-node__icon enhance-node__icon--placeholder">
              {name.slice(0, 1)}
            </View>
          )}
          <View className="enhance-node__info">
            <Text className="enhance-node__name">{name}</Text>
            {currentCost > 0 && (
              <Text className="enhance-node__cost text-gold">已用 {currentCost} 点</Text>
            )}
          </View>
        </View>

        {/* 等级控制 */}
        <View className="enhance-node__level">
          <View
            className="enhance-node__btn enhance-node__btn--minus"
            onClick={() => onLevelChange(Math.max(0, level - 1))}
          >
            <Text>−</Text>
          </View>
          <View className="enhance-node__dots">
            {Array.from({ length: maxLevel }, (_, i) => (
              <View
                key={i}
                className={`enhance-node__dot ${i < level ? "enhance-node__dot--active" : ""}`}
              />
            ))}
          </View>
          <View
            className="enhance-node__btn enhance-node__btn--plus"
            onClick={() => onLevelChange(Math.min(maxLevel, level + 1))}
          >
            <Text>+</Text>
          </View>
          <Text className="enhance-node__level-text">{level}/{maxLevel}</Text>
        </View>
      </View>
    );
  }
}
