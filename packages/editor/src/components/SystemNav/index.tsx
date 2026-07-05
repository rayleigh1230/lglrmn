import { View, Text, Image, ScrollView } from "@tarojs/components";
import { prefixIcon } from "../../data/iconResolver";
import type { SystemNavItem, SlotState } from "../../data/enhanceView";
import "./index.css";

interface Props {
  items: SystemNavItem[];
  onSelect: (slotId: string) => void;
}

export default function SystemNav({ items, onSelect }: Props) {
  return (
    <ScrollView className="sn-scroll" scrollX>
      {items.map((it) => {
        const icon = it.prefix ? prefixIcon(it.prefix) : "";
        return (
          <View
            key={it.slotId}
            className={`sn-item ${it.isCurrent ? "sn-item--cur" : ""}`}
            onClick={() => onSelect(it.slotId)}
          >
            {icon ? (
              <Image className="sn-icon" src={icon} mode="aspectFit" />
            ) : (
              <View className="sn-icon sn-icon--ph">{it.name.slice(0, 1)}</View>
            )}
            <Text className="sn-name">{it.name}</Text>
            {/* ★孔位状态：满级白点 / 已投入未满灰点 / 未强化空圈 */}
            {it.slots.length > 0 && (
              <View className="sn-slots">
                {it.slots.map((st, i) => (
                  <View key={i} className={`sn-slot sn-slot--${st}`} />
                ))}
              </View>
            )}
            {it.slots.length === 0 && <Text className="sn-noslots">—</Text>}
          </View>
        );
      })}
    </ScrollView>
  );
}
