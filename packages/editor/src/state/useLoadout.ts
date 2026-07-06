/**
 * useLoadout —— 当前激活存档的快捷 hook
 *
 * 场景：页面只需读当前激活存档时使用；
 * 需要增删切换操作请用 useLoadoutStore()。
 */
import { useLoadoutStore } from "./loadoutStore";

export function useLoadout() {
  const { active, activeId } = useLoadoutStore();
  return { active, activeId };
}
