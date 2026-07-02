import { Component } from "react";
import { View, Text } from "@tarojs/components";
import "./index.css";

interface StatBarProps {
  label: string;
  value: number | string;
  base?: number | string;      // 基础值 (显示增量)
  suffix?: string;             // 单位 (% / 点)
  percent?: boolean;           // 是否百分比 (万分数→%)
  permille?: boolean;          // 万分数
  highlight?: boolean;
}

/**
 * 属性条: 标签 + 数值 (+增量)
 */
export default class StatBar extends Component<StatBarProps> {
  render() {
    const { label, value, base, suffix = "", percent = false, permille = false, highlight = false } = this.props;

    let displayValue = value;
    let delta: number | null = null;

    if (permille && typeof value === "number") {
      displayValue = (value / 100).toFixed(2) + "%";
      if (typeof base === "number" && base !== value) {
        delta = (value - base) / 100;
      }
    } else if (percent && typeof value === "number") {
      displayValue = value.toFixed(2) + "%";
    } else if (typeof base === "number" && typeof value === "number" && base !== value) {
      delta = value - base;
    }

    const deltaStr = delta !== null && delta !== 0
      ? (delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2))
      : null;

    return (
      <View className={`stat-bar ${highlight ? "stat-bar--highlight" : ""}`}>
        <Text className="stat-bar__label">{label}</Text>
        <View className="stat-bar__value-wrap">
          <Text className="stat-bar__value">{displayValue}{suffix}</Text>
          {deltaStr && (
            <Text className={`stat-bar__delta ${delta && delta > 0 ? "text-success" : "text-danger"}`}>
              {deltaStr}
            </Text>
          )}
        </View>
      </View>
    );
  }
}
