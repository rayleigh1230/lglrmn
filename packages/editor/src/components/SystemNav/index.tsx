import { View, Text, Image, ScrollView } from "@tarojs/components";
import type { SystemNavItem } from "../../data/enhanceView";
import "./index.css";

interface Props {
  items: SystemNavItem[];
  onSelect: (slotId: string) => void;
  iconFor: (slotId: string) => string;  // 图标 URL 解析（页面层用 prefixIcon 注入）
}

export default function SystemNav({ items, onSelect, iconFor }: Props) {
  return (
    <ScrollView className="sn-scroll" scrollX>
      {items.map((it) => (
        <View
          key={it.slotId}
          className={`sn-item ${it.isCurrent ? "sn-item--cur" : ""}`}
          onClick={() => onSelect(it.slotId)}
        >
          {(() => {
            const icon = iconFor(it.slotId);
            return icon ? (
              <Image className="sn-icon" src={icon} mode="aspectFit" />
            ) : (
              <View className="sn-icon sn-icon--ph">{it.name.slice(0, 1)}</View>
            );
          })()}
          <Text className="sn-name">{it.name}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
