import { createElement, useEffect, useRef, PropsWithChildren } from "react";
import { EnhanceStateProvider, useEnhanceState } from "./state/enhanceStore";
import { LoadoutProvider, useLoadoutStore } from "./state/loadoutStore";
import "./app.css";

/**
 * 首次启动时用当前激活存档 hydrate enhanceStore（一次性）。
 * 后续切换存档由 loadouts 页 onActivate 主动调 hydrateFromShips。
 * 放在 EnhanceStateProvider 内部才能拿到 useEnhanceState。
 */
function EnhanceHydrator({ children }: PropsWithChildren<{}>) {
  const enhanceState = useEnhanceState();
  const { active } = useLoadoutStore();
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    if (active) {
      enhanceState.hydrateFromShips(active.ships);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return createElement("div", { className: "app-root" }, children);
}

function App({ children }: PropsWithChildren) {
  // 外层 LoadoutProvider，内层 EnhanceStateProvider（enhanceStore 需读 loadoutStore 激活存档）
  return createElement(
    LoadoutProvider,
    null,
    createElement(
      EnhanceStateProvider,
      null,
      createElement(EnhanceHydrator, null, children)
    )
  );
}

export default App;
