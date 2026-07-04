import { View, Text, Image } from "@tarojs/components";
import type { TuneSlot } from "@lagrange/engine";
import { iconUrl } from "../../data/iconResolver";
import "./index.css";

interface Props {
  tuneSlots: TuneSlot[];
  acquired: Set<string>;  // 已调校的 enhanceId（targetEnhanceId）
  onClick: (tune: TuneSlot) => void;
}

export default function TuneRow({ tuneSlots, acquired, onClick }: Props) {
  if (tuneSlots.length === 0) return null;
  return (
    <View className="tr-row">
      <Text className="tr-title">调校系统</Text>
      <View className="tr-items">
        {tuneSlots.map((t) => {
          const isAcquired = acquired.has(t.targetEnhanceId);
          return (
            <View
              key={t.enhanceId}
              className={`tr-hex ${isAcquired ? "tr-hex--on" : ""}`}
              onClick={() => onClick(t)}
            >
              <Image
                className="tr-hex-icon"
                src={iconUrl("peak/bg_hexagon_can_adjust.png")}
                mode="aspectFit"
              />
              <Text className="tr-hex-lv">{isAcquired ? "✓" : ""}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
