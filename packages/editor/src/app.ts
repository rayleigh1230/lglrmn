import { createElement, PropsWithChildren } from "react";
import { EnhanceStateProvider } from "./state/enhanceStore";
import "./app.css";

function App({ children }: PropsWithChildren) {
  return createElement(EnhanceStateProvider, null, children);
}

export default App;
