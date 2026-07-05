import { View, Text, Image } from "@tarojs/components";
import { iconUrl } from "../../data/iconResolver";
import type { TuneSlotVM } from "../../data/enhanceView";
import "./index.css";

interface Props {
  slots: TuneSlotVM[];
  onClick: (slot: TuneSlotVM) => void;
}

export default function TuneRow({ slots, onClick }: Props) {
  if (slots.length === 0) return null;
  return (
    <View className="tr-row">
      <Text className="tr-title">调校系统</Text>
      <View className="tr-items">
        {slots.map((s) => {
          const isLocked = s.state === "locked";
          const isActive = s.state === "active";
          return (
            <View
              key={s.enhanceId}
              className={`tr-hex ${isActive ? "tr-hex--on" : ""} ${isLocked ? "tr-hex--locked" : ""}`}
              onClick={() => !isLocked && onClick(s)}
            >
              {/* 六角形底图 */}
              <Image
                className="tr-hex-bg"
                src={iconUrl("peak/bg_hexagon_can_adjust.png")}
                mode="aspectFit"
              />
              {/* 效果图标 */}
              {s.icon && !isLocked ? (
                <Image className="tr-hex-icon" src={s.icon} mode="aspectFit" />
              ) : null}
              {/* 锁定态 */}
              {isLocked ? (
                <Image
                  className="tr-hex-lock"
                  src={iconUrl("peak/icon_adjust_lock.png")}
                  mode="aspectFit"
                />
              ) : null}
              {/* 等级/状态标记 */}
              {s.type === "tune" && isActive ? (
                <Text className="tr-hex-lv">{s.currentLevel}</Text>
              ) : s.type === "unlock" && isActive ? (
                <Text className="tr-hex-lv tr-hex-lv--check">✓</Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
