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
          // ★调校型(有关联强化项)显示 icon_link 标记
          const showLink = s.type === "tune" && !!s.targetEnhanceId;
          return (
            <View
              key={s.enhanceId}
              className={`tr-hex tr-hex--${s.state}`}
              onClick={() => !isLocked && onClick(s)}
            >
              {/* 六角形底图 */}
              <Image
                className="tr-hex-bg"
                src={iconUrl("peak/bg_hexagon_can_adjust.png")}
                mode="aspectFit"
              />
              {/* 效果图标（统一显示，未解锁/未加点都灰化，active 才高亮） */}
              {s.icon ? (
                <Image className="tr-hex-icon" src={s.icon} mode="aspectFit" />
              ) : null}
              {/* ★关联标记（icon_link）：调校型右上角 */}
              {showLink && (
                <Image
                  className={`tr-link ${isActive ? "tr-link--on" : "tr-link--locked"}`}
                  src={iconUrl("peak/icon_link.png")}
                  mode="aspectFit"
                />
              )}
              {/* 等级/状态标记（仅 active 显示） */}
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
