import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { loadExtensionGlobals } from "./loadGlobals";
import "./tailwind.css";
import "./styles-import";

void (async () => {
  await loadExtensionGlobals();
  const rootEl = document.getElementById("root");
  if (!rootEl) {
    throw new Error("Missing #root");
  }
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
})();
